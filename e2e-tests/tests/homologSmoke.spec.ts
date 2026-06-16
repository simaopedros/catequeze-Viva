import { test, expect } from '@playwright/test';

const STAFF_URL = process.env.HOMOLOG_STAFF_URL || 'https://homolog.catechis.app';
const FAMILY_URL = process.env.HOMOLOG_FAMILY_URL || 'https://familia-homolog.catechis.app';

test.describe('Homolog smoke tests', () => {
  test('API health check returns ok with all services', async ({ request }) => {
    const res = await request.get(`${STAFF_URL}/health`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.database).toBe('ok');
  });

  test('Family portal landing loads with brand content', async ({ page }) => {
    const res = await page.goto(FAMILY_URL);
    expect(res?.ok()).toBeTruthy();
    await expect(page.locator('body')).toContainText(/família|family|portal/i);
    // Should have at least one heading
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 5000 });
  });

  test('Staff portal landing loads and redirects to login', async ({ page }) => {
    const res = await page.goto(STAFF_URL);
    expect(res?.ok()).toBeTruthy();
    // Unauthenticated — should redirect to login
    await page.waitForURL('**/login**', { timeout: 10000 });
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('Invite code page loads with form', async ({ page }) => {
    const res = await page.goto(`${FAMILY_URL}/convite`);
    expect(res?.ok()).toBeTruthy();
    // Should have an invite code input
    await expect(page.locator('#invite-code, input[id="invite-code"]')).toBeVisible({ timeout: 5000 });
  });

  test('OG meta tags present on landing', async ({ page }) => {
    await page.goto(STAFF_URL);
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
    expect(ogTitle).toBeTruthy();
    const ogImage = await page.locator('meta[property="og:image"]').getAttribute('content');
    expect(ogImage).toBeTruthy();
    expect(ogImage).toContain('og-image');
  });
});
