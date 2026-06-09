import { test, expect } from '@playwright/test';

const STAFF_URL = process.env.HOMOLOG_STAFF_URL || 'https://homolog.catechis.app';
const FAMILY_URL = process.env.HOMOLOG_FAMILY_URL || 'https://familia-homolog.catechis.app';

test.describe('Homolog smoke tests', () => {
  test('API health check returns ok (same-origin proxy)', async ({ request }) => {
    const res = await request.get(`${STAFF_URL}/health`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.database).toBe('ok');
  });

  test('Family portal landing loads', async ({ page }) => {
    const res = await page.goto(FAMILY_URL);
    expect(res?.ok()).toBeTruthy();
    await expect(page.locator('body')).toContainText(/família|family|portal/i);
  });

  test('Invite code page loads without 404', async ({ page }) => {
    const res = await page.goto(`${FAMILY_URL}/convite`);
    expect(res?.ok()).toBeTruthy();
  });
});
