import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createInstance } from "i18next";
import { displayDateToIso, isoToDisplayDate } from "../shared/displayDate";

const root = join(process.cwd(), "src");

function readLocaleJson(relativePath: string): Record<string, unknown> {
  return JSON.parse(
    readFileSync(join(root, "i18n/locales", relativePath), "utf8"),
  ) as Record<string, unknown>;
}

describe("copy and a11y polish (audit round 2)", () => {
  it("uses a proper mobile short label for catechumens", () => {
    const navigation = readLocaleJson("pt-BR/navigation.json");
    expect(navigation.catechumens_short).not.toBe("Quizandos");
    expect(String(navigation.catechumens_short).length).toBeLessThanOrEqual(10);
  });

  it("uses gender-neutral see_all copy on the dashboard", () => {
    const dashboard = readLocaleJson("pt-BR/dashboard.json");
    expect(dashboard.see_all).toBe("Ver todos");
  });

  it("pluralizes zero registered families and catechumens", async () => {
    const ptCommon = readLocaleJson("pt-BR/common.json");
    const i18n = createInstance();
    await i18n.init({
      lng: "pt-BR",
      resources: {
        "pt-BR": {
          common: ptCommon,
        },
      },
      interpolation: { escapeValue: false },
    });

    expect(i18n.t("families.subtitle_registered", { ns: "common", count: 0 })).toBe(
      "Nenhuma família cadastrada",
    );
    expect(
      i18n.t("catechumens.subtitle_registered", { ns: "common", count: 0 }),
    ).toBe("Nenhum catequizando cadastrado");
    expect(i18n.t("documents.rejected", { ns: "common" })).toBe("Rejeitados");
  });

  it("formats pt dates as dd/mm/aaaa", () => {
    expect(isoToDisplayDate("2026-03-15", "pt-BR")).toBe("15/03/2026");
    expect(displayDateToIso("15/03/2026", "pt-BR")).toBe("2026-03-15");
  });

  it("keeps LocalizedDateInput on catechumen forms instead of native date", () => {
    const createPage = readFileSync(
      join(root, "catequese/pages/CreateCatechumenPage.tsx"),
      "utf8",
    );
    const editPage = readFileSync(
      join(root, "catequese/pages/EditCatechumenPage.tsx"),
      "utf8",
    );
    expect(createPage).toContain("LocalizedDateInput");
    expect(editPage).toContain("LocalizedDateInput");
    expect(createPage).not.toMatch(/name="birthDate"[\s\S]*type="date"/);
    expect(editPage).not.toMatch(/birthDate[\s\S]*type="date"/);
  });

  it("shows full author name on content library cards", () => {
    const page = readFileSync(
      join(root, "catequese/pages/ContentLibraryPage.tsx"),
      "utf8",
    );
    expect(page).toContain("getPersonFullName(item.createdBy)");
    expect(page).not.toContain("createdBy?.firstName");
  });
});
