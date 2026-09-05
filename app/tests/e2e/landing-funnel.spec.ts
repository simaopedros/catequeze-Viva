/**
 * PR14 — Public landings: CTAs, pricing order signals, SPA meta, multi-viewport.
 */
import { test, expect, type Page } from "@playwright/test";
import { dismissCookieBanner, assertNoHorizontalOverflow } from "./helpers";

const LANDINGS = [
  { path: "/", campaign: "main", expectPricing: true },
  { path: "/ia", campaign: "ia", expectPricing: true },
  { path: "/presenca", campaign: "attendance", expectPricing: true },
  { path: "/sistema", campaign: "system", expectPricing: true },
] as const;

const VIEWPORTS = [
  { name: "phone-360", width: 360, height: 800 },
  { name: "phone-390", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
] as const;

async function openLanding(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("domcontentloaded");
  await dismissCookieBanner(page);
}

test.describe("landing funnel — meta and conversion surfaces", () => {
  for (const landing of LANDINGS) {
    test(`${landing.path} sets SPA title and campaign meta`, async ({
      page,
    }) => {
      await openLanding(page, landing.path);
      // SPA applyLandingRouteMeta
      await expect
        .poll(async () => page.title(), { timeout: 10000 })
        .not.toBe("");
      const title = await page.title();
      expect(title.toLowerCase()).toMatch(
        /catequese|trial|assistência|chamada|gestão|sistema/i,
      );

      const campaign = await page
        .locator('meta[name="catequese:campaign"]')
        .getAttribute("content");
      expect(campaign).toBe(landing.campaign);

      const desc = await page
        .locator('meta[name="description"]')
        .getAttribute("content");
      expect(desc && desc.length).toBeGreaterThan(20);
    });

    test(`${landing.path} primary CTA reaches signup`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await openLanding(page, landing.path);

      // Primary conversion control in hero (exclude secondary anchors)
      const cta = page
        .locator("[data-landing-hero] a[href^='/signup']")
        .first();
      await expect(cta).toBeVisible({ timeout: 15000 });
      await Promise.all([
        page.waitForURL(/\/signup|criar-conta/, { timeout: 15000 }),
        cta.click(),
      ]);
    });
  }

  test("home shows pricing section after value (id=planos)", async ({
    page,
  }) => {
    await openLanding(page, "/");
    const pricing = page.locator("#planos");
    await expect(pricing).toBeAttached({ timeout: 15000 });
    await pricing.scrollIntoViewIfNeeded();
    await expect(pricing).toBeVisible({ timeout: 10000 });
    const institutional = pricing.locator('a[href="/pricing"]');
    await expect(institutional).toBeVisible({ timeout: 10000 });
  });

  test("viewport meta never pins maximum-scale=1", async ({ page }) => {
    await openLanding(page, "/");
    const metas = page.locator('meta[name="viewport"]');
    const n = await metas.count();
    expect(n).toBeGreaterThan(0);
    for (let i = 0; i < n; i++) {
      const c = await metas.nth(i).getAttribute("content");
      expect(c || "").not.toMatch(/maximum-scale\s*=\s*1(\.0)?(\s|,|$)/i);
    }
  });
});

test.describe("landing multi-viewport smoke", () => {
  for (const vp of VIEWPORTS) {
    test(`home hero CTA visible @ ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await openLanding(page, "/");
      const hero = page.locator("[data-landing-hero]");
      await expect(hero).toBeVisible({ timeout: 15000 });
      const cta = page.locator("[data-landing-hero] a[href*='signup']").first();
      await expect(cta).toBeVisible();
      await assertNoHorizontalOverflow(page, 4);
    });
  }
});
