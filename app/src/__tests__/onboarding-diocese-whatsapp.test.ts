import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("onboarding diocese WhatsApp help copy", () => {
  const locales = ["pt-BR", "en", "es"] as const;
  const requiredKeys = [
    "not_found_link",
    "not_found_title",
    "not_found_body",
    "continue_without",
    "whatsapp_question",
    "whatsapp_helper",
    "whatsapp_cta",
    "whatsapp_prefill",
  ];

  for (const locale of locales) {
    it(`has diocese consult keys in ${locale}`, () => {
      const raw = readFileSync(
        resolve(__dirname, `../i18n/locales/${locale}/onboarding.json`),
        "utf8",
      );
      const json = JSON.parse(raw);
      for (const key of requiredKeys) {
        expect(json.diocese[key], `${locale}.diocese.${key}`).toBeTruthy();
      }
    });
  }

  it("pt-BR copy tells the user they can continue without a diocese", () => {
    const raw = readFileSync(
      resolve(__dirname, "../i18n/locales/pt-BR/onboarding.json"),
      "utf8",
    );
    const json = JSON.parse(raw);
    expect(json.diocese.not_found_body.toLowerCase()).toContain("sem diocese");
    expect(json.diocese.continue_without.toLowerCase()).toContain("sem diocese");
    expect(json.diocese.whatsapp_prefill.toLowerCase()).toContain("diocese");
  });
});
