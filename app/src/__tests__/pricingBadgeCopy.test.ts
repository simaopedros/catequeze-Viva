import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("pricing plan badge copy", () => {
  it("uses parish-specific badge text for Plano Paróquia on /pricing", () => {
    const page = readFileSync(
      resolve(__dirname, "../catequese/pages/PricingPage.tsx"),
      "utf8",
    );
    expect(page).toContain("pricing.badge_parish");
    expect(page).toContain('plan.planId === "unlimited"');
  });

  it("keeps localized badge strings in all languages", () => {
    for (const lang of ["pt-BR", "en", "es"]) {
      const json = JSON.parse(
        readFileSync(
          resolve(__dirname, `../i18n/locales/${lang}/public.json`),
          "utf8",
        ),
      );
      expect(json.pricing.badge_parish.length).toBeGreaterThan(3);
      expect(json.pricing.badge_catechist.length).toBeGreaterThan(3);
      // Parish badge must not reuse the catechist slogan.
      expect(json.pricing.badge_parish).not.toEqual(
        json.pricing.badge_catechist,
      );
    }
  });
});
