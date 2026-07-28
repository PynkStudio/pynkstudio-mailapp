# PynkStudio Mailapp

Reusable mail application package for PynkStudio/Menuary projects.

This package contains the shared mail UI and runtime logic currently used by Menuary:

- inbox, sent mail, unread/mine/starred/spam/archive filters;
- message detail, thread grouping, attachments and HTML rendering;
- compose drawer with sender selection, signatures and attachments;
- delivery issue detection for delayed, bounced and complained messages;
- tenant device filters and push target resolution;
- Supabase queries/server actions for inbound, sent, tracking, signatures and lead links;
- Next.js route handlers for send, signature and Resend inbound/tracking webhooks;
- Supabase migrations required by the mailapp.

Since `0.4.0` it also contains the framework-agnostic mailbox runtime (`/mailbox`,
`/mailbox/server`, `/node`), extracted from the BITE project:

- quoted-reply collapsing, sender-name inference from the signature and preview text;
- RFC 5322 threading — `Message-ID`/`In-Reply-To`/`References` normalization, thread
  key resolution and a deterministic subject+participants fallback for legacy rows;
- diacritic-insensitive mailbox search across sender, recipients, subject, body,
  status and the *rendered* date formats;
- Svix/Resend webhook signature verification, constant-time and fail-closed;
- Resend I/O — inbound content retrieval, expiring-attachment re-signing, outbound
  send with threading headers;
- inbound routing to a specific admin by mailbox alias, with push notify/revoke;
- listing with view filters, counts, pagination and legacy-body backfill;
- `(req, res)` handlers for hosts that are not Next.js.

The package provides behavior and structure. The host app remains responsible for auth, tenant resolution, Supabase clients, push notification delivery and CSS theme tokens.

## Installation

For public GitHub tarball installs, pin a release tag:

```json
{
  "dependencies": {
    "@pynkstudio/mailapp": "https://github.com/PynkStudio/pynkstudio-mailapp/archive/refs/tags/v0.2.1.tar.gz"
  }
}
```

Do not use the GitHub shorthand in Vercel projects:

```json
"@pynkstudio/mailapp": "github:PynkStudio/pynkstudio-mailapp#v0.2.1"
```

npm may resolve that form as SSH, which fails on Vercel unless deploy keys are configured.

## Host Runtime

Every consumer must configure the runtime before using server actions or route handlers.

Example:

```ts
import { configureMailappRuntime } from "@pynkstudio/mailapp/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sendWebPushToSiteadmin, sendWebPushToSubscriptions } from "@/lib/push/send";
import { findTenantById } from "@/lib/tenant-registry";
import { resolveSessionCookieDomain } from "@/lib/session-cookie-domain";

configureMailappRuntime({
  createSupabaseAdminClient,
  createSupabaseServiceClient,
  createSupabaseServerClient: (cookieDomain) => createSupabaseServerClient(cookieDomain ?? undefined),
  sendWebPushToSiteadmin: async (siteadminId, payload) => {
    await sendWebPushToSiteadmin(siteadminId, payload);
  },
  sendWebPushToSubscriptions: async (subscriptionIds, payload) => {
    await sendWebPushToSubscriptions(subscriptionIds, payload);
  },
  findTenantById: (tenantId) => findTenantById(tenantId) ?? null,
  resolveSessionCookieDomain: (host) => resolveSessionCookieDomain(host ?? undefined) ?? null,
});
```

Then import that runtime file before mailapp server usage:

```ts
import "@/lib/mailapp-runtime";
import { MailApp } from "@pynkstudio/mailapp/react";
import { getInboundEmails } from "@pynkstudio/mailapp/email";
```

## Mailbox Runtime (non-Next hosts)

`/mailbox`, `/mailbox/server` and `/node` are independent of the Next-oriented
runtime above: they take an explicit config and Supabase client instead of the
`configureMailappRuntime()` global, so they work in any Node host (Vercel
functions, Express, Hono).

Split by environment:

