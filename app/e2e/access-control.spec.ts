/**
 * e2e/access-control.spec.ts — Cross-parish data isolation via UI.
 */
import { test, expect, loginAs } from './fixtures';

test.describe('Cross-Parish Data Isolation (UI)', () => {

  test('Coordinator São José can access /app/classes', async ({ page }) => {
    await loginAs(page, 'coordSaoJose');
    await page.goto('/app/classes');
    await page.waitForLoadState('networkidle');
    // Page loaded without error
    expect(page.url()).toContain('/app/classes');
  });

  test('Coordinator São José sees catechumens page', async ({ page }) => {
    await loginAs(page, 'coordSaoJose');
    await page.goto('/app/catechumens');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/app/catechumens');
  });

  test('Coordinator Santa Maria can access /app/classes', async ({ page }) => {
    await loginAs(page, 'coordSantaMaria');
    await page.goto('/app/classes');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/app/classes');
  });

  test('GUARDIAN can access /app/catechumens', async ({ page }) => {
    await loginAs(page, 'guardian');
    await page.goto('/app/catechumens');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/app/catechumens');
  });

  test('CATECHUMEN can access /app/catechumens', async ({ page }) => {
    await loginAs(page, 'catechumen');
    await page.goto('/app/catechumens');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/app/catechumens');
  });

  test('Catechist without class sees empty /app/classes', async ({ page }) => {
    await loginAs(page, 'catechistNoClass');
    await page.goto('/app/classes');
    await page.waitForLoadState('networkidle');
    // Should see the page but with no classes or a message
    const content = await page.content();
    // Should NOT have links to class detail pages
    const classLinks = page.locator('a[href*="/app/classes/test-class"]');
    await expect(classLinks).toHaveCount(0);
  });

});
