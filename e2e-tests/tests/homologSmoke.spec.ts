import { test, expect, type Page } from '@playwright/test';

const STAFF_URL = process.env.HOMOLOG_STAFF_URL || 'https://homolog.catechis.app';
const FAMILY_URL = process.env.HOMOLOG_FAMILY_URL || 'https://familia-homolog.catechis.app';

/**
 * SPA shell only has noscript + empty #root until React mounts.
 * After Docker deploy, first paints can be slow — allow a long cold-start window.
 */
async function waitForSpaHydration(page: Page, pattern: RegExp, timeout = 60_000) {
  await page.waitForSelector('#root', { state: 'attached', timeout });
  await page.waitForFunction(
    () => {
      const root = document.querySelector('#root');
      return Boolean(root && (root.textContent || '').trim().length > 0);
    },
    { timeout },
  );
  await expect(page.locator('#root')).toContainText(pattern, { timeout });
}

test.describe('Homolog smoke tests', () => {
  // Cold deploy + CF + large client bundle — default 30s is too tight.
  test.describe.configure({ timeout: 90_000 });

  test('API health check returns ok with all services', async ({ request }) => {
    // /readyz is the deep readiness probe that checks the database.
    // /health is a cheap liveness probe that skips the DB by design.
    const res = await request.get(`${STAFF_URL}/readyz`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.database).toBe('ok');
  });

  test('Family portal landing loads with brand content', async ({ page }) => {
    const res = await page.goto(FAMILY_URL, { waitUntil: 'domcontentloaded' });
    expect(res?.ok()).toBeTruthy();
    // Title is in the static HTML shell (no JS required).
    await expect(page).toHaveTitle(/catequese|catechis/i);
    await waitForSpaHydration(page, /família|family|portal|catequese|catechis/i);
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 30_000 });
  });

  test('Staff portal landing loads', async ({ page }) => {
    const res = await page.goto(STAFF_URL, { waitUntil: 'domcontentloaded' });
    expect(res?.ok()).toBeTruthy();
    await expect(page).toHaveTitle(/catequese|catechis/i);
    await waitForSpaHydration(page, /catequese|catechis/i);
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 30_000 });
  });

  test('Invite code page loads with form', async ({ page }) => {
    const res = await page.goto(`${FAMILY_URL}/convite`, { waitUntil: 'domcontentloaded' });
    expect(res?.ok()).toBeTruthy();
    await waitForSpaHydration(page, /convite|invite|código|code|inserir|portal/i);
    // Prefer role/label in case id wiring changes; keep id as fallback.
    const inviteInput = page
      .locator('#invite-code, input[id="invite-code"], input[placeholder*="abc"]')
      .first();
    await expect(inviteInput).toBeVisible({ timeout: 30_000 });
  });

  test('OG meta tags present on landing', async ({ page }) => {
    await page.goto(STAFF_URL, { waitUntil: 'domcontentloaded' });
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
    expect(ogTitle).toBeTruthy();
    const ogImage = await page.locator('meta[property="og:image"]').getAttribute('content');
    expect(ogImage).toBeTruthy();
    // og:image must be a valid absolute URL (asset path may change).
    expect(ogImage).toMatch(/^https?:\/\//);
  });
});
