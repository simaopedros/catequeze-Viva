import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import i18next from "i18next";
import { pluralPt } from "../shared/pluralPt";
import {
  DEFAULT_EVENT_TYPE,
  newEventDefaultDate,
} from "../shared/calendarEventDefaults";
import { getPersonFullName } from "../shared/displayName";
import {
  getBreadcrumbLabel,
  setBreadcrumbLabel,
} from "../catequese/lib/breadcrumbLabels";
import { isSubscriptionFreeAppPath } from "../client/appRouteGates";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = path.join(__dirname, "../i18n/locales");
const APP_DIR = path.join(__dirname, "../..");

function loadNs(lang: string, ns: string) {
  return JSON.parse(
    fs.readFileSync(path.join(LOCALES_DIR, lang, `${ns}.json`), "utf8"),
  );
}

async function ptBR() {
  const instance = i18next.createInstance();
  await instance.init({
    lng: "pt-BR",
    fallbackLng: false,
    defaultNS: "common",
    ns: ["common", "content", "navigation"],
    interpolation: { escapeValue: false },
    resources: {
      "pt-BR": {
        common: loadNs("pt-BR", "common"),
        content: loadNs("pt-BR", "content"),
        navigation: loadNs("pt-BR", "navigation"),
      },
    },
  });
  return instance;
}

describe("pt-BR plurals", () => {
  it("pluralPt picks singular only for exactly one", () => {
    expect(pluralPt(1, "turma", "turmas")).toBe("1 turma");
    expect(pluralPt(0, "turma", "turmas")).toBe("0 turmas");
    expect(pluralPt(3, "turma", "turmas")).toBe("3 turmas");
  });

  it("resolves count keys with proper singular and plural", async () => {
    const i18n = await ptBR();
    expect(i18n.t("families.count", { count: 1 })).toBe("1 família");
    expect(i18n.t("families.count", { count: 2 })).toBe("2 famílias");
    expect(i18n.t("families.count", { count: 0 })).toBe("0 famílias");
  });

  it("library subtitle agrees in number for scripts and activities", async () => {
    const i18n = await ptBR();
    const subtitle = i18n.t("content:library.subtitle", {
      scripts: 1,
      activities: 0,
    });
    expect(subtitle).toContain("1 roteiro ");
    expect(subtitle).toContain("0 atividades");
    expect(subtitle).not.toMatch(/\(s\)/);
  });

  it("no pt-BR string falls back to the (s) shortcut", () => {
    const files = fs.readdirSync(path.join(LOCALES_DIR, "pt-BR"));
    for (const file of files) {
      const raw = fs.readFileSync(
        path.join(LOCALES_DIR, "pt-BR", file),
        "utf8",
      );
      expect(raw, file).not.toMatch(/[a-zçãõáéíóú]\(s\)/i);
    }
  });
});

describe("pt-BR accents", () => {
  it("library cards label duration with the accent", async () => {
    const i18n = await ptBR();
    expect(i18n.t("content:library.card_duration")).toBe("Duração");
  });

  it("source code has no common unaccented pt-BR words", () => {
    const offenders: string[] = [];
    const pattern =
      /\b(Duracao|DURACAO|Paroquia|paroquia|Descricao|Informacao|Inscricao|Configuracao)\b/;
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === "__tests__" || entry.name === "node_modules")
            continue;
          walk(full);
        } else if (/\.(tsx?|json)$/.test(entry.name)) {
          const text = fs.readFileSync(full, "utf8");
          text.split("\n").forEach((line, i) => {
            if (/^\s*(import|\/\/|\*)/.test(line)) return;
            const stripped = line.replace(/["'`][\w./#-]*["'`]/g, "");
            if (pattern.test(stripped) && /["'`>]/.test(line)) {
              offenders.push(`${path.relative(APP_DIR, full)}:${i + 1}`);
            }
          });
        }
      }
    };
    walk(path.join(APP_DIR, "src/catequese"));
    walk(path.join(APP_DIR, "src/i18n/locales/pt-BR"));
    expect(offenders).toEqual([]);
  });
});

describe("calendar new event defaults", () => {
  it("defaults to today when no day is selected", () => {
    const today = new Date(2026, 9, 26);
    expect(newEventDefaultDate({ year: 2026, month: 9, today })).toBe(
      "2026-10-26",
    );
    expect(
      newEventDefaultDate({ year: 2026, month: 11, day: null, today }),
    ).toBe("2026-10-26");
  });

  it("uses the clicked day of the visible month", () => {
    expect(newEventDefaultDate({ year: 2026, month: 11, day: 8 })).toBe(
      "2026-12-08",
    );
  });

  it("new events are not liturgical by default", () => {
    expect(DEFAULT_EVENT_TYPE).not.toBe("liturgical");
  });
});

describe("content detail byline and breadcrumb", () => {
  it("builds a full author name or null", () => {
    expect(getPersonFullName({ firstName: "Ana", lastName: "Souza" })).toBe(
      "Ana Souza",
    );
    expect(getPersonFullName({ firstName: " ", lastName: null })).toBeNull();
    expect(getPersonFullName(null)).toBeNull();
  });

  it("stores and clears page-provided breadcrumb labels", () => {
    const p = "/app/content-library/abc";
    setBreadcrumbLabel(p, "Encontro 1");
    expect(getBreadcrumbLabel(p)).toBe("Encontro 1");
    setBreadcrumbLabel(p, null);
    expect(getBreadcrumbLabel(p)).toBeUndefined();
  });

  it("falls back to a readable singular for the content library", async () => {
    const i18n = await ptBR();
    expect(i18n.t("navigation:breadcrumbSingular.content_library")).toBe(
      "Roteiro",
    );
  });
});

describe("/app/support alias", () => {
  it("is declared in main.wasp and redirects to /app/suporte", () => {
    const wasp = fs.readFileSync(path.join(APP_DIR, "main.wasp"), "utf8");
    expect(wasp).toMatch(/path: "\/app\/support", to: AppSupportAliasPage/);
    const page = fs.readFileSync(
      path.join(APP_DIR, "src/catequese/pages/RedirectSupportToSuporte.tsx"),
      "utf8",
    );
    expect(page).toContain("/app/suporte");
    expect(isSubscriptionFreeAppPath("/app/support")).toBe(true);
  });
});
