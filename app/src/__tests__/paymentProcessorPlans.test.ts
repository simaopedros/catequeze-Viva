import { beforeEach, describe, expect, it, vi } from "vitest";
import { PaymentPlanId, paymentPlans } from "../payment/plans";

const HOMOLOG_TEST_MONTHLY = "price_1U9lJjQ654W7D9A6bWCcgQBP";
const HOMOLOG_TEST_ANNUAL = "price_1U9lJvQ654W7D9A6ji7lHdJi";

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

describe("requireStripePriceId — homolog TEST Plano Único", () => {
  beforeEach(() => {
    process.env.STRIPE_SINGLE_PLAN_ID = HOMOLOG_TEST_MONTHLY;
    process.env.STRIPE_SINGLE_ANNUAL_PLAN_ID = HOMOLOG_TEST_ANNUAL;
    waspEnv.STRIPE_SINGLE_PLAN_ID = "price_...";
    waspEnv.STRIPE_SINGLE_ANNUAL_PLAN_ID = "price_...";
  });

  it("creates checkout price ids from the VPS TEST monthly/annual prices", async () => {
    const { requireStripePriceId } = await import(
      "../payment/paymentProcessorPlans"
    );
    expect(
      requireStripePriceId(paymentPlans[PaymentPlanId.Single], "monthly"),
    ).toBe(HOMOLOG_TEST_MONTHLY);
    expect(
      requireStripePriceId(paymentPlans[PaymentPlanId.Single], "annual"),
    ).toBe(HOMOLOG_TEST_ANNUAL);
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
