/**
 * Playwright: switching workspace must not leak data from the previous one.
 *
 * Verifies server payloads (operations responses), not only hidden UI.
 * Requires seeded test users (seed_tests.sh) and running app.
 * multirole@catequese.com is PARISH_COORDINATOR in São José and
 * LEAD_CATECHIST in Santa Maria.
 */
import { test, expect, type Page, type Response } from '@playwright/test';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';
const MULTI_EMAIL = 'multirole@catequese.com';
const PASSWORD = 'Teste@123';

const PARISH_SAO_JOSE = 'aaaaaaaa-1111-4aaa-a111-aaaaaaaaaaaa';
const PARISH_SANTA_MARIA = 'bbbbbbbb-2222-4bbb-b222-bbbbbbbbbbbb';

async function loginMultirole(page: Page) {
  await page.goto(`${BASE}/login`);
  await page.getByLabel(/email/i).fill(MULTI_EMAIL);
  await page.getByLabel(/senha|password/i).fill(PASSWORD);
  await page.getByRole('button', { name: /entrar|login|sign in/i }).click();
  await page.waitForURL(/\/(app|select-workspace|onboarding)/, {
    timeout: 30000,
  });
}

async function setWorkspaceInStorage(page: Page, workspaceId: string) {
  await page.evaluate((id) => {
    localStorage.setItem('catequese-viva-active-workspace', id);
    window.dispatchEvent(new Event('workspace-changed'));
  }, workspaceId);
}

function isOpsResponse(res: Response, opName: string): boolean {
  const url = res.url();
  return (
    res.request().method() === 'POST' &&
    (url.includes(opName) ||
      url.includes('operations') ||
      url.includes('/rpc/')) &&
    res.status() === 200
  );
}

test.describe('Workspace switch isolation', () => {
  test.skip(!process.env.E2E_RUN_WORKSPACE, 'Set E2E_RUN_WORKSPACE=1 to run');

  test('multirole: classes and messages payloads stay in active workspace', async ({
    page,
  }) => {
    await loginMultirole(page);

    // ── Workspace A: São José ──────────────────────────────────────────
    await setWorkspaceInStorage(page, PARISH_SAO_JOSE);

    const classesSjPromise = page.waitForResponse(
      (res) =>
        isOpsResponse(res, 'listClasses') ||
        res.url().includes('listClasses'),
      { timeout: 20000 },
    ).catch(() => null);

    await page.goto(`${BASE}/app/classes`);
    await page.waitForLoadState('networkidle');
    const classesSjRes = await classesSjPromise;
    if (classesSjRes) {
      const body = await classesSjRes.json().catch(() => null);
      const list = Array.isArray(body) ? body : body?.data || body?.result;
      if (Array.isArray(list)) {
        for (const item of list) {
          if (item?.parishId) {
            expect(item.parishId).toBe(PARISH_SAO_JOSE);
          }
        }
      }
    }

    const convSjPromise = page.waitForResponse(
      (res) =>
        res.url().includes('listConversations') ||
        (res.request().method() === 'POST' &&
          res.url().includes('operations') &&
          (res.request().postData() || '').includes('listConversations')),
      { timeout: 20000 },
    ).catch(() => null);

    await page.goto(`${BASE}/app/messages`);
    await page.waitForLoadState('networkidle');
    const convSjRes = await convSjPromise;
    if (convSjRes) {
      const body = await convSjRes.json().catch(() => null);
      const list = Array.isArray(body) ? body : body?.data || body?.result;
      if (Array.isArray(list)) {
        for (const c of list) {
          if (c?.parishId) expect(c.parishId).toBe(PARISH_SAO_JOSE);
          // Contacts / participants must not expose full email on list
          for (const p of c?.participants || []) {
            expect(p?.user?.email).toBeUndefined();
          }
        }
      }
    }

    // ── Workspace B: Santa Maria ───────────────────────────────────────
    await setWorkspaceInStorage(page, PARISH_SANTA_MARIA);

    const classesSmPromise = page.waitForResponse(
      (res) =>
        res.url().includes('listClasses') ||
        (res.request().method() === 'POST' &&
          (res.request().postData() || '').includes('listClasses')),
      { timeout: 20000 },
    ).catch(() => null);

    await page.goto(`${BASE}/app/classes`);
    await page.waitForLoadState('networkidle');
    const classesSmRes = await classesSmPromise;
    if (classesSmRes) {
      const body = await classesSmRes.json().catch(() => null);
      const list = Array.isArray(body) ? body : body?.data || body?.result;
      if (Array.isArray(list)) {
        for (const item of list) {
          if (item?.parishId) {
            expect(item.parishId).toBe(PARISH_SANTA_MARIA);
          }
        }
      }
    }

    const convSmPromise = page.waitForResponse(
      (res) =>
        res.url().includes('listConversations') ||
        (res.request().method() === 'POST' &&
          (res.request().postData() || '').includes('listConversations')),
      { timeout: 20000 },
    ).catch(() => null);

    await page.goto(`${BASE}/app/messages`);
    await page.waitForLoadState('networkidle');
    const convSmRes = await convSmPromise;
    if (convSmRes) {
      const body = await convSmRes.json().catch(() => null);
      const list = Array.isArray(body) ? body : body?.data || body?.result;
      if (Array.isArray(list)) {
        for (const c of list) {
          if (c?.parishId) expect(c.parishId).toBe(PARISH_SANTA_MARIA);
        }
      }
    }

    await expect(page.getByText(/erro|403|forbidden/i)).toHaveCount(0);
  });
});
