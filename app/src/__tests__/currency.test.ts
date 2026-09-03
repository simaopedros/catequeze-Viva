import { afterEach, describe, expect, it, vi } from "vitest";
import {
  annualDiscountPercent,
  detectCurrency,
  formatEquivalentMonthlyPrice,
  formatMonthlyFromAnnualCents,
  formatPrice,
} from "../shared/currency";

function mockNavigatorLanguages(languages: string[]) {
  vi.stubGlobal("navigator", {
    language: languages[0],
    languages,
  });
}

function mockTimeZone(timeZone: string) {
  vi.spyOn(Intl, "DateTimeFormat").mockImplementation(
    () =>
      ({
        resolvedOptions: () => ({ timeZone }),
      }) as Intl.DateTimeFormat,
  );
}

describe("detectCurrency", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  // The platform is Brazil-only and bills exclusively in BRL, so
  // detectCurrency() always returns 'BRL' regardless of locale/timezone.
  it("always returns BRL for Brazil locales", () => {
    mockNavigatorLanguages(["pt-BR", "pt"]);
    mockTimeZone("America/Sao_Paulo");

    expect(detectCurrency()).toBe("BRL");
  });

  it("returns BRL even for non-Brazil locales (platform is BR-only)", () => {
    mockNavigatorLanguages(["pt-PT", "pt"]);
    mockTimeZone("Europe/Lisbon");

    expect(detectCurrency()).toBe("BRL");
  });

  it("returns BRL for any locale/timezone combination", () => {
    mockNavigatorLanguages(["en-US"]);
    mockTimeZone("America/New_York");

    expect(detectCurrency()).toBe("BRL");
  });
});

describe("formatPrice", () => {
  it("does not round 990 cents to R$ 10", () => {
    expect(formatPrice(990)).toBe("R$ 9,90");
  });

  it("omits decimals for whole reais", () => {
    expect(formatPrice(9900)).toBe("R$ 99");
    expect(formatPrice(0)).toBe("R$ 0");
  });

  it("shows annual equivalent as ~R$ 8 for R$ 99/year", () => {
    expect(formatEquivalentMonthlyPrice(9900)).toBe("R$ 8");
  });

  it("keeps cents on the parish annual monthly equivalent", () => {
    expect(formatMonthlyFromAnnualCents(99000)).toBe("R$ 82,50");
  });

  it("computes the annual discount percent without rounding the price", () => {
    expect(annualDiscountPercent(9900, 99000)).toBe(17);
  });
});
