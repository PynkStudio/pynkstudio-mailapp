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
