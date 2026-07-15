/**
 * PR14 — Personal vs institutional nav parity (desktop sidebar + mobile bottom).
 */
import { test, expect } from "@playwright/test";
import { login, USERS, dismissCookieBanner } from "./helpers";

async function enterFirstWorkspace(page: import("@playwright/test").Page) {
  if (page.url().includes("workspace") || page.url().includes("select")) {
    const btn = page
      .locator(
        'button:has-text("Catequese"), button:has-text("Meu Espaço"), button:has-text("São José"), a:has-text("Entrar")',
      )
      .first();
    if (await btn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await btn.click();
      await page.waitForURL(/\/app/, { timeout: 15000 }).catch(() => {});
    }
  }
  await page.goto("/app");
  await page.waitForLoadState("domcontentloaded");
  await dismissCookieBanner(page);
}

test.describe("nav parity desktop", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("lead catechist sees core destinations in sidebar", async ({ page }) => {
    await login(page, USERS.leadCatechist.email);
    await enterFirstWorkspace(page);

    const sidebar = page.locator("aside").first();
    await expect(sidebar).toBeVisible({ timeout: 15000 });

    // Core items present as links
    for (const href of ["/app", "/app/classes", "/app/catechumens"]) {
      await expect(
        page.locator(`aside a[href="${href}"]`).first(),
      ).toBeVisible({ timeout: 10000 });
    }
  });
});

test.describe("nav parity mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("bottom bar has at most 4 primary slots + More", async ({ page }) => {
    await login(page, USERS.leadCatechist.email);
    await enterFirstWorkspace(page);

    const nav = page.locator("nav").filter({ has: page.getByRole("button", { name: /mais|more/i }) });
    await expect(nav).toBeVisible({ timeout: 15000 });

    const primaryLinks = nav.locator("a");
    const count = await primaryLinks.count();
    // Max 4 destinations + More is a button, not a link
    expect(count).toBeLessThanOrEqual(4);

    const more = page.getByRole("button", { name: /mais|more/i });
    await more.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });
});
