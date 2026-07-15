/**
 * PR11 — Mobile viewport smoke skeleton for family/portal-facing public + app shells.
 * Viewports: 320 / 360 / 390 / 430 (common phone widths).
 *
 * Soft checks only: no horizontal overflow on root, body paints, no crash.
 * Extend with authenticated guardian nav when portal seed users are available.
 */
import { test, expect, type Page } from "@playwright/test";

const VIEWPORTS = [
  { name: "320", width: 320, height: 568 },
  { name: "360", width: 360, height: 640 },
  { name: "390", width: 390, height: 844 },
  { name: "430", width: 430, height: 932 },
] as const;

async function assertNoHorizontalOverflow(page: Page) {
  const metrics = await page.evaluate(() => {
    const doc = document.documentElement;
    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      bodyScrollWidth: document.body?.scrollWidth ?? 0,
    };
  });
  // Allow 1px subpixel slack on some engines
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
  expect(metrics.bodyScrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 8);
}

for (const vp of VIEWPORTS) {
  test.describe(`portal viewport ${vp.name}px`, () => {
    test.use({
      viewport: { width: vp.width, height: vp.height },
      isMobile: true,
      hasTouch: true,
    });

    test("login page paints without horizontal overflow", async ({ page }) => {
      await page.goto("/login");
      await page.waitForLoadState("domcontentloaded");
      await expect(page.locator("body")).toBeVisible();
      await assertNoHorizontalOverflow(page);
    });

    test("invite route paints without horizontal overflow", async ({
      page,
    }) => {
      await page.goto("/convite/e2e-viewport-token");
      await page.waitForLoadState("domcontentloaded");
      await expect(page.locator("body")).toBeVisible();
      await assertNoHorizontalOverflow(page);
    });
  });
}
