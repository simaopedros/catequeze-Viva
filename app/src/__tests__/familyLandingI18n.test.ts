import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import i18next from "i18next";
import { resources_pt_BR_core } from "../i18n/resources_pt_BR_core";

/** Keys FamilyLandingPage asks i18n for (ns: family). */
const LANDING_KEYS = [
  "portal_badge",
  "app_name",
  "landing.tagline",
  "landing.invite_title",
  "landing.invite_desc",
  "landing.enter",
  "landing.have_invite",
  "landing.insert_code",
  "landing.staff_hint",
  "landing.main_portal",
] as const;

describe("family landing i18n (public portal)", () => {
  it("keeps family in the sync core bundle (not the lazy app split)", () => {
    expect(Object.keys(resources_pt_BR_core)).toContain("family");
    const family = resources_pt_BR_core.family as {
      portal_badge: string;
      app_name: string;
      landing: { tagline: string; enter: string };
    };
    expect(family.portal_badge).toBe("Portal da Família");
    expect(family.app_name).toBe("Catechis");
    expect(family.landing.tagline.length).toBeGreaterThan(0);
    expect(family.landing.enter.length).toBeGreaterThan(0);
  });

  it("resolves FamilyLandingPage copy from core alone (no raw landing. keys)", async () => {
    const isolated = i18next.createInstance();
    await isolated.init({
      lng: "pt-BR",
      fallbackLng: "pt-BR",
      resources: { "pt-BR": resources_pt_BR_core },
      ns: Object.keys(resources_pt_BR_core),
      defaultNS: "common",
      interpolation: { escapeValue: false },
    });

    for (const key of LANDING_KEYS) {
      const value = isolated.t(key, { ns: "family" });
      expect(value, key).not.toBe(key);
      expect(value, key).not.toMatch(/^landing\./);
      expect(typeof value).toBe("string");
      expect(value.length, key).toBeGreaterThan(0);
    }
  });

  it("FamilyLandingPage only references keys present in family.json", () => {
    const page = readFileSync(
      resolve(__dirname, "../catequese/pages/family/FamilyLandingPage.tsx"),
      "utf8",
    );
    const locale = JSON.parse(
      readFileSync(
        resolve(__dirname, "../i18n/locales/pt-BR/family.json"),
        "utf8",
      ),
    ) as Record<string, unknown>;

    const used = [...page.matchAll(/\bt\(["']([^"']+)["']\)/g)].map((m) => m[1]);
    expect(used.length).toBeGreaterThan(0);

    for (const key of used) {
      const parts = key.split(".");
      let cursor: unknown = locale;
      for (const part of parts) {
        expect(
          cursor && typeof cursor === "object" && part in (cursor as object),
          `missing family key: ${key}`,
        ).toBe(true);
        cursor = (cursor as Record<string, unknown>)[part];
      }
      expect(typeof cursor, key).toBe("string");
      expect(String(cursor), key).not.toMatch(/^landing\./);
    }
  });

  it("pt-BR family copy avoids European Portuguese tu/acesse forms", () => {
    const locale = JSON.parse(
      readFileSync(
        resolve(__dirname, "../i18n/locales/pt-BR/family.json"),
        "utf8",
      ),
    ) as unknown;

    const strings: string[] = [];
    const walk = (value: unknown) => {
      if (typeof value === "string") {
        strings.push(value);
        return;
      }
      if (value && typeof value === "object") {
        for (const child of Object.values(value as Record<string, unknown>)) {
          walk(child);
        }
      }
    };
    walk(locale);

    const banned =
      /\b(tens|teu|teus|tua|tuas|acede|acedido|recebeste|foste|pede|verifica|és)\b/giu;

    for (const text of strings) {
      const withoutPlaceholders = text.replace(/\{\{[^}]+\}\}/g, " ");
      expect(withoutPlaceholders, text).not.toMatch(banned);
      expect(withoutPlaceholders, text).not.toMatch(/Já tens/i);
    }
  });
});
