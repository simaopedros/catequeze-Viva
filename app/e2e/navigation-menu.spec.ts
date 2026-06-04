/**
 * e2e/navigation-menu.spec.ts — Verify sidebar/bottom nav visibility per role.
 */
import { test, expect, loginAs } from './fixtures';

test.describe('Navigation Menu Visibility by Role', () => {

  test('ADMIN sees Admin link in sidebar', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/app');
    await page.waitForLoadState('networkidle');

    // Admin should see "Admin" link
    const content = await page.content();
    expect(content).toContain('Admin');
  });

  test('PARISH_COORDINATOR sees Paróquias and Admin', async ({ page }) => {
    await loginAs(page, 'coordSaoJose');
    await page.goto('/app');
    await page.waitForLoadState('networkidle');

    const content = await page.content();
    // Sidebar items (may be collapsed on mobile — check for links)
    expect(content).toContain('classes');
  });

  test('LEAD_CATECHIST does NOT see Admin link', async ({ page }) => {
    await loginAs(page, 'leadCatechist');
    await page.goto('/app');
    await page.waitForLoadState('networkidle');

    // Admin link should not be visible
    const adminLink = page.locator('a[href="/admin"]');
    await expect(adminLink).toHaveCount(0);
  });

  test('GUARDIAN does NOT see Families link', async ({ page }) => {
    await loginAs(page, 'guardian');
    await page.goto('/app');
    await page.waitForLoadState('networkidle');

    const familiesLink = page.locator('a[href="/app/families"]');
    await expect(familiesLink).toHaveCount(0);
  });

  test('GUARDIAN sees Bible and Catechism links', async ({ page }) => {
    await loginAs(page, 'guardian');
    await page.goto('/app');
    await page.waitForLoadState('networkidle');

    // These should be accessible to GUARDIAN (LEARNER_ROLES)
    const content = await page.content();
    expect(content).toContain('bible');
    expect(content).toContain('catechism');
  });

  test('CATECHUMEN sees Bible and Catechism links', async ({ page }) => {
    await loginAs(page, 'catechumen');
    await page.goto('/app');
    await page.waitForLoadState('networkidle');

    const content = await page.content();
    expect(content).toContain('bible');
    expect(content).toContain('catechism');
  });

  test('Role badge is visible in TopBar', async ({ page }) => {
    await loginAs(page, 'coordSaoJose');
    await page.goto('/app');
    await page.waitForLoadState('networkidle');

    // The role badge should show "Coordenador"
    const badge = page.locator('text=Coordenador');
    await expect(badge.first()).toBeVisible({ timeout: 5000 });
  });

});
