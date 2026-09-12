import { beforeEach, describe, expect, it, vi } from "vitest";
import { PaymentPlanId, paymentPlans } from "../payment/plans";

const TEST_MONTHLY = "price_1TestMonthlyXXXXXXXX";
const TEST_ANNUAL = "price_1TestAnnualXXXXXXXXX";

const waspEnv = {
  STRIPE_SINGLE_PLAN_ID: "",
  STRIPE_SINGLE_ANNUAL_PLAN_ID: "",
  STRIPE_UNLIMITED_PLAN_ID: "price_...",
  STRIPE_UNLIMITED_ANNUAL_PLAN_ID: "price_...",
  STRIPE_AI_CREDITS_20_PLAN_ID: "",
  STRIPE_AI_CREDITS_50_PLAN_ID: "",
};

vi.mock("wasp/server", () => ({
  env: waspEnv,
}));

describe("requireStripePriceId — Plano Único", () => {
  beforeEach(() => {
    process.env.STRIPE_SINGLE_PLAN_ID = TEST_MONTHLY;
    process.env.STRIPE_SINGLE_ANNUAL_PLAN_ID = TEST_ANNUAL;
    waspEnv.STRIPE_SINGLE_PLAN_ID = "price_...";
    waspEnv.STRIPE_SINGLE_ANNUAL_PLAN_ID = "price_...";
  });

  it("creates checkout price ids from usable monthly/annual prices", async () => {
    const { requireStripePriceId } = await import(
      "../payment/paymentProcessorPlans"
    );
    expect(
      requireStripePriceId(paymentPlans[PaymentPlanId.Single], "monthly"),
    ).toBe(TEST_MONTHLY);
    expect(
      requireStripePriceId(paymentPlans[PaymentPlanId.Single], "annual"),
    ).toBe(TEST_ANNUAL);
  });

  it("refuses leftover unlimited/placeholder ids", async () => {
    const { requireStripePriceId } = await import(
      "../payment/paymentProcessorPlans"
    );
    expect(() =>
      requireStripePriceId(paymentPlans[PaymentPlanId.Unlimited], "monthly"),
    ).toThrow(/Price ID não configurado/);
  });
});
