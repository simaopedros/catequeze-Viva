import { test, expect, type APIRequestContext, type Page } from '@playwright/test';

const STAFF_URL = process.env.HOMOLOG_STAFF_URL || 'https://homolog.catechis.app';
const FAMILY_URL = process.env.HOMOLOG_FAMILY_URL || 'https://familia-homolog.catechis.app';

/** Keep deploy gates short — long retries made homolog take 20+ minutes. */
const NAV_MS = 30_000;
const UI_MS = 45_000;

/**
 * Assert the static SPA shell + that the main JS bundle is reachable.
 * Does not wait for React (avoids networkidle / GTM / flaky hydration).
 */
async function assertSpaShell(
  page: Page,
  url: string,
  request: APIRequestContext,
) {
  const res = await page.goto(url, {
    waitUntil: 'domcontentloaded',
    timeout: NAV_MS,
  });
  expect(res?.ok(), `GET ${url} should be 2xx`).toBeTruthy();
  await expect(page).toHaveTitle(/catequese|catechis/i, { timeout: 10_000 });
  await expect(page.locator('#root')).toBeAttached({ timeout: 10_000 });

  const scriptSrc = await page
    .locator('script[type="module"][src]')
    .first()
    .getAttribute('src');
  expect(scriptSrc, 'SPA module script missing from shell').toBeTruthy();

  const assetUrl = new URL(scriptSrc!, url).href;
  const assetRes = await request.get(assetUrl, { timeout: 20_000 });
  expect(
    assetRes.ok(),
    `Main bundle not reachable: ${assetUrl} → ${assetRes.status()}`,
  ).toBeTruthy();

  return assetUrl;
}

/**
 * Wait for React-mounted UI without networkidle (GTM keeps network busy forever).
 */
async function waitForVisible(page: Page, selector: string, timeout = UI_MS) {
  await expect(page.locator(selector).first()).toBeVisible({ timeout });
}

/** Hit HTML + main JS so edge/CDN is hot before UI asserts. */
async function warmOrigin(request: APIRequestContext, origin: string) {
  const htmlRes = await request.get(origin + '/', { timeout: NAV_MS });
  expect(htmlRes.ok(), `warm ${origin}/`).toBeTruthy();
  const html = await htmlRes.text();
  const match = html.match(/src="(\/assets\/index-[^"]+\.js)"/);
  if (match?.[1]) {
    const assetRes = await request.get(new URL(match[1], origin).href, {
      timeout: 20_000,
    });
    expect(assetRes.ok(), `warm asset ${match[1]}`).toBeTruthy();
  }
}

test.describe('Homolog smoke tests', () => {
  test.describe.configure({ timeout: 60_000 });

  test('API health check returns ok with all services', async ({ request }) => {
    const res = await request.get(`${STAFF_URL}/readyz`, { timeout: 20_000 });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.database).toBe('ok');
  });

  test('Warm staff + family SPA assets', async ({ request }) => {
    await warmOrigin(request, STAFF_URL);
    await warmOrigin(request, FAMILY_URL);
  });

  test('Staff portal landing loads', async ({ page, request }) => {
    await assertSpaShell(page, STAFF_URL, request);
    // Best-effort UI; shell+asset already proved deploy. Soften flakiness.
    try {
      await waitForVisible(page, 'h1, h2', UI_MS);
    } catch {
      // If React is slow once, re-nav once only (no 3-minute loops).
      await page.reload({ waitUntil: 'domcontentloaded', timeout: NAV_MS });
      await waitForVisible(page, 'h1, h2', UI_MS);
    }
  });

  test('Family portal landing loads with brand content', async ({
    page,
    request,
  }) => {
    await assertSpaShell(page, FAMILY_URL, request);
    try {
      await waitForVisible(page, 'h1, h2', UI_MS);
    } catch {
      await page.reload({ waitUntil: 'domcontentloaded', timeout: NAV_MS });
      await waitForVisible(page, 'h1, h2', UI_MS);
    }
  });

  test('Invite code page loads with form', async ({ page, request }) => {
    await assertSpaShell(page, `${FAMILY_URL}/convite`, request);
    const inviteInput = page.locator(
      '#invite-code, input[id="invite-code"], input[placeholder*="abc"]',
    );
    try {
      await expect(inviteInput.first()).toBeVisible({ timeout: UI_MS });
    } catch {
      await page.reload({ waitUntil: 'domcontentloaded', timeout: NAV_MS });
      await expect(inviteInput.first()).toBeVisible({ timeout: UI_MS });
    }
    await expect(inviteInput.first()).toBeEditable({ timeout: 10_000 });
  });

  test('OG meta tags present on landing', async ({ page }) => {
    await page.goto(STAFF_URL, {
      waitUntil: 'domcontentloaded',
      timeout: NAV_MS,
    });
    const ogTitle = await page
      .locator('meta[property="og:title"]')
      .getAttribute('content');
    expect(ogTitle).toBeTruthy();
    const ogImage = await page
      .locator('meta[property="og:image"]')
      .getAttribute('content');
    expect(ogImage).toBeTruthy();
    expect(ogImage).toMatch(/^https?:\/\//);
  });
});
