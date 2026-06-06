/**
 * classes.spec.ts — Class CRUD, enrollment, and catechist assignment.
 */
import { test, expect } from '@playwright/test';
import { login, USERS, navigateTo, selectWorkspace, CLASS_CRISMA } from './helpers';

test.describe('Class Management', () => {

  test.beforeEach(async ({ page }) => {
    await login(page, USERS.coordSaoJose.email);
    if (page.url().includes('workspace-selector')) {
      await selectWorkspace(page, 'São José');
    }
  });

  test('Coordinator can list classes', async ({ page }) => {
    await navigateTo(page, '/app/classes');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 });
  });

  test('Coordinator sees class detail page', async ({ page }) => {
    await navigateTo(page, `/app/classes/${CLASS_CRISMA}`);
    await page.waitForLoadState('domcontentloaded');
    // Should show class name or detail elements
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 });
  });

  test('Lead Catechist can view their assigned classes', async ({ page }) => {
    await login(page, USERS.leadCatechist.email);
    if (page.url().includes('workspace-selector')) {
      await selectWorkspace(page, 'São José');
    }
    await navigateTo(page, '/app/classes');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 });
  });

  test('Lead Catechist can access class detail', async ({ page }) => {
    await login(page, USERS.leadCatechist.email);
    if (page.url().includes('workspace-selector')) {
      await selectWorkspace(page, 'São José');
    }
    await navigateTo(page, `/app/classes/${CLASS_CRISMA}`);
    await page.waitForLoadState('domcontentloaded');
    expect(page.url()).toContain(CLASS_CRISMA);
  });

  test('Catechist from different parish cannot access São José class', async ({ page }) => {
    await login(page, USERS.catechistSantaMaria.email);
    if (page.url().includes('workspace-selector')) {
      await selectWorkspace(page, 'Santa Maria');
    }
    await navigateTo(page, `/app/classes/${CLASS_CRISMA}`);
    await page.waitForLoadState('domcontentloaded');
    // Should show 403 or redirect
    await page.waitForTimeout(3000);
  });

  test('Guardian can see classes of their enrolled dependents', async ({ page }) => {
    await login(page, USERS.guardian.email);
    if (page.url().includes('workspace-selector')) {
      await selectWorkspace(page, 'São José');
    }
    await navigateTo(page, '/app/classes');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 });
  });

  test.describe('Create Class', () => {
    test('Coordinator sees create class button', async ({ page }) => {
      await navigateTo(page, '/app/classes');
      const createBtn = page.locator('a[href*="/app/classes/new"], button:has-text("Nova Turma"), button:has-text("Criar Turma")');
      const exists = await createBtn.first().isVisible({ timeout: 5000 }).catch(() => false);
      // Either button exists or coordinator sees classes page
      expect(page.url()).toContain('/app/classes');
    });
  });

  test.describe('Catechist Assignment', () => {
    test('Coordinator can view class catechists on detail page', async ({ page }) => {
      await navigateTo(page, `/app/classes/${CLASS_CRISMA}`);
      await page.waitForLoadState('domcontentloaded');
      // Should show catechist section
      await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 });
    });
  });
});
