import { test, expect, type Page } from '@playwright/test';

const STAFF_URL = process.env.HOMOLOG_STAFF_URL || 'https://homolog.catechis.app';
const FAMILY_URL = process.env.HOMOLOG_FAMILY_URL || 'https://familia-homolog.catechis.app';

/** Default budget for SPA hydrate after Docker deploy + CF edge cold path. */
const SPA_HYDRATE_MS = 120_000;
/** Per-test ceiling: hydrate may reload a few times after deploy. */
const SMOKE_TEST_MS = 180_000;

/**
 * SPA shell only has noscript + empty #root until React mounts.
 * After Docker deploy, family host first paints can stall past 60–90s.
 * Retry with soft reloads so one cold paint does not fail the pipeline.
 */
async function waitForSpaHydration(
  page: Page,
  pattern?: RegExp,
  timeout = SPA_HYDRATE_MS,
) {
  const deadline = Date.now() + timeout;
  const maxAttempts = 3;
  let lastError: unknown;

  await page.waitForSelector('#root', {
    state: 'attached',
    timeout: Math.min(timeout, 30_000),
  });

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const remaining = deadline - Date.now();
    if (remaining <= 2_000) break;

    try {
      // Prefer network settling when possible; ignore if already idle/timeouts.
      await page
        .waitForLoadState('networkidle', {
          timeout: Math.min(remaining, 20_000),
        })
        .catch(() => undefined);

      await page.waitForFunction(
        () => {
          const root = document.querySelector('#root');
          if (!root) return false;
          const text = (root.textContent || '').trim();
          // Real app content — not only whitespace / empty shell
          return text.length > 8;
        },
        { timeout: Math.min(remaining, 50_000) },
      );

      if (pattern) {
        await expect(page.locator('#root')).toContainText(pattern, {
          timeout: Math.min(deadline - Date.now(), 30_000),
        });
      }
      return;
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts - 1 && Date.now() < deadline - 5_000) {
        await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('SPA failed to hydrate within cold-start budget');
}

/** Touch family origin so CF + CDN + container warm before critical asserts. */
async function warmFamilyHost(page: Page) {
  const res = await page.goto(FAMILY_URL, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  });
  // Access challenge pages still return 2xx sometimes; SPA tests handle body.
  expect(res?.status() ?? 0).toBeLessThan(500);
  await waitForSpaHydration(page, /família|family|portal|catequese|catechis/i, 90_000);
}

test.describe('Homolog smoke tests', () => {
  // Cold deploy + CF + large client bundle on family host need a long ceiling.
  test.describe.configure({ timeout: SMOKE_TEST_MS });

  test('API health check returns ok with all services', async ({ request }) => {
    // /readyz is the deep readiness probe that checks the database.
    // /health is a cheap liveness probe that skips the DB by design.
    const res = await request.get(`${STAFF_URL}/readyz`, { timeout: 30_000 });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.database).toBe('ok');
  });

  test('Staff portal landing loads', async ({ page }) => {
    const res = await page.goto(STAFF_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });
    expect(res?.ok()).toBeTruthy();
    await expect(page).toHaveTitle(/catequese|catechis/i);
    await waitForSpaHydration(page, /catequese|catechis/i);
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 45_000 });
  });

  test('Family portal landing loads with brand content', async ({ page }) => {
    await warmFamilyHost(page);
    await expect(page).toHaveTitle(/catequese|catechis/i);
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 45_000 });
  });

  test('Invite code page loads with form', async ({ page }) => {
    // Warm family host first (shares browser context cache / edge).
    await warmFamilyHost(page);

    const res = await page.goto(`${FAMILY_URL}/convite`, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });
    expect(res?.ok()).toBeTruthy();

    // Accept pt-BR / en / es copy once hydrated.
    await waitForSpaHydration(
      page,
      /inserir|código|code|enter|ingresar|convite|invite|portal/i,
    );

    // Prefer role/label in case id wiring changes; keep id as fallback.
    const inviteInput = page
      .locator('#invite-code, input[id="invite-code"], input[placeholder*="abc"]')
      .first();
    await expect(inviteInput).toBeVisible({ timeout: 60_000 });
    await expect(inviteInput).toBeEditable({ timeout: 15_000 });
  });

  test('OG meta tags present on landing', async ({ page }) => {
    await page.goto(STAFF_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
    expect(ogTitle).toBeTruthy();
    const ogImage = await page.locator('meta[property="og:image"]').getAttribute('content');
    expect(ogImage).toBeTruthy();
    // og:image must be a valid absolute URL (asset path may change).
    expect(ogImage).toMatch(/^https?:\/\//);
  });
});
