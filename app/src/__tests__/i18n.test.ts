import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = path.join(__dirname, "../i18n/locales");
const LANGS = ["pt-BR", "en", "es"];

function flattenKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      keys.push(...flattenKeys(v as Record<string, unknown>, key));
    } else {
      keys.push(key);
    }
  }
  return keys;
}

describe("i18n locale parity", () => {
  const namespaces = fs
    .readdirSync(path.join(LOCALES_DIR, "pt-BR"))
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(".json", ""));

  it("has the same keys in pt-BR, en, and es for every namespace", () => {
    for (const ns of namespaces) {
      const ref = JSON.parse(
        fs.readFileSync(path.join(LOCALES_DIR, "pt-BR", `${ns}.json`), "utf8"),
      );
      const refKeys = new Set(flattenKeys(ref));

      for (const lang of ["en", "es"]) {
        const target = JSON.parse(
          fs.readFileSync(path.join(LOCALES_DIR, lang, `${ns}.json`), "utf8"),
        );
        const targetKeys = new Set(flattenKeys(target));

        for (const k of refKeys) {
          expect(targetKeys.has(k), `[${ns}] missing in ${lang}: ${k}`).toBe(
            true,
          );
        }
        for (const k of targetKeys) {
          expect(refKeys.has(k), `[${ns}] extra in ${lang}: ${k}`).toBe(true);
        }
      }
    }
  });

  it("per-language resource bundles are generated and include all namespaces", () => {
    const bundles = ["pt_BR", "en", "es"];
    for (const lang of bundles) {
      const resourcesPath = path.join(
        __dirname,
        `../i18n/resources_${lang}.ts`,
      );
      const content = fs.readFileSync(resourcesPath, "utf8");
      expect(content).toContain("Auto-generated i18n resources");
      expect(content).toContain(`export const resources_${lang}`);
      for (const ns of namespaces) {
        expect(content).toContain(`export const ${ns}_${lang}`);
      }
    }
  });
});

describe("public launch-phase copy", () => {
  it("defaults to PT-BR unless the user stored an explicit locale", async () => {
    const { resolvePreferredLocale } = await import("../i18n/config");
    expect(resolvePreferredLocale(null)).toBe("pt-BR");
    expect(resolvePreferredLocale("en")).toBe("en");
    expect(resolvePreferredLocale("es")).toBe("es");
  });

  it("pricing FAQ has no credits, Ilimitado or two-plan leftovers", () => {
    for (const lang of LANGS) {
      const pub = JSON.parse(
        fs.readFileSync(path.join(LOCALES_DIR, lang, "public.json"), "utf8"),
      );
      const blob = JSON.stringify(pub.pricing);
      expect(blob, lang).not.toMatch(/15 (editorial )?credits|15 créditos/i);
      expect(blob, lang).not.toMatch(/Ilimitado|Unlimited/);
      expect(blob, lang).not.toMatch(
        /Two clear plans|Dos planes claros|dois planos/i,
      );
      expect(pub.pricing.subtitle).toMatch(/9[,.]90/);
    }
  });

  it("meetings namespace has create and classes days_long keys", () => {
    const meetings = JSON.parse(
      fs.readFileSync(path.join(LOCALES_DIR, "pt-BR", "meetings.json"), "utf8"),
    );
    const classes = JSON.parse(
      fs.readFileSync(path.join(LOCALES_DIR, "pt-BR", "classes.json"), "utf8"),
    );
    expect(meetings.create).toBe("Criar encontro");
    expect(classes.days_long["0"]).toBe("Domingo");
    expect(classes.days_long["6"]).toBe("Sábado");
  });
});

describe("calendar dates stay on America/Sao_Paulo", () => {
  it("does not shift a UTC-midnight meeting date one day earlier", async () => {
    const { formatDate, toAppCalendarDate, todayInAppTimezone } = await import(
      "../i18n/format"
    );
    const stored = new Date("2026-03-15T00:00:00.000Z");
    expect(toAppCalendarDate(stored).toISOString()).toBe(
      "2026-03-15T12:00:00.000Z",
    );
    const label = formatDate(stored, "pt-BR", {
      day: "numeric",
      month: "numeric",
      year: "numeric",
    });
    expect(label).toMatch(/15/);
    expect(label).not.toMatch(/^14/);

    const brazilEvening = new Date("2026-03-15T23:30:00-03:00");
    expect(todayInAppTimezone(brazilEvening)).toBe("2026-03-15");
    const utcAlreadyNextDay = new Date("2026-03-16T01:00:00.000Z");
    expect(todayInAppTimezone(utcAlreadyNextDay)).toBe("2026-03-15");
  });
});

describe("i18n config dual-safe bootstrap", () => {
  it("imports config in Node without throw and has pt-BR strings", async () => {
    const mod = await import("../i18n/config");
    expect(mod.default).toBeTruthy();
    const label = mod.default.t("offline_banner", {
      ns: "common",
      lng: "pt-BR",
    });
    expect(typeof label).toBe("string");
    expect(label).not.toBe("offline_banner");
    expect(mod.isLocaleBundleLoaded("pt-BR")).toBe(true);
  });

  it("ensureLocaleLoaded is a no-op for en on server/Node path", async () => {
    const { ensureLocaleLoaded, isLocaleBundleLoaded } = await import(
      "../i18n/config"
    );
    // In vitest Node, window is undefined → no dynamic import of en/es
    await ensureLocaleLoaded("en");
    // en is not auto-loaded on server
    expect(isLocaleBundleLoaded("en")).toBe(false);
  });
});

describe("serverLocale", () => {
  it("resolves user locale with pt-BR fallback", async () => {
    const {
      resolveUserLocale,
      getPeriodLabel,
      getMeetingReminderNotification,
    } = await import("../server/i18n/serverLocale");

    expect(resolveUserLocale({ locale: "en" })).toBe("en");
    expect(resolveUserLocale({ locale: "es" })).toBe("es");
    expect(resolveUserLocale(null)).toBe("pt-BR");

    expect(getPeriodLabel("month", "en")).toBe("Last month");
    expect(getPeriodLabel("quarter", "es")).toBe("Último trimestre");

    const notif = getMeetingReminderNotification(
      "en",
      "Class A",
      "Lesson 1",
      new Date("2026-06-09"),
    );
    expect(notif.title).toBe("Meeting tomorrow");
    expect(notif.body).toContain("Class A");
  });
});
