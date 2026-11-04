import { expect, test } from '@playwright/test';

// Run with HOTMART_PRIMARY_CHECKOUT=false and a pricing-v4 catalog.
// Signup requires SKIP_EMAIL_VERIFICATION_IN_DEV=true on the local server.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('i18nextLng', 'pt-BR'));
});

test('shows Catequista v4 and unchanged Parish prices without a trial offer', async ({ page }) => {
  await page.goto('/pricing');
  await expect(page.getByText('R$ 47', { exact: true })).toBeVisible();
  await expect(page.getByText('R$ 99', { exact: true })).toBeVisible();
  await expect(page.getByText(/R\$ 297/).first()).toBeVisible();
  await expect(page.getByText(/7 dias grátis|sem cartão|9,90/i)).toHaveCount(0);
  await page.getByRole('button', { name: 'Assinar agora' }).first().click();
  await expect(page).toHaveURL(/\/signup/);
});

test('annual Catequista is R$ 297 with 47 percent savings', async ({ page }) => {
  await page.goto('/pricing');
  await page.getByRole('tab', { name: /Anual/ }).click();
  await expect(page.getByText(/R\$ 297/).first()).toBeVisible();
  await expect(page.getByText(/47%/).first()).toBeVisible();
  await expect(page.getByText(/R\$ 267/).first()).toBeVisible();
});

test('new signup goes to billing and cannot enter the product before subscribing', async ({ page }) => {
  // To run before Nov 5, start the server with an earlier cutoff and pass the
  // same NEW_PRICING_ACCOUNT_CUTOFF_ISO to Playwright. No real checkout is made.
  const cutoff = process.env.NEW_PRICING_ACCOUNT_CUTOFF_ISO || '2026-11-05T00:00:00-03:00';
  test.skip(Date.now() < Date.parse(cutoff), 'Requires an account created on or after the configured cutoff');
  const email = `pricing-${Date.now()}@example.com`;
  const password = 'Catequista!2026';
  await page.goto('/signup?plan=single&interval=annual');
  await page.getByRole('button', { name: /Continuar com e-mail/ }).click();
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.locator('#confirmPassword').fill(password);
  await page.getByRole('checkbox').check();
  const signupResponse = page.waitForResponse(response => response.url().includes('/auth/email/signup') && response.request().method() === 'POST');
  await page.locator('button[type="submit"]').click();
  expect((await signupResponse).ok()).toBe(true);
  await page.goto('/login');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/app\/billing/, { timeout: 20000 });
  await expect(page.getByText(/7 dias grátis|sem cartão/i)).toHaveCount(0);
  await page.goto('/app/classes');
  await expect(page).toHaveURL(/\/app\/billing/, { timeout: 20000 });
  await expect(page.getByRole('button', { name: /Assinar/ }).first()).toBeVisible();
});
