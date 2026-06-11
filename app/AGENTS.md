# Catequese Viva

Full-stack SaaS for Catholic catechesis management, built on [Wasp](https://wasp.sh) (v0.22) with React, Node.js, Prisma, and PostgreSQL.

## Repository layout

```
app/           ← Main Wasp app (this directory)
  main.wasp    ← Configuration hub: routes, pages, queries, actions, jobs, APIs
  schema.prisma ← Database schema (all entities)
  src/
    catequese/pages/        ← App page components
    server/operations/      ← Query/Action implementations
    server/api/             ← Raw HTTP endpoints (API routes)
    server/scripts/         ← DB seeds, cron jobs
    shared/                 ← Shared constants, pricing, plan limits
    client/                 ← UI components (shadcn/ui, new-york style)
  migrations/ ← Wasp-managed DB migrations
  .wasp/out/  ← GENERATED — never edit
e2e-tests/    ← Playwright e2e tests
blog/         ← Astro blog (separate package)
```

## Wasp: critical rules

- **`main.wasp` is the source of truth** for routes, queries, actions, jobs, and APIs. The `.wasp/out/` directory is fully generated — never edit it.
- **Every Prisma entity referenced in an operation must also be declared in that operation's `entities` list** in `main.wasp`. Missing entities cause runtime errors.
- **Never run native Prisma CLI commands** (`npx prisma db push`, `npx prisma migrate`, etc.). Wasp manages internal Auth/Identity/Session tables that are NOT in `schema.prisma`. Running native Prisma will drop them and break authentication. Run `node fix-auth.sh` to recover if this happens.
- **Always use `wasp db migrate-dev`** for schema changes.
- `tsconfig.json` is for IDE support only — Wasp compiles with its own settings.

## Development commands

```bash
wasp start db              # Start PostgreSQL (leave running)
wasp start                 # Start dev server (leave running)
wasp db migrate-dev        # Run pending migrations (first time or after schema changes)
wasp db seed               # Seed mock users + Bible/Catechism data
npm run test               # Run all vitest tests
npm run test:unit          # Unit tests only (TOTP + i18n)
npm run test:integration   # Integration tests (excludes unit)
npm run i18n:check         # Validate i18n key parity (JSON ↔ TS)
npx playwright test        # Run e2e tests (from e2e-tests/, requires wasp start)
npx playwright test --ui   # Run e2e tests in Playwright UI
```

## Test seed data

```bash
./seed_tests.sh            # Depopulates + seeds 1 diocese, 3 parishes, 16 users, classes, meetings
```
Default password for all seed users: `Teste@123`. All fixture IDs are hardcoded — change them only in conjunction with the tests.

## Environment

Two env files are required for dev:
- `.env.server` — server-side vars (DB, API keys, SMTP)
- `.env.client` — client-side vars (must be prefixed with `REACT_APP_` per Wasp)

Key dev vars:
- `SKIP_EMAIL_VERIFICATION_IN_DEV=true` — bypass email verification
- `DATABASE_URL` in `.env.server` can be commented out to let `wasp start db` manage it

## Architecture notes

- **Multi-tenant**: Diocese → Parish → Community → Class. `ParishType` enum distinguishes PERSONAL (individual catechist), PARISH, DIOCESE, COMMUNITY workspaces.
- **shadcn/ui** components live in `src/client/components/ui/` (new-york style, lucide icons).
- **Tailwind CSS v4** with `@tailwindcss/vite` plugin. Uses CSS variables for theming.
- **i18n**: i18next with 33 namespaces under `src/i18n/locales/`. Default locale is `pt-BR` (NEVER use `pt` without `-BR`). Run `npm run i18n:check` in CI. Supported: pt-BR, en, es. Fallback: pt-BR.
  - Add new keys: create JSON in all 3 locales, add namespace to `config.ts`, run `npm run i18n:build && npm run i18n:check`.
  - Components use `useTranslation('namespace')`. Section components accept optional `ns` prop override.
- **Landing pages**: 4 pages serving different audiences:
  - `/` — Principal (todos os públicos), namespace `landing`
  - `/sistema` — Google Ads (gestão), namespace `landingSistema`
  - `/ia` — Google Ads (IA), namespace `landingIa`
  - `/presenca` — Google Ads (presença), namespace `landingPresenca`
  - Section components in `src/landing-page/components/` accept `ns` prop. Each landing reorders sections via `order` prop on `FeaturesSection`.
- **AI features**: AI-generated content, meeting plans, chat. Rate-limited by `UserAiCredits` and `DailyAiUsage`. OpenAI via `src/server/ai/`.
- **Billing**: Stripe + LemonSqueezy + Polar + Woovi (PIX). Plans in `src/shared/pricing.ts`. Limits enforced in `src/shared/planLimits.ts`.
- **CI** (`.github/workflows/ci.yml`): `npm run i18n:check` then `npm run test:unit`, plus `wasp compile`.
