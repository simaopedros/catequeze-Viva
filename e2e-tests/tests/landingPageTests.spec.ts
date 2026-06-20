import { Cookie, expect, test } from '@playwright/test';

test.describe('general landing page tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('has title', async ({ page }) => {
    await expect(page).toHaveTitle(/Catequese Viva/);
  });

  test('get started link', async ({ page }) => {
    await page.getByRole('link', { name: 'Criar conta grátis' }).first().click();
    await page.waitForURL('**/signup');
  });

  test('headings', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Organize sua turma/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Dúvidas antes de começar' })).toBeVisible();
  });

  test('feature showcases are visible', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Prepare encontros com ajuda da IA/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Faça a chamada pelo celular/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Consulte Bíblia e Catecismo/ })).toBeVisible();
    await expect(page.locator('.aspect-\\[16\\/10\\]').first()).toBeVisible();
  });

  test('plan anchor navigation', async ({ page }) => {
    await page.getByRole('link', { name: 'Ver plano Catequista IA' }).click();
    await expect(page.locator('#planos')).toBeInViewport();
  });
});

test.describe('cookie consent tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('cookie consent banner rejection does not set cc_cookie', async ({
    context,
    page,
  }) => {
    await page.$$('button:has-text("Reject all")');
    await page.click('button:has-text("Reject all")');

    const cookies = await context.cookies();
    const consentCookie = cookies.find((c) => c.name === 'cc_cookie');
    const cookieObject = JSON.parse(decodeURIComponent(consentCookie!.value));
    expect(cookieObject.categories.includes('analytics')).toBeFalsy();
  });

  test('cookie consent banner acceptance sets cc_cookie and _ga cookies', async ({
    context,
    page,
  }) => {
    await page.$$('button:has-text("Accept all")');
    await page.click('button:has-text("Accept all")');

    let cookies = await context.cookies();
    const consentCookie = cookies.find((c) => c.name === 'cc_cookie');
    const cookieObject = JSON.parse(decodeURIComponent(consentCookie!.value));
    expect(cookieObject.categories.includes('analytics')).toBeTruthy();

    const areGaCookiesSet = (cookieList: Cookie[]) => {
      const gaCookiesArr = cookieList.filter((c) => c.name.startsWith('_ga'));
      return gaCookiesArr.length === 2;
    };

    const startTime = Date.now();
    const MAX_TIME_MS = 10000;
    let timeElapsed = 0;

    while (!areGaCookiesSet(cookies) && timeElapsed < MAX_TIME_MS) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      cookies = await context.cookies();
      timeElapsed = Date.now() - startTime;
    }

    expect(timeElapsed).toBeLessThan(MAX_TIME_MS);
  });
});

