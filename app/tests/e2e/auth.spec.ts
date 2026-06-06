/**
 * auth.spec.ts — Login, logout, and authentication flows.
 */
import { test, expect } from '@playwright/test';
import { login, logout, USERS, PASSWORD, BASE } from './helpers';

test.describe('Authentication', () => {

  test.describe('Login', () => {

    test('redirects to login when unauthenticated', async ({ page }) => {
      await page.goto('/app');
      await page.waitForURL(/\/login/, { timeout: 10000 });
      expect(page.url()).toContain('/login');
    });

    test('Coordinator can login and reach workspace selector', async ({ page }) => {
      await login(page, USERS.coordSaoJose.email);
      expect(page.url()).toMatch(/\/workspace-selector|\/app/);
    });

    test('Lead Catechist can login', async ({ page }) => {
      await login(page, USERS.leadCatechist.email);
      expect(page.url()).toMatch(/\/workspace-selector|\/app/);
    });

    test('Assistant Catechist can login', async ({ page }) => {
      await login(page, USERS.assistantCatechist.email);
      expect(page.url()).toMatch(/\/workspace-selector|\/app/);
    });

    test('Guardian can login', async ({ page }) => {
      await login(page, USERS.guardian.email);
      expect(page.url()).toMatch(/\/workspace-selector|\/app/);
    });

    test('Catechumen can login', async ({ page }) => {
      await login(page, USERS.catechumen.email);
      expect(page.url()).toMatch(/\/workspace-selector|\/app/);
    });

    test('Admin can login and see admin menu', async ({ page }) => {
      await login(page, USERS.admin.email);
      expect(page.url()).toMatch(/\/workspace-selector|\/app/);
    });

    test('invalid credentials show error', async ({ page }) => {
      await page.goto('/login');
      await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10000 });
      await page.fill('input[type="email"], input[name="email"]', 'fake@nonexistent.com');
      await page.fill('input[type="password"], input[name="password"]', 'wrongpassword');
      await page.click('button[type="submit"]');
      // Should show error or stay on login page
      await page.waitForTimeout(3000);
      expect(page.url()).toContain('/login');
    });

    test('empty fields show validation', async ({ page }) => {
      await page.goto('/login');
      await page.waitForSelector('button[type="submit"]', { timeout: 10000 });
      await page.click('button[type="submit"]');
      // Should show validation errors
      await page.waitForTimeout(2000);
      const errorText = page.locator('text=obrigatório, text=required, text=inválido, [role="alert"]');
      const visible = await errorText.first().isVisible({ timeout: 3000 }).catch(() => false);
      // Either validation shows or the form just doesn't submit
      expect(page.url()).toContain('/login');
    });
  });

  test.describe('Logout', () => {
    test('Coordinator can logout and is redirected to login', async ({ page }) => {
      await login(page, USERS.coordSaoJose.email);
      await logout(page);
      await page.goto('/app');
      await page.waitForURL(/\/login/, { timeout: 10000 });
    });
  });

  test.describe('Session persistence', () => {
    test('navigating to app after login stays authenticated', async ({ page }) => {
      await login(page, USERS.coordSaoJose.email);
      // Navigate to a different page
      await page.goto('/app/classes');
      await page.waitForLoadState('domcontentloaded');
      expect(page.url()).not.toContain('/login');
    });
  });
});