| Entrypoint | Safe in the browser | Contents |
| --- | --- | --- |
| `@pynkstudio/mailapp/mailbox` | yes | config, address, display, search, message-id |
| `@pynkstudio/mailapp/mailbox/server` | no | `node:crypto`, Resend, DB orchestration |
| `@pynkstudio/mailapp/node` | no | `(req, res)` handlers + helpers |

Importing `/mailbox/server` from client code pulls in `node:crypto` and will fail
to bundle — use `/mailbox` there.

Declare the mailbox once:

```ts
// src/server/mail-config.ts
import { resolveMailboxConfig } from "@pynkstudio/mailapp/mailbox";

export const mailboxConfig = resolveMailboxConfig({
  ordinaryDomain: "example.it",
  automaticDomain: "mail.example.it",
  ordinaryBrand: "ordinary",
  automaticBrand: "automatic",
  fromOptions: [
    { id: "hello", label: "Hello", from: "Brand <hello@example.it>", brand: "ordinary" },
  ],
  messageUrl: (id) => (id ? `/admin/mail?message=${encodeURIComponent(id)}` : "/admin/mail"),
});
```

Table names, the role-check RPC, the alias-refresh RPC, search locale, page size
and the attachment limit all have defaults and are overridable — see
`MailboxInput` in `src/mailbox/config.ts`.

Then build the context and mount the handlers:

```ts
// src/server/mail-context.ts
import type { MailboxNodeContext } from "@pynkstudio/mailapp/node";
import webpush from "web-push";
import { mailboxConfig } from "./mail-config.js";

export const mailContext: MailboxNodeContext = {
  config: mailboxConfig,
  createServiceClient,           // service-role Supabase client
  getUserFromToken,              // bearer token -> user | null
  resendApiKey: () => process.env.RESEND_API_KEY,
  webhookSecret: () => process.env.RESEND_WEBHOOK_SECRET,
  push: {
    // web-push rejects with `statusCode`, which is what prunes dead endpoints
    send: (target, payload) => webpush.sendNotification(target, payload, { TTL: 300, vapidDetails }),
  },
};
```

```ts
// api/email/inbox.ts
import { createInboxHandler } from "@pynkstudio/mailapp/node";
import { mailContext } from "../../src/server/mail-context.js";

export default createInboxHandler(mailContext);
```

Available factories: `createInboxHandler`, `createSendHandler`,
`createMessageActionHandler`, `createAttachmentHandler`,
`createInboundWebhookHandler`.

The push transport is injected, so the package depends on neither `web-push` nor
`@supabase/supabase-js`. Omit `push` and notifications are skipped entirely.

## Next.js Routes

Consumer route files should stay thin:

```ts
import "@/lib/mailapp-runtime";

export { POST } from "@pynkstudio/mailapp/next/routes/send";
```

Available route exports:

- `@pynkstudio/mailapp/next/routes/send`
- `@pynkstudio/mailapp/next/routes/signature`
- `@pynkstudio/mailapp/next/routes/inbound-webhook`

## Styling

The host app owns the visual theme. The mailapp uses CSS custom properties:

```css
--ma-paper
--ma-surface
--ma-line
--ma-ink
--ma-muted
--ma-accent
--ma-accent-dark
```

Example tenant override:

```css
.gestione-admin[data-gestione-tenant="pynkstudio"] {
  --ma-paper: #1a151b;
  --ma-surface: #211a22;
  --ma-line: rgba(250, 250, 250, 0.1);
  --ma-ink: #fafafa;
  --ma-muted: rgba(250, 250, 250, 0.58);
  --ma-accent: #e94b97;
  --ma-accent-dark: #c22d74;
}
```

## Migrations

Supabase migrations are shipped in `migrations/`. Consumers must apply them explicitly; this package does not run migrations at runtime.

## Release Workflow

1. Make changes in `src/`.
2. Run:
   ```bash
   npm run typecheck
   npm run build
   ```
3. Bump `package.json` version.
4. Commit both source and `dist`.
5. Tag and push:
   ```bash
   git tag v0.2.2
   git push origin main
   git push origin v0.2.2
   ```
6. Update consumer repos to the new tarball URL.

`dist` is intentionally committed because GitHub tarball installs do not run the package build before resolving exported `dist/*` entrypoints.
