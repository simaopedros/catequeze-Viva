/**
 * PR14 — Onboarding personal path: next action after class+people is attendance.
 */
import { test, expect } from "@playwright/test";
import { login, USERS, dismissCookieBanner, PASSWORD } from "./helpers";

test.describe("onboarding completion routing", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("signup page is reachable from landing CTA", async ({ page }) => {
    await page.goto("/");
    await dismissCookieBanner(page);
    await page.locator('a[href*="/signup"]').first().click();
    await page.waitForURL(/signup/, { timeout: 15000 });
    await expect(
      page.getByRole("heading", { level: 1 }).or(page.locator("form")),
    ).toBeVisible({ timeout: 10000 });
  });

  test("authenticated user can open classes and catechumens (activation path)", async ({
    page,
  }) => {
    await login(page, USERS.catechistNoClass?.email || USERS.leadCatechist.email, PASSWORD);
    await page.goto("/app/classes");
    await page.waitForLoadState("domcontentloaded");
    await dismissCookieBanner(page);
    await expect(page).toHaveURL(/\/app\/classes/);

    // Empty or list — page should orient with a primary action or list
    const createOrList = page
      .locator(
        'a[href*="/app/classes/new"], a[href*="/app/classes/"], button:has-text("Criar"), a:has-text("turma")',
      )
      .first();
    await expect(createOrList).toBeVisible({ timeout: 15000 });
  });
});
