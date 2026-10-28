import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createInstance } from "i18next";

const root = join(process.cwd(), "src");

function readLocaleJson(relativePath: string): Record<string, unknown> {
  return JSON.parse(
    readFileSync(join(root, "i18n/locales", relativePath), "utf8"),
  ) as Record<string, unknown>;
}

describe("turmas baixa polish", () => {
  it("pluralizes enrolled counts in pt-BR", async () => {
    const classes = readLocaleJson("pt-BR/classes.json");
    const i18n = createInstance();
    await i18n.init({
      lng: "pt-BR",
      resources: { "pt-BR": { classes } },
      interpolation: { escapeValue: false },
    });
    expect(i18n.t("enrolled_count", { ns: "classes", count: 1 })).toBe(
      "1 inscrito",
    );
    expect(i18n.t("enrolled_count", { ns: "classes", count: 2 })).toBe(
      "2 inscritos",
    );
    expect(i18n.t("filter_all_count", { ns: "classes", count: 3 })).toBe(
      "Todas (3)",
    );
    expect(i18n.t("filter_all_capped", { ns: "classes", count: 50 })).toBe(
      "Todas (mais de 50)",
    );
    expect(i18n.t("location_not_informed", { ns: "classes" })).toBe(
      "Local não informado",
    );
    expect(i18n.t("enrolled_metric", { ns: "classes" })).toBe("Matriculados");
  });

  it("uses enrolled_count and filter_all keys on ClassesPage", () => {
    const page = readFileSync(
      join(root, "catequese/pages/ClassesPage.tsx"),
      "utf8",
    );
    expect(page).toContain('t("enrolled_count"');
    expect(page).toContain('t("filter_all_count"');
    expect(page).toContain('t("filter_all_capped"');
    expect(page).not.toContain("classes.length}+)");
    expect(page).not.toContain('t("enrolled").toLowerCase()');
  });

  it("resolves class location via helper on ClassDetailPage", () => {
    const page = readFileSync(
      join(root, "catequese/pages/ClassDetailPage.tsx"),
      "utf8",
    );
    expect(page).toContain("resolveClassLocationLabel");
    expect(page).toContain('t("location_not_informed")');
    expect(page).toContain('t("enrolled_metric")');
    expect(page).not.toContain("text-[11px]");
  });

  it("raises attendance matrix header contrast size", () => {
    const page = readFileSync(
      join(root, "catequese/pages/AttendancePage.tsx"),
      "utf8",
    );
    expect(page).not.toContain("text-[11px]");
    expect(page).toContain(
      "text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground",
    );
  });

  it("uses a clear bottom-nav short label for catechumens", () => {
    const navigation = readLocaleJson("pt-BR/navigation.json");
    expect(navigation.catechumens_short).toBe("Alunos");
    expect(String(navigation.catechumens_short).length).toBeLessThanOrEqual(10);
    expect(navigation.catechumens_short).not.toBe("Cateq.");
    const bottomNav = readFileSync(
      join(root, "catequese/BottomNav.tsx"),
      "utf8",
    );
    expect(bottomNav).toContain("fullLabel");
    expect(bottomNav).toContain("accessibleLabel");
  });

  it("CreateClassPage uses days_long for weekday options", () => {
    const page = readFileSync(
      join(root, "catequese/pages/CreateClassPage.tsx"),
      "utf8",
    );
    expect(page).toContain("days_long.${i}");
    expect(page).not.toContain("days.${i}");
  });
});
