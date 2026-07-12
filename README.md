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

### Resend inbound body hydration

Do not persist only the raw `email.received` webhook payload as the source of truth for inbound email content.
Resend received-email webhooks can be lightweight and may not include the full plain-text body, HTML body,
headers or attachment data. If a consumer stores only `payload.data.text` / `payload.data.html`, messages can
appear in the UI as empty even though the original email had content.

The package `@pynkstudio/mailapp/next/routes/inbound-webhook` already handles this for Next.js consumers:

1. read the received email id from `data.email_id`, `data.id` or the unwrapped payload;
2. call Resend's Received Emails API, `GET /emails/receiving/:id`, using `RESEND_API_KEY`;
3. merge the received-email response into the webhook payload before inserting `inbound_emails`;
4. fetch attachment metadata/content from `GET /emails/receiving/:id/attachments` when available.

For custom route handlers that do not use the exported Next.js route (for example Vercel Functions, Express,
Vite server adapters or other non-Next hosts), copy the same pattern before writing to Supabase:

```ts
async function retrieveReceivedEmail(emailId: string) {
  const response = await fetch(
    `https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}?html_format=cid`,
    { headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` } },
  );

  if (!response.ok) return null;
  return response.json() as Promise<{
    from?: string;
    to?: string[];
    subject?: string;
    text?: string | null;
    html?: string | null;
    headers?: unknown;
    attachments?: unknown[];
    message_id?: string | null;
  }>;
}
```

Then prefer the retrieved fields over the webhook fields:

```ts
const receivedEmailId = data.email_id ?? data.id ?? data.email?.id;
const received = receivedEmailId ? await retrieveReceivedEmail(receivedEmailId) : null;

await supabase.from("inbound_emails").insert({
  message_id: received?.message_id ?? data.message_id ?? null,
  from_address: parseEmailAddress(received?.from ?? data.from).address,
  to_addresses: received?.to ?? data.to,
  subject: received?.subject ?? data.subject ?? "(nessun oggetto)",
  text_body: received?.text ?? data.text ?? null,
  html_body: received?.html ?? data.html ?? null,
  headers: normalizeHeaders(received?.headers ?? data.headers),
  attachments: received?.attachments ?? data.attachments ?? [],
});
```

When rendering inbound messages, prefer `text_body` when present if the UI needs to preserve quoted reply levels
(`>`, `>>`, etc.). Use sanitized `html_body` as the fallback for HTML-only messages.

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
