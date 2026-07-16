/**
 * Cheap homolog smoke — HTTP only (no browser / React hydration).
 * Used by deploy-homolog via curl; this file is for local `playwright test` with request fixture.
 */
import { test, expect } from '@playwright/test';

const STAFF_URL = process.env.HOMOLOG_STAFF_URL || 'https://homolog.catechis.app';
const FAMILY_URL = process.env.HOMOLOG_FAMILY_URL || 'https://familia-homolog.catechis.app';

async function assertSpaShellHttp(
  request: import('@playwright/test').APIRequestContext,
  origin: string,
  path = '/',
) {
  const url = new URL(path, origin).href;
  const res = await request.get(url, { timeout: 20_000 });
  expect(res.ok(), `GET ${url} → ${res.status()}`).toBeTruthy();
  const html = await res.text();
  expect(html, url).toMatch(/id=["']root["']/);
  expect(html, url).toMatch(/catequese|catechis/i);
  const match = html.match(/src=["'](\/assets\/index-[^"']+\.js)["']/);
  expect(match?.[1], `${url}: missing module asset`).toBeTruthy();
  const assetUrl = new URL(match![1], origin).href;
  const assetRes = await request.get(assetUrl, { timeout: 20_000 });
  expect(assetRes.ok(), `GET ${assetUrl} → ${assetRes.status()}`).toBeTruthy();
}

test.describe('Homolog smoke (HTTP)', () => {
  test.describe.configure({ timeout: 30_000 });

  test('API readyz ok', async ({ request }) => {
    const res = await request.get(`${STAFF_URL}/readyz`, { timeout: 15_000 });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.database).toBe('ok');
  });

  test('Staff SPA shell + main bundle', async ({ request }) => {
    await assertSpaShellHttp(request, STAFF_URL, '/');
  });

  test('Family SPA shell + main bundle', async ({ request }) => {
    await assertSpaShellHttp(request, FAMILY_URL, '/');
  });

  test('Family /convite SPA shell + main bundle', async ({ request }) => {
    await assertSpaShellHttp(request, FAMILY_URL, '/convite');
  });

  test('Staff landing has OG meta in HTML', async ({ request }) => {
    const res = await request.get(`${STAFF_URL}/`, { timeout: 15_000 });
    expect(res.ok()).toBeTruthy();
    const html = await res.text();
    expect(html).toMatch(/property=["']og:title["']/);
    expect(html).toMatch(/property=["']og:image["']/);
    expect(html).toMatch(/content=["']https?:\/\//);
  });
});
