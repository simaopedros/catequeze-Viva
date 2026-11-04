import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { isMemberInstitutionPaused, memberPauseKind } from "../shared/memberAccessPause";

const FORBIDDEN = /pagamento|cobran[cç]a|fatura|assinatura|plano|inadimpl|vencid|billing|overdue|subscription|stripe|hotmart/i;

describe("member institution pause", () => {
  it("pauses only collaborators when the parish or diocese license is no longer active", () => {
    expect(
      isMemberInstitutionPaused({
        isPersonal: false,
        isBillingManager: false,
        billing: { plan: "catechist_free", status: "CANCELED" },
      }),
    ).toBe(true);
    expect(
      isMemberInstitutionPaused({
        isPersonal: false,
        isBillingManager: true,
        billing: { plan: "catechist_free", status: "CANCELED" },
      }),
    ).toBe(false);
    expect(
      isMemberInstitutionPaused({
        isPersonal: false,
        isBillingManager: false,
        billing: { plan: "unlimited", status: "ACTIVE" },
      }),
    ).toBe(false);
    expect(
      isMemberInstitutionPaused({
        isPersonal: false,
        isBillingManager: false,
        billing: { plan: "unlimited", status: "PAST_DUE" },
      }),
    ).toBe(false);
    expect(
      isMemberInstitutionPaused({
        isPersonal: false,
        isBillingManager: false,
        billing: { plan: null, status: null },
      }),
    ).toBe(false);
    expect(memberPauseKind("DIOCESE")).toBe("diocese");
    expect(memberPauseKind("PARISH")).toBe("parish");
  });

  it("uses a discreet pt-BR sentence with no payment words", () => {
    const billing = JSON.parse(
      readFileSync(resolve(__dirname, "../i18n/locales/pt-BR/billing.json"), "utf8"),
    );
    const parish = billing.member_access_paused.parish as string;
    const diocese = billing.member_access_paused.diocese as string;
    expect(parish).toBe(
      "O acesso da sua paróquia está temporariamente indisponível. Fale com o administrador da sua paróquia.",
    );
    expect(diocese).toBe(
      "O acesso da sua diocese está temporariamente indisponível. Fale com o administrador da sua diocese.",
    );
    expect(parish).not.toMatch(FORBIDDEN);
    expect(diocese).not.toMatch(FORBIDDEN);
    for (const locale of ["en", "es"]) {
      const copy = JSON.parse(
        readFileSync(resolve(__dirname, `../i18n/locales/${locale}/billing.json`), "utf8"),
      );
      expect(copy.member_access_paused.parish).not.toMatch(FORBIDDEN);
      expect(copy.member_access_paused.diocese).not.toMatch(FORBIDDEN);
    }
  });
});
