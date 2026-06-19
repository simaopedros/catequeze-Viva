# Repository Guidelines

## Project Structure & Module Organization

This repository is a Wasp-based workspace with three packages:

- `app/` - primary product code, schema, migrations, and server/client logic
- `e2e-tests/` - standalone Playwright suite for local and CI browser tests
- `blog/` - separate Astro/Starlight site for docs and marketing content

Inside `app/`, keep Wasp source in `src/`, database changes in `schema.prisma` and `migrations/`, and web assets in `public/`. Unit tests live in `src/__tests__/` as `*.test.ts`; browser specs live in `app/tests/e2e/` as `*.spec.ts`.

## Build, Test, and Development Commands

Run commands from the relevant package directory:

- `cd app && wasp start db` - start PostgreSQL for local development
- `cd app && wasp start` - run the app in dev mode
- `cd app && wasp db migrate-dev` - apply schema changes through Wasp
- `cd app && wasp db seed` - load sample data
- `cd app && npm run test` - run all Vitest tests
- `cd app && npm run test:unit` - run the fast unit subset
- `cd app && npm run test:integration` - run integration-focused tests
- `cd app && npx playwright test` - run the app e2e suite
- `cd blog && npm run dev` / `npm run build` - develop or verify the blog

## Coding Style & Naming Conventions

Use TypeScript and follow the existing Wasp/React patterns in each package. Keep changes aligned with nearby code, prefer `camelCase` for variables/functions and `PascalCase` for components, and name files after their exported feature or test target. The app depends on Prettier, so keep formatting consistent with the codebase.

## Testing Guidelines

Add or update tests alongside behavior changes. Use `*.test.ts` for Vitest coverage and `*.spec.ts` for Playwright flows. When changing localization, billing, auth, or schema-related logic, run the relevant focused test command plus `npm run i18n:check` if translations are touched.

## Commit & Pull Request Guidelines

The git history uses Conventional Commits, usually `feat:` or `fix:` with optional scopes such as `feat(ai-hub): ...`. Keep commit subjects short and imperative. Pull requests should describe the change, list the commands you ran, link related issues when available, and include screenshots or short recordings for UI updates. Mention migrations, seed data, or test fixture changes explicitly.

## Project-Specific Notes

`app/AGENTS.md` contains deeper Wasp-specific rules. Follow it for anything inside `app/`, especially around `main.wasp`, generated `.wasp/out/` files, and database migrations.
