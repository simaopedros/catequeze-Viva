import { describe, expect, it } from "vitest";
import {
  canAddParishUnderDeal,
  dioceseDealBlockedNewParishMessage,
  dioceseParishQuotaMessage,
  isDioceseDealCovering,
  isManualDioceseDeal,
  parishQuotaReached,
  toDioceseDealPublicSummary,
} from "../shared/dioceseDeal";

describe("dioceseDeal helpers", () => {
  it("treats processor MANUAL or manualDeal as a negotiated deal", () => {
    expect(isManualDioceseDeal({ manualDeal: true })).toBe(true);
    expect(isManualDioceseDeal({ processor: "MANUAL" })).toBe(true);
    expect(isManualDioceseDeal({ processor: "STRIPE" })).toBe(false);
  });

  it("covers parishes only while ACTIVE and inside the commercial window", () => {
    expect(
      isDioceseDealCovering({
        plan: "unlimited",
        status: "ACTIVE",
        manualDeal: true,
      }),
    ).toBe(true);
    expect(
      isDioceseDealCovering({
        plan: "unlimited",
        status: "SUSPENDED",
        manualDeal: true,
      }),
    ).toBe(false);
    expect(
      isDioceseDealCovering({
        plan: "unlimited",
        status: "INACTIVE",
        manualDeal: true,
      }),
    ).toBe(false);
    expect(
      isDioceseDealCovering({
        plan: "unlimited",
        status: "PAST_DUE",
      }),
    ).toBe(true);
    expect(
      isDioceseDealCovering({
        plan: "unlimited",
        status: "PAST_DUE",
        manualDeal: true,
      }),
    ).toBe(false);
    expect(
      isDioceseDealCovering({
        plan: "unlimited",
        status: "ACTIVE",
        startsAt: new Date(Date.now() + 86_400_000),
      }),
    ).toBe(false);
  });

  it("enforces parish quota only when a max is set", () => {
    expect(parishQuotaReached(10, null)).toBe(false);
    expect(parishQuotaReached(10, 10)).toBe(true);
    expect(parishQuotaReached(9, 10)).toBe(false);
    expect(
      canAddParishUnderDeal({ covering: true, parishesUsed: 3, maxParishes: 10 }),
    ).toBe(true);
    expect(
      canAddParishUnderDeal({ covering: false, parishesUsed: 0, maxParishes: 10 }),
    ).toBe(false);
  });

  it("returns pastoral pt-BR copy without Stripe checkout language", () => {
    const quota = dioceseParishQuotaMessage(10, 10);
    expect(quota).toMatch(/10\/10/);
    expect(quota.toLowerCase()).not.toContain("stripe");
    expect(quota.toLowerCase()).not.toContain("checkout");

    const suspended = dioceseDealBlockedNewParishMessage({
      status: "SUSPENDED",
      manualDeal: true,
    });
    expect(suspended).toMatch(/suspenso/i);
    expect(suspended.toLowerCase()).not.toContain("stripe");
  });

  it("builds a public summary without commercial internals", () => {
    const summary = toDioceseDealPublicSummary({
      dioceseId: "d1",
      dioceseName: "Diocese de Teste",
      parishesUsed: 4,
      billing: {
        plan: "unlimited",
        status: "ACTIVE",
        manualDeal: true,
        maxParishes: 12,
      },
    });
    expect(summary.covering).toBe(true);
    expect(summary.canAddParish).toBe(true);
    expect(summary.parishesUsed).toBe(4);
    expect(summary.maxParishes).toBe(12);
    expect(summary).not.toHaveProperty("internalNotes");
    expect(summary).not.toHaveProperty("agreedPriceCents");
  });
});
