# QA — PR14 Playwright + PR15 Lighthouse

## Prerequisites

```bash
cd app
# App running:
#   front http://localhost:3000
#   back  http://localhost:3001
wasp start   # if not already up
```

Optional seed for auth/nav specs:

```bash
./seed_tests.sh   # from app/ or repo root per AGENTS.md
```

## PR14 — E2E

```bash
cd app
npx playwright install chromium   # once
npm run test:e2e:landing          # landings + viewport meta
npm run test:e2e:nav              # bottom bar / sidebar
npx playwright test tests/e2e/a11y-viewport.spec.ts --project=chromium
npx playwright test tests/e2e/onboarding-activation.spec.ts --project=chromium
# full suite:
npm run test:e2e -- --project=chromium
```

Viewports covered in specs: 360×800, 390×844, 768×1024, 1440×900 (inline) + projects `chromium` / `mobile-390`.

## PR15 — Lighthouse landings

```bash
cd app
npm run lighthouse:landings
# artifacts/lighthouse/summary.json + per-route HTML/JSON
```

Soft targets (design): LCP ≤ 2.5s, CLS ≤ 0.1, INP ≤ 200ms (p75 — single Lighthouse run is noisy; use as trend, not hard CI gate).

## Visual seed checklist (manual)

With seed users (`Teste@123`):

1. Landing `/` — hero, proof, `#planos`, no fake testimonials
2. `/ia`, `/presenca`, `/sistema` — demo before pricing
3. Mobile 390 — bottom 4 + More, sheet Escape
4. Personal vs parish workspace — nav hides institutional items on PERSONAL
5. Onboarding personal — CTA after people → attendance path
6. Trial banner: mid-trial without first value = hidden; ≤2 days = urgency

## SEO crawler note

- **Client:** `applyLandingRouteMeta` (SPA)
- **Server (prod index on same host):** `landingHtmlMeta` middleware injects title/description/OG into `index.html` for `/`, `/ia`, `/presenca`, `/sistema`
- Local `wasp start` often serves Vite on :3000 separately — middleware applies when built SPA is served by the Node server
