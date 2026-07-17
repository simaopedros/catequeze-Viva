/**
 * PR1 — A11y baseline: viewport allows zoom; mobile More sheet is dialog-backed.
 *
 * Zoom at 200% is a manual/CSS check; Playwright asserts the meta does not
 * pin maximum-scale so browsers can scale.
 * Also checks reduced-motion media query is honored by layout (no crash).
 */
import { test, expect } from "@playwright/test";
import {
  login,
  USERS,
  enterFirstWorkspace,
  assertNoHorizontalOverflow,
  dismissCookieBanner,
  bottomMoreButton,
} from "./helpers";

test.describe("a11y viewport and bottom sheet", () => {
  test("public page viewport meta allows user scaling", async ({ page }) => {
    await page.goto("/");
    // Wasp injects a default viewport meta; app head also declares one.
    const metas = page.locator('meta[name="viewport"]');
    const count = await metas.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const content = await metas.nth(i).getAttribute("content");
      expect(content).toBeTruthy();
      // Blocks pinch-zoom to 200% — must not appear on any viewport meta.
      expect(content!).not.toMatch(/maximum-scale\s*=\s*1(\.0)?(\s|,|$)/i);
    }
    const joined = (
      await Promise.all(
        Array.from({ length: count }, (_, i) =>
          metas.nth(i).getAttribute("content"),
        ),
      )
    ).join(" ");
    expect(joined).toMatch(/width\s*=\s*device-width/i);
  });

  test("mobile More opens accessible sheet with focus and Escape", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page, USERS.leadCatechist.email);

    const moreButton = bottomMoreButton(page);
    await expect(moreButton).toBeVisible({ timeout: 15000 });
    await moreButton.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Radix Sheet focuses the close control on open
    await expect(
      page.locator('[data-slot="sheet-content"] button').first(),
    ).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(moreButton).toBeFocused();
  });

  test("app viewport meta still allows scaling after login", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page, USERS.leadCatechist.email);
    await page.goto("/app");
    await page.waitForLoadState("domcontentloaded");

    const metas = page.locator('meta[name="viewport"]');
    const count = await metas.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const content = await metas.nth(i).getAttribute("content");
      expect(content!).not.toMatch(/maximum-scale\s*=\s*1(\.0)?(\s|,|$)/i);
    }
  });

  test("app shell has no horizontal overflow at 320px", async ({ page }) => {
    // Login at a stable phone size, then shrink (avoids login form layout races at 320)
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page, USERS.leadCatechist.email);
    await enterFirstWorkspace(page);
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto("/app");
    await page.waitForLoadState("domcontentloaded");
    await dismissCookieBanner(page);
    await page.waitForTimeout(400);
    await assertNoHorizontalOverflow(page, 8);
  });

  test("prefers-reduced-motion does not break dashboard", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page, USERS.leadCatechist.email);
    await enterFirstWorkspace(page);
    await page.goto("/app");
    await page.waitForLoadState("domcontentloaded");
    await dismissCookieBanner(page);
    await expect(page.locator("#main-content, main").first()).toBeVisible({
      timeout: 15000,
    });
    await assertNoHorizontalOverflow(page, 4);
  });
});
