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
- `@pynkstudio/mailapp/migrations/*`

Do not remove or rename exports without a major version bump and a consumer migration plan.

Prefer optional additions over breaking changes.

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
npm run build
```

For route or runtime changes, also verify at least one consumer app builds after updating to the new tag.

