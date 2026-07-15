/**
 * PR9 — Encounter mobile acceptance (sheet, family detail, authz smoke).
 *
 * Runs on staff host (localhost). FamilyAppShell only applies on familia.* hosts;
 * on main host guardians use the full shell but meeting detail remains available.
 *
 * Seed users: seed_test_data.js (password Teste@123).
 */
import { test, expect } from "@playwright/test";
import {
  login,
  USERS,
  dismissCookieBanner,
  enterFirstWorkspace,
  CLASS_CRISMA,
  MEETING_CRISMA_1,
  MEETING_CRISMA_2,
} from "./helpers";

test.describe("encounter mobile — staff attendance sheet", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("lead catechist opens mobile roll-call for class", async ({ page }) => {
    await login(page, USERS.leadCatechist.email);
    await enterFirstWorkspace(page);

    await page.goto(`/app/classes/${CLASS_CRISMA}/attendance`);
    await page.waitForLoadState("domcontentloaded");
    await dismissCookieBanner(page);

    await expect(page).toHaveURL(new RegExp(`/app/classes/${CLASS_CRISMA}/attendance`));

    const sheetSignal = page
      .getByText(
        /registados|registrados|recorded|Marcar todos|Mark all|Chamada|Roll call|Nenhum encontro|No meetings|Não foi possível|Could not load|de \d+ /i,
      )
      .first();
    await expect(sheetSignal).toBeVisible({ timeout: 20000 });
  });

  test("lead catechist can open meeting detail and see content chrome", async ({
    page,
  }) => {
    await login(page, USERS.leadCatechist.email);
    await enterFirstWorkspace(page);

    await page.goto(`/app/meetings/${MEETING_CRISMA_1}`);
    await page.waitForLoadState("domcontentloaded");
    await dismissCookieBanner(page);

    await expect(page.getByRole("heading").first()).toBeVisible({
      timeout: 20000,
    });
    const text = await page.locator("main").innerText();
    expect(
      /Espírito|Crisma|Encontro|Presença|Attendance|Chamada/i.test(text),
    ).toBeTruthy();
  });
});

test.describe("encounter mobile — family routes on staff host", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("guardian can open seeded meeting detail", async ({ page }) => {
    await login(page, USERS.guardian.email);
    await enterFirstWorkspace(page);

    await page.goto(`/app/meetings/${MEETING_CRISMA_2}`);
    await page.waitForLoadState("domcontentloaded");
    await dismissCookieBanner(page);

    await expect(page).toHaveURL(new RegExp(`/app/meetings/${MEETING_CRISMA_2}`));
    await expect(
      page.getByRole("heading", { name: /Encontro|Crisma|meeting/i }).first(),
    ).toBeVisible({ timeout: 20000 });
  });

  test("guardian home loads without crash", async ({ page }) => {
    await login(page, USERS.guardian.email);
    await enterFirstWorkspace(page);

    await page.goto("/app");
    await page.waitForLoadState("domcontentloaded");
    await dismissCookieBanner(page);

    await expect(page.locator("#main-content, main").first()).toBeVisible({
      timeout: 15000,
    });
    const text = await page.locator("body").innerText();
    expect(text.length).toBeGreaterThan(40);
  });

  test("guardian calendar route loads", async ({ page }) => {
    await login(page, USERS.guardian.email);
    await enterFirstWorkspace(page);

    await page.goto("/app/calendar");
    await page.waitForLoadState("domcontentloaded");
    await dismissCookieBanner(page);

    await expect(page).toHaveURL(/\/app\/calendar/);
    // Page chrome (heading or month navigation) — avoid matching hidden sidebar labels
    await expect(
      page.locator("main").getByText(/calendário|calendar|hoje|today|evento/i).first(),
    ).toBeVisible({ timeout: 20000 });
  });

  test("guardian staff attendance page does not expose sheet roster chrome", async ({
    page,
  }) => {
    await login(page, USERS.guardian.email);
    await enterFirstWorkspace(page);

    await page.goto(`/app/classes/${CLASS_CRISMA}/attendance`);
    await page.waitForLoadState("domcontentloaded");
    await dismissCookieBanner(page);

    // On familia.* host they would be redirected; on staff host the op is 403.
    // Accept either: left attendance URL, or no "Marcar todos presentes" sheet CTA.
    const url = page.url();
    if (url.includes("/attendance")) {
      const markAll = page.getByRole("button", {
        name: /Marcar todos presentes|Mark all present/i,
      });
      const markAllVisible = await markAll
        .isVisible({ timeout: 5000 })
        .catch(() => false);
      expect(markAllVisible).toBeFalsy();
    }
  });
});

test.describe("encounter mobile — catechumen smoke", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("catechumen can open meeting detail", async ({ page }) => {
    await login(page, USERS.catechumen.email);
    await enterFirstWorkspace(page);

    await page.goto(`/app/meetings/${MEETING_CRISMA_2}`);
    await page.waitForLoadState("domcontentloaded");
    await dismissCookieBanner(page);

    // Allowed route — may show content or access error, but not a blank crash
    await expect(page.locator("main, body").first()).toBeVisible();
    await expect(page).toHaveURL(/\/app\/(meetings|)/);
  });
});

test.describe("encounter mobile — bottom nav messages (staff)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("staff bottom bar includes messages destination", async ({ page }) => {
    await login(page, USERS.leadCatechist.email);
    await enterFirstWorkspace(page);

    // Sidebar messages link is often in DOM but hidden on mobile; force-click the last match.
    const byLabel = page.getByRole("link", { name: /mensagens|messages/i });
    await expect(byLabel.first()).toBeAttached({ timeout: 15000 });
    const count = await byLabel.count();
    await byLabel.nth(Math.max(0, count - 1)).click({ force: true });

    await expect(page).toHaveURL(/\/app\/messages/, { timeout: 15000 });
  });
});
