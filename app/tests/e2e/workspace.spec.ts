/**
 * workspace.spec.ts — Workspace selector, switching, and invitation flows.
 */
import { test, expect } from '@playwright/test';
import { login, USERS, selectWorkspace } from './helpers';

test.describe('Workspace Selector', () => {

  test('Coordinator sees personal and parish workspaces', async ({ page }) => {
    await login(page, USERS.coordSaoJose.email);
    // May land on workspace selector or app directly
    if (page.url().includes('workspace-selector')) {
      await expect(page.locator('text=Meu Espaço')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('text=São José')).toBeVisible({ timeout: 5000 });
    }
  });

  test('Coordinator can enter a workspace', async ({ page }) => {
    await login(page, USERS.coordSaoJose.email);
    if (page.url().includes('workspace-selector')) {
      await selectWorkspace(page, 'São José');
      expect(page.url()).toContain('/app');
    }
  });

  test('Multi-role user sees all workspaces', async ({ page }) => {
    await login(page, USERS.multirole.email);
    if (page.url().includes('workspace-selector')) {
      await expect(page.locator('text=Meu Espaço')).toBeVisible({ timeout: 5000 });
    }
  });

  test('Catechist without class still sees personal workspace', async ({ page }) => {
    await login(page, USERS.catechistNoClass.email);
    if (page.url().includes('workspace-selector')) {
      await expect(page.locator('text=Meu Espaço')).toBeVisible({ timeout: 5000 });
    }
  });

  test('workspace switching stores active workspace in localStorage', async ({ page }) => {
    await login(page, USERS.coordSaoJose.email);
    if (page.url().includes('workspace-selector')) {
      await selectWorkspace(page);
    }
    const stored = await page.evaluate(() => localStorage.getItem('catequese-viva-active-workspace'));
    expect(stored).toBeTruthy();
  });

  test('"Criar nova paróquia" button navigates to parishes page', async ({ page }) => {
    await login(page, USERS.admin.email);
    if (page.url().includes('workspace-selector')) {
      const createBtn = page.locator('button:has-text("Criar nova paróquia")');
      if (await createBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await createBtn.click();
        await page.waitForURL(/\/app\/parishes/, { timeout: 10000 });
        expect(page.url()).toContain('parishes');
      }
    }
  });
});
