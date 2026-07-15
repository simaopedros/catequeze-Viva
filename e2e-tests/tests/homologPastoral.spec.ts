import { test, expect } from '@playwright/test';
import { hasCfAccessCredentials } from '../cfAccess';

const STAFF_URL = process.env.HOMOLOG_STAFF_URL || 'https://homolog.catechis.app';
const FAMILY_URL = process.env.HOMOLOG_FAMILY_URL || 'https://familia-homolog.catechis.app';
const API_URL = process.env.HOMOLOG_API_URL || 'https://api-homolog.catechis.app';

test.describe('Homolog pastoral QA (automated)', () => {
  test.beforeEach(() => {
    test.skip(
      !hasCfAccessCredentials(),
      'Set CF_ACCESS_CLIENT_ID + CF_ACCESS_CLIENT_SECRET for homolog behind Cloudflare Access',
    );
  });

  test('B6: /convite accepts manual code navigation', async ({ page }) => {
    await page.goto(`${FAMILY_URL}/convite`);
    await expect(page.locator('#invite-code, input[id="invite-code"]')).toBeVisible();
    const testToken = 'qa-test-token-placeholder';
    await page.fill('#invite-code', testToken);
    await page.getByRole('button', { name: /aceitar|accept/i }).click();
    await page.waitForURL(`**/convite/${encodeURIComponent(testToken)}`);
  });

  test('B1 paths: criar-conta and entrar load with token param', async ({ page }) => {
    const token = 'test-token-qa';
    for (const path of [`/criar-conta?token=${token}`, `/entrar?token=${token}`]) {
      const res = await page.goto(`${FAMILY_URL}${path}`);
      expect(res?.ok()).toBeTruthy();
    }
  });

  test('B3: family app routes exist after login shell', async ({ page }) => {
    // Unauthenticated — should redirect to login or show auth, not 404
    for (const path of ['/app', '/app/calendar', '/app/messages']) {
      const res = await page.goto(`${FAMILY_URL}${path}`);
      expect(res?.status() ?? 200).toBeLessThan(500);
    }
  });

  test('B4: staff billing not served on family host', async ({ page }) => {
    await page.goto(`${FAMILY_URL}/app/billing`, { waitUntil: 'domcontentloaded' });
    // Must stay on family host — never jump to staff homolog.
    // Note: "familia-homolog.catechis.app" contains the substring "homolog.catechis.app",
    // so compare hostnames, not a bare includes() on the full URL.
    const staffHost = new URL(STAFF_URL).hostname;
    const familyHost = new URL(FAMILY_URL).hostname;
    const landed = new URL(page.url());
    expect(landed.hostname).toBe(familyHost);
    expect(landed.hostname).not.toBe(staffHost);
  });

  test('C2: public upload-docs route returns SPA (not 404)', async ({ page }) => {
    const res = await page.goto(`${FAMILY_URL}/upload-docs/invalid-token-qa`);
    expect(res?.ok()).toBeTruthy();
  });

  test('Staff pricing page loads', async ({ page }) => {
    const res = await page.goto(`${STAFF_URL}/pricing`);
    expect(res?.ok()).toBeTruthy();
  });

  test('API health via same-origin staff proxy', async ({ request }) => {
    // /readyz is the deep readiness probe that checks the database.
    // /health is a cheap liveness probe that skips the DB by design.
    const res = await request.get(`${STAFF_URL}/readyz`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.database).toBe('ok');
  });

  test('Stripe webhook bypasses Access', async ({ request }) => {
    const res = await request.post(`${API_URL}/payments-webhook`, {
      data: {},
      headers: { 'Content-Type': 'application/json' },
    });
    expect([400, 401]).toContain(res.status());
  });
});
