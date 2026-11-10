import { expect, test } from '@playwright/test';

// Run with HOTMART_PRIMARY_CHECKOUT=false and the restored pricing-v3 catalog.
// Signup requires SKIP_EMAIL_VERIFICATION_IN_DEV=true on the local server.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('i18nextLng', 'pt-BR'));
});

test('shows the previous Catequista and Parish prices with a trial offer', async ({ page }) => {
  await page.goto('/pricing');
  await expect(page.getByText('R$ 9,90', { exact: true })).toBeVisible();
  await expect(page.getByText('R$ 99', { exact: true })).toBeVisible();
  await expect(page.getByText(/R\$ 99/).first()).toBeVisible();
  await expect(page.getByText(/7 dias grátis.*sem cartão/i).first()).toBeVisible();
  await page.getByRole('button', { name: 'Começar os 7 dias' }).first().click();
  await expect(page).toHaveURL(/\/signup/);
});

test('annual Catequista is R$ 99 with 17 percent savings', async ({ page }) => {
  await page.goto('/pricing');
  await page.getByRole('tab', { name: /Anual/ }).click();
  await expect(page.getByText(/R\$ 99/).first()).toBeVisible();
  await expect(page.getByText(/17%/).first()).toBeVisible();
  await expect(page.getByText(/R\$ 19,80/).first()).toBeVisible();
});

test('new signup reaches onboarding without subscribing', async ({ page }) => {
  // Plain signup starts the product trial journey. No checkout is made.
  const email = `pricing-${Date.now()}@example.com`;
  const password = 'Catequista!2026';
  await page.goto('/signup');
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
  await expect(page).toHaveURL(/\/app\/onboarding/, { timeout: 20000 });
  await expect(page.getByRole('button', { name: /Assinar/ })).toHaveCount(0);
});
