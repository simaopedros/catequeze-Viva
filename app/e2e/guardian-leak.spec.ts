/**
 * e2e/guardian-leak.spec.ts — Verify GUARDIAN doesn't see admin buttons in the UI.
 */
import { test, expect, loginAs } from './fixtures';

test.describe('GUARDIAN UI — No Admin Controls', () => {

  test('does NOT see "Editar turma" button on class page', async ({ page }) => {
    await loginAs(page, 'guardian');
    await page.goto('/app/classes/test-class-crisma-001');
    await page.waitForLoadState('networkidle');

    // Should see class name
    const content = await page.content();
    expect(content).toContain('Crisma');

    // Should NOT see admin buttons
    const editButton = page.locator('button:has-text("Editar turma")');
    await expect(editButton).toHaveCount(0);
  });

  test('does NOT see status change buttons', async ({ page }) => {
    await loginAs(page, 'guardian');
    await page.goto('/app/classes/test-class-crisma-001');
    await page.waitForLoadState('networkidle');

    // Should NOT see Pausar/Concluir/Ativar buttons
    const pauseBtn = page.locator('button:has-text("Pausar")');
    await expect(pauseBtn).toHaveCount(0);
  });

  test('does NOT see "Gerenciar encontros" button', async ({ page }) => {
    await loginAs(page, 'guardian');
    await page.goto('/app/classes/test-class-crisma-001');
    await page.waitForLoadState('networkidle');

    const manageMeetings = page.locator('text=Gerenciar encontros');
    await expect(manageMeetings).toHaveCount(0);
  });

  test('does NOT see add catechist section', async ({ page }) => {
    await loginAs(page, 'guardian');
    await page.goto('/app/classes/test-class-crisma-001');
    await page.waitForLoadState('networkidle');

    // Click "Catequistas" tab
    const tab = page.locator('button:has-text("Catequistas")');
    if (await tab.count() > 0) await tab.first().click();
    await page.waitForTimeout(500);

    const addBtn = page.locator('button:has-text("Adicionar catequista")');
    await expect(addBtn).toHaveCount(0);
  });

  test('does NOT see "Matricular" buttons', async ({ page }) => {
    await loginAs(page, 'guardian');
    await page.goto('/app/classes/test-class-crisma-001');
    await page.waitForLoadState('networkidle');

    const enrollBtn = page.locator('button:has-text("Matricular")');
    await expect(enrollBtn).toHaveCount(0);
  });

});

test.describe('LEAD_CATECHIST UI — Has Admin Controls', () => {

  test('sees "Adicionar catequista" button', async ({ page }) => {
    await loginAs(page, 'leadCatechist');
    await page.goto('/app/classes/test-class-crisma-001');
    await page.waitForLoadState('networkidle');

    // Click catechists tab
    const tab = page.locator('button:has-text("Catequistas")');
    if (await tab.count() > 0) await tab.first().click();
    await page.waitForTimeout(500);

    const addBtn = page.locator('button:has-text("Adicionar catequista")');
    await expect(addBtn).toBeVisible({ timeout: 5000 });
  });

});

test.describe('ASSISTANT_CATECHIST UI — Limited Controls', () => {

  test('does NOT see "Adicionar catequista"', async ({ page }) => {
    await loginAs(page, 'assistantCatechist');
    await page.goto('/app/classes/test-class-crisma-001');
    await page.waitForLoadState('networkidle');

    const tab = page.locator('button:has-text("Catequistas")');
    if (await tab.count() > 0) await tab.first().click();
    await page.waitForTimeout(500);

    const addBtn = page.locator('button:has-text("Adicionar catequista")');
    await expect(addBtn).toHaveCount(0);
  });

});
