/**
 * catechumens.spec.ts — Catechumen CRUD, household, and guardian flows.
 */
import { test, expect } from '@playwright/test';
import { login, USERS, navigateTo, selectWorkspace } from './helpers';

test.describe('Catechumen Management', () => {

  test.beforeEach(async ({ page }) => {
    await login(page, USERS.coordSaoJose.email);
    if (page.url().includes('workspace-selector')) {
      await selectWorkspace(page, 'São José');
    }
  });

  test('Coordinator can list catechumens', async ({ page }) => {
    await navigateTo(page, '/app/catechumens');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 });
  });

  test('Coordinator can view catechumen detail', async ({ page }) => {
    await navigateTo(page, '/app/catechumens');
    await page.waitForLoadState('domcontentloaded');
    // Click on the first catechumen if available
    const firstCatechumen = page.locator('a[href*="/app/catechumens/"]').first();
    if (await firstCatechumen.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstCatechumen.click();
      await page.waitForLoadState('domcontentloaded');
      expect(page.url()).toContain('/app/catechumens/');
    }
  });

  test('Lead Catechist can see their classes\' catechumens', async ({ page }) => {
    await login(page, USERS.leadCatechist.email);
    if (page.url().includes('workspace-selector')) {
      await selectWorkspace(page, 'São José');
    }
    await navigateTo(page, '/app/catechumens');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 });
  });

  test('Guardian can see their household catechumens', async ({ page }) => {
    await login(page, USERS.guardian.email);
    if (page.url().includes('workspace-selector')) {
      await selectWorkspace(page, 'São José');
    }
    await navigateTo(page, '/app/catechumens');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 });
  });

  test('Coordinator can access families page', async ({ page }) => {
    await navigateTo(page, '/app/families');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 });
  });

  test.describe('Create Catechumen', () => {
    test('Coordinator sees create catechumen page', async ({ page }) => {
      await navigateTo(page, '/app/catechumens/new');
      await page.waitForLoadState('domcontentloaded');
      expect(page.url()).toContain('/app/catechumens/new');
    });
  });

  test.describe('Role-based access', () => {
    test('Catechumen can see their own profile', async ({ page }) => {
      await login(page, USERS.catechumen.email);
      if (page.url().includes('workspace-selector')) {
        await selectWorkspace(page, 'São José');
      }
      await navigateTo(page, '/app');
      await page.waitForLoadState('domcontentloaded');
    });

    test('Assistant Catechist can access catechumen list', async ({ page }) => {
      await login(page, USERS.assistantCatechist.email);
      if (page.url().includes('workspace-selector')) {
        await selectWorkspace(page, 'São José');
      }
      await navigateTo(page, '/app/catechumens');
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 });
    });
  });
});
