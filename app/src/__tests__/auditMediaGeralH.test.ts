import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  formatBrazilianPhone,
  formatInternationalPhone,
  isInternationalPhoneInput,
  normalizePhoneInput,
} from "../shared/phoneFormat";
import { isPhoneAllowed } from "../shared/personFields";
import { formatDateOnly } from "../i18n/format";

const root = (...parts: string[]) => resolve(__dirname, "..", ...parts);

describe("audit média H — telefone internacional", () => {
  it("does not force Brazilian mask on +351", () => {
    const raw = "+351912345678";
    expect(isInternationalPhoneInput(raw)).toBe(true);
    const formatted = normalizePhoneInput(raw);
    expect(formatted.startsWith("+351")).toBe(true);
    expect(formatted).not.toContain("(35)");
    expect(formatted).not.toBe(formatBrazilianPhone("351912345678"));
    expect(isPhoneAllowed(formatted)).toBe(true);
  });

  it("keeps Brazilian mask without +", () => {
    expect(formatBrazilianPhone("11987654321")).toBe("(11) 98765-4321");
    expect(normalizePhoneInput("11987654321")).toBe("(11) 98765-4321");
  });

  it("caps international digits at 15 (E.164)", () => {
    const long = formatInternationalPhone("+12345678901234567890");
    expect(long.replace(/\D/g, "").length).toBe(15);
  });
});

describe("audit média H — ficha catequizando turma", () => {
  it("exposes atomic transfer and reversible removal actions", () => {
    const page = readFileSync(
      root("catequese/pages/CatechumenDetailPage.tsx"),
      "utf8",
    );
    expect(page).toContain("cancelEnrollment");
    expect(page).toContain("catechumens.transfer.open");
    expect(page).toContain("catechumens.remove_from_class.open");
    expect(page).toContain('mode="transfer"');

    const dialog = readFileSync(
      root("catequese/components/EnrollInClassDialog.tsx"),
      "utf8",
    );
    expect(dialog).toContain("transferEnrollment");
    expect(dialog).toContain('mode === "transfer"');

    const ops = readFileSync(
      root("server/operations/classOperations.ts"),
      "utf8",
    );
    expect(ops).toContain("EnrollmentStatus.ENROLLED");
    expect(ops).toMatch(
      /if \(existing\.status === EnrollmentStatus\.ENROLLED\)/,
    );
  });
});

describe("audit média H — mensagens lista e erro inicial", () => {
  it("awaits list refetch after create and shows loading before network error", () => {
    const src = readFileSync(
      root("catequese/pages/MessagesPage.tsx"),
      "utf8",
    );
    expect(src).toContain("await refetchConvs()");
    expect(src).toMatch(/loadingChat\s*\?\s*\(/);
    expect(src).toContain("network_error");
  });
});

describe("audit média H — dashboard contagens", () => {
  it("dashboard keeps non-archived class usage", () => {
    const dash = readFileSync(
      root("server/operations/dashboardOperations.ts"),
      "utf8",
    );
    expect(dash).toContain("planUsageClassesPromise");
    expect(dash).toContain('status: { not: "ARCHIVED" }');
    expect(dash).toContain("planUsageClasses,");
  });
});

describe("audit média H — chamada total inscritos", () => {
  it("uses enrollmentCount as roll-call denominator and counts ENROLLED with profile", () => {
    const myClasses = readFileSync(
      root("catequese/components/dashboard/MyClassesCard.tsx"),
      "utf8",
    );
    expect(myClasses).toContain(
      "last.enrollmentCount || last.registeredCount",
    );
    expect(myClasses).not.toContain(
      "last.registeredCount || last.enrollmentCount",
    );

    const recent = readFileSync(
      root("catequese/components/dashboard/RecentMeetingsList.tsx"),
      "utf8",
    );
    expect(recent).toContain("m.enrollmentCount || m.registeredCount");

    const meetingOps = readFileSync(
      root("server/operations/meetingOperations.ts"),
      "utf8",
    );
    expect(meetingOps).toMatch(
      /status:\s*"ENROLLED",\s*catechumenProfileId:\s*\{\s*not:\s*null\s*\}/,
    );
  });
});

describe("audit média H — baixa: datas, espaço pessoal, nomes", () => {
  it("formats ISO birth dates as locale day/month/year in import preview", () => {
    expect(
      formatDateOnly("2010-03-15", "pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
    ).toMatch(/15\/03\/2010/);

    const importPage = readFileSync(
      root("catequese/pages/ImportCatechumensPage.tsx"),
      "utf8",
    );
    expect(importPage).toContain("formatImportBirthDate");
  });

  it("labels personal workspace as Meu Espaço Pessoal in UI copy", () => {
    const topbar = JSON.parse(
      readFileSync(root("i18n/locales/pt-BR/topbar.json"), "utf8"),
    );
    expect(topbar.personalSpace).toBe("Meu Espaço Pessoal");

    const selector = readFileSync(
      root("catequese/components/ContextSelector.tsx"),
      "utf8",
    );
    expect(selector).toContain('ws.isPersonal ? t("personalSpace") : ws.name');
    expect(selector).not.toContain("ws.subtitle || t(\"personalSpace\")");
  });

  it("prefers real member names over email local-part in TeamPage", () => {
    const team = readFileSync(root("catequese/pages/TeamPage.tsx"), "utf8");
    expect(team).not.toContain('email?.split("@")[0]');
    expect(team).toContain("m.user?.email");
  });
});
