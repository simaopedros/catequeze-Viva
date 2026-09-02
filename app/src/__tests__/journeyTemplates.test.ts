import { describe, expect, it } from "vitest";
import {
  flattenJourneyTemplateCatalog,
  planMissingGlobalTemplates,
} from "../server/scripts/seedJourneyTemplatesLib.mjs";

describe("global journey template seed plan", () => {
  it("expects 5 sacraments across 3 locales", () => {
    const catalog = flattenJourneyTemplateCatalog();
    expect(catalog).toHaveLength(15);
    expect(catalog.filter((row) => row.locale === "pt-BR")).toHaveLength(5);
    expect(
      catalog.some((row) => row.name === "Preparação para a Confissão"),
    ).toBe(true);
  });

  it("does not re-seed templates that already exist globally", () => {
    const existing = flattenJourneyTemplateCatalog()
      .filter((row) => row.locale === "pt-BR")
      .map((row) => ({ name: row.name, locale: row.locale, parishId: null }));
    const missing = planMissingGlobalTemplates(existing);
    expect(missing.every((row) => row.locale !== "pt-BR")).toBe(true);
    expect(missing).toHaveLength(10);
  });

  it("ignores parish-owned templates when deciding what is missing", () => {
    const catalog = flattenJourneyTemplateCatalog();
    const parishOwned = catalog.map((row) => ({
      name: row.name,
      locale: row.locale,
      parishId: "parish-1",
    }));
    expect(planMissingGlobalTemplates(parishOwned)).toHaveLength(15);
  });
});
