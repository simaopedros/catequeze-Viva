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

/** Home sections mount as the visitor scrolls, so scroll like one. */
async function scrollHomeUntilAttached(page: Page, selector: string) {
  const target = page.locator(selector);
  for (let i = 0; i < 40 && (await target.count()) === 0; i++) {
    await page.evaluate(() =>
      window.scrollBy(0, Math.round(window.innerHeight * 0.8)),
    );
    await page.waitForTimeout(150);
  }
  await expect(target).toBeAttached();
  await target.scrollIntoViewIfNeeded();
  return target;
}

/** Overflow from the home's own art; the shared navbar is covered elsewhere. */
async function assertHomeContentFits(page: Page) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.querySelector(".home-root")?.scrollWidth ?? 0,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 4);
}

async function expectSectionAtTop(page: Page, id: string) {
  await expect
    .poll(
      () =>
        page.evaluate((sectionId) => {
          const top = document
            .getElementById(sectionId)
            ?.getBoundingClientRect().top;
          return top !== undefined && top >= 0 && top < 160;
        }, id),
      { timeout: 10000 },
    )
    .toBe(true);
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
    const pricing = await scrollHomeUntilAttached(page, "#planos");
    await expect(pricing).toBeVisible({ timeout: 10000 });
    await expect(pricing.locator('a[href*="plan=single"]')).toBeVisible({
      timeout: 10000,
    });
    await expect(pricing.locator('a[href*="plan=unlimited"]')).toBeVisible();
    await expect(
      pricing.locator("#planos-diocese a[href*='wa.me']"),
    ).toBeVisible();
    await expect(pricing.locator('a[href="/pricing"]')).toHaveCount(0);
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

const HOME_MOTION_VIEWPORTS = [
  ...VIEWPORTS,
  { name: "short-laptop", width: 1024, height: 600 },
] as const;

test.describe("home motion — reduced motion and layout", () => {
  test.use({ reducedMotion: "reduce" });

  for (const vp of HOME_MOTION_VIEWPORTS) {
    test(`home content is reachable with reduced motion @ ${vp.name}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await openLanding(page, "/");

      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(
        page.locator("[data-landing-hero] a[href^='/signup']").first(),
      ).toBeVisible();

      const pricing = await scrollHomeUntilAttached(page, "#planos");
      await expect(pricing).toBeVisible({ timeout: 15000 });

      await assertHomeContentFits(page);
    });
  }

  test("each how-it-works step heading becomes visible on scroll", async ({
    page,
  }) => {
    await openLanding(page, "/");
    const how = await scrollHomeUntilAttached(page, "#como");
    await expect(
      how.getByRole("heading", { name: /Da preparação ao acompanhamento/ }),
    ).toBeVisible({ timeout: 15000 });

    const steps = how.locator(".home-how-step h3");
    await expect(steps).toHaveCount(3);
    for (let i = 0; i < 3; i++) {
      const step = steps.nth(i);
      await step.scrollIntoViewIfNeeded();
      await expect(step).toBeVisible();
    }
  });
});

test.describe("home anchors reach sections that mount lazily", () => {
  test("hero secondary CTA jumps to how it works", async ({ page }) => {
    await openLanding(page, "/");
    await page.locator("[data-landing-hero] a[href='/#como']").click();
    await expectSectionAtTop(page, "como");
  });

  test("navbar plans link jumps to pricing before any scroll", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openLanding(page, "/");
    await page.locator('nav a[href="/#planos"]').first().click();
    await expectSectionAtTop(page, "planos");
  });

  test("deep link /#planos opens on pricing", async ({ page }) => {
    await openLanding(page, "/#planos");
    await expectSectionAtTop(page, "planos");
  });
});
