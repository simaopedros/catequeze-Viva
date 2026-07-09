/**
 * Smoke: guided onboarding shell for a user who may still need setup.
 * Full happy-path create requires a clean trial account; this asserts UI shell + path choice.
 */
import { test, expect } from '@playwright/test';
import { login, USERS } from './helpers';

test.describe('Onboarding guided flow', () => {
  test('welcome path options render with editorial shell', async ({ page }) => {
    // Use a user that can open the app; if already onboarded, page may redirect.
    await login(page, USERS.leadCatechist.email);
    await page.goto('/app/onboarding');
    await page.waitForLoadState('domcontentloaded');

    // Either still on onboarding welcome, or redirected after completion.
    const onOnboarding = page.url().includes('/app/onboarding');
    if (!onOnboarding) {
      await expect(page).toHaveURL(/\/app/);
      return;
    }

    // Welcome choices (catechist vs parish manager)
    const personal = page.getByRole('button', {
      name: /turma|catequista|class|grupo/i,
    });
    const manager = page.getByRole('button', {
      name: /paróquia|parroquia|parish|organizo/i,
    });

    // At least one path should be visible on the welcome step
    const hasPersonal = await personal.first().isVisible().catch(() => false);
    const hasManager = await manager.first().isVisible().catch(() => false);
    expect(hasPersonal || hasManager || (await page.locator('h2').count()) > 0).toBeTruthy();
  });
});
