# AGENTS.md - PynkStudio Mailapp

This repository contains the reusable mail application package consumed by Menuary and other PynkStudio projects.

Read this file before changing any code.

## Purpose

`@pynkstudio/mailapp` is a shared dependency, not an application. It must stay host-agnostic.

It provides:

- React UI for the mail experience;
- Supabase-backed server actions and query helpers;
- Next.js route handlers for mail send/signature/webhook flows;
- runtime adapter contracts;
- Supabase migrations.

Host applications provide:

- Supabase clients;
- auth/session behavior;
- tenant registry and tenant authorization;
- push notification delivery;
- CSS theme tokens;
- route mounting.

## Dependency Boundary

Do not import from any consumer repo.

Forbidden examples:

```ts
import ... from "@/lib/tenant-registry";
import ... from "@/lib/supabase/admin";
import ... from "@/components/...";
```

Use `src/server/runtime.ts` instead. If a new host-specific capability is needed, extend the runtime adapter in a backward-compatible way.

## Public API Stability

Treat these exports as public API:

- `@pynkstudio/mailapp/react`
- `@pynkstudio/mailapp/email`
- `@pynkstudio/mailapp/server`
- `@pynkstudio/mailapp/next`
- `@pynkstudio/mailapp/next/routes/send`
- `@pynkstudio/mailapp/next/routes/signature`
- `@pynkstudio/mailapp/next/routes/inbound-webhook`
- `@pynkstudio/mailapp/supabase`
- `@pynkstudio/mailapp/mailbox`
- `@pynkstudio/mailapp/mailbox/server`
- `@pynkstudio/mailapp/node`
- `@pynkstudio/mailapp/migrations/*`

Do not remove or rename exports without a major version bump and a consumer migration plan.

Prefer optional additions over breaking changes.

## Two Runtimes

There are two independent wiring styles. Do not mix them.

1. **Next runtime** (`/react`, `/email`, `/server`, `/next`) — Menuary. Depends on
   the `configureMailappRuntime()` global and the multi-tenant schema.
2. **Mailbox runtime** (`/mailbox`, `/mailbox/server`, `/node`) — added in `0.4.0`,
   extracted from the BITE project. No globals: every function takes an explicit
   `MailboxConfig` and a Supabase client. Works in any Node host.

Rules for the mailbox runtime:

- **No project values in code.** Domains, brands, table names, RPC names, locale,
  page size and URL shapes all come from `MailboxConfig`. If something project
  specific is needed, add an optional field with a default — do not inline it.
- **Keep the browser/server split.** `src/mailbox/index.ts` must stay importable
  from client code: no `node:*`, no `fetch` to Resend, no DB access. Anything else
  belongs behind `src/mailbox/server.ts`.
- **Inject transports.** Supabase and `web-push` are typed structurally and passed
  in, so the package needs neither as a dependency. Keep it that way.
- **Use explicit `.js` extensions on relative imports.** `tsc` emits specifiers
  verbatim and this runtime is loaded directly by Node ESM, which does not resolve
  extensionless paths. Older files under `src/email/` and `src/next/` still have
  extensionless imports; they only work because Next bundles them. Do not copy
  that pattern, and prefer fixing those files when you touch them.

## Multi-Tenant And Multi-Vertical Rules

The package must support:

- platform/global inbox use, such as `admin.menuary`;
- tenant-scoped inbox use, where queries are restricted by `tenant_id`;
- multiple brands/verticals;
- tenant domains used to map inbound mail to a tenant.

Do not hard-code a single tenant as the base model.

Do not add tenant-specific UI, copy, colors or domain assumptions unless they are passed through props, runtime config or data already present in the database.

## Styling Rules

The package owns structure and behavior. The host owns visual identity.

Use existing CSS variables for theme-sensitive UI:

- `--ma-paper`
- `--ma-surface`
- `--ma-line`
- `--ma-ink`
- `--ma-muted`
- `--ma-accent`
- `--ma-accent-dark`

Do not hard-code tenant palettes for reusable UI. If a new style hook is needed, add a neutral CSS variable or prop.

## Database And Migrations

Migrations live in `migrations/`.

Do not add runtime auto-migration logic.

Any schema change must be backward-compatible when possible. If a schema change requires a consumer migration, document it in the release notes or commit message.

## Build Artifacts

`dist/` is intentionally committed.

Reason: consumers install this package from GitHub tag tarballs. GitHub tarball installs do not build the package before resolving `exports` that point to `dist/*`.

Whenever source changes:

```bash
npm run typecheck
npm run build
git add src dist package.json package-lock.json
```

Never tag a release unless `dist/` matches `src/`.

## Versioning

Use SemVer:

- patch: bugfixes and fully backward-compatible internal fixes;
- minor: backward-compatible features or optional API additions;
- major: breaking exports, required consumer code changes or incompatible schema changes.

Consumer repos should pin exact tag tarballs, for example:

```json
"@pynkstudio/mailapp": "https://github.com/PynkStudio/pynkstudio-mailapp/archive/refs/tags/v0.2.1.tar.gz"
```

Do not recommend `github:owner/repo#tag` for Vercel consumers because npm may resolve it through SSH.

## Verification

Before finishing changes, run:

```bash
npm run typecheck
npm run test
npm run build
```

Tests live in `src/**/__tests__/` and are excluded from `dist` by `tsconfig.json`.

After building, confirm the new entrypoints still resolve under plain Node ESM —
this is what catches an extensionless relative import that `tsc` accepted:

```bash
node --input-type=module -e 'import("./dist/mailbox/server.js").then(() => console.log("ok"))'
```

For route or runtime changes, also verify at least one consumer app builds after updating to the new tag.

