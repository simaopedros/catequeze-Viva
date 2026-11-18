import { describe, expect, it, vi } from "vitest";
import { getPlanPriceCents } from "../shared/pricing";

const HOMOLOG_TEST_MONTHLY = "price_1U9lJjQ654W7D9A6bWCcgQBP";

vi.mock("wasp/server", () => ({
  env: {
    STRIPE_API_KEY: "sk_test_123",
  },
  config: {
    frontendUrl: "https://homolog.catechis.app",
  },
}));

vi.mock("../payment/stripe/stripeClient", () => ({
  stripeClient: {
    checkout: { sessions: { create: vi.fn() } },
    customers: { list: vi.fn(), create: vi.fn() },
  },
}));

describe("buildStripeCheckoutSessionCreateParams", () => {
  it("starts a TEST subscription session for Plano Único with a Stripe trial", async () => {
    const { buildStripeCheckoutSessionCreateParams } = await import(
      "../payment/stripe/checkoutUtils"
    );

    const params = buildStripeCheckoutSessionCreateParams({
      priceId: HOMOLOG_TEST_MONTHLY,
      customerId: "cus_test",
      userId: "user-1",
      mode: "subscription",
      trialPeriodDays: 7,
      frontendUrl: "https://homolog.catechis.app",
      tracking: {
        planId: "single",
        planName: "Plano Único",
        value: 9.9,
        currency: "BRL",
      },
    });

    expect(params.mode).toBe("subscription");
    expect(params.line_items).toEqual([
      { price: HOMOLOG_TEST_MONTHLY, quantity: 1 },
    ]);
    expect(getPlanPriceCents("single", "monthly")).toBe(990);
    expect(params.success_url).toBe(
      "https://homolog.catechis.app/obrigado?session_id={CHECKOUT_SESSION_ID}",
    );
    expect(params.cancel_url).toBe(
      "https://homolog.catechis.app/app/billing?status=canceled",
    );
    expect(params.invoice_creation).toBeUndefined();
    expect(params.locale).toBe("pt-BR");
    expect(params.adaptive_pricing).toEqual({ enabled: false });
    expect(params.payment_method_collection).toBe("if_required");
    expect(params.subscription_data?.trial_period_days).toBe(7);
    expect(params.subscription_data?.trial_settings).toEqual({
      end_behavior: { missing_payment_method: "cancel" },
    });
    expect(params.metadata?.currency).toBe("BRL");
    expect(params.metadata?.value).toBe("9.9");
    expect(params.metadata?.trial_days).toBe("7");
    expect(JSON.stringify(params)).not.toMatch(/ai_credits/i);
  });

  it("omits Stripe trial_period_days when trial days are 0", async () => {
    const { buildStripeCheckoutSessionCreateParams } = await import(
      "../payment/stripe/checkoutUtils"
    );

    const params = buildStripeCheckoutSessionCreateParams({
      priceId: HOMOLOG_TEST_MONTHLY,
      customerId: "cus_test",
      userId: "user-1",
      mode: "subscription",
      trialPeriodDays: 0,
      frontendUrl: "https://homolog.catechis.app",
      tracking: {
        planId: "single",
        planName: "Plano Único",
        value: 9.9,
        currency: "BRL",
      },
    });

    expect(params.subscription_data?.trial_period_days).toBeUndefined();
    expect(params.metadata?.trial_days).toBe("0");
    expect(JSON.stringify(params)).not.toMatch(/trial_period_days/);
    expect(params.payment_method_options).toBeUndefined();
    expect(params.payment_method_collection).toBe("always");
  });

  it("omits Pix mandate options when recurring Pix is disabled", async () => {
    const { buildStripeCheckoutSessionCreateParams } = await import(
      "../payment/stripe/checkoutUtils"
    );

    const params = buildStripeCheckoutSessionCreateParams({
      priceId: HOMOLOG_TEST_MONTHLY,
      customerId: "cus_test",
      userId: "user-1",
      mode: "subscription",
      trialPeriodDays: 7,
      frontendUrl: "https://homolog.catechis.app",
      interval: "monthly",
      unitAmountCents: 990,
      pixRecurringEnabled: false,
      tracking: {
        planId: "single",
        planName: "Plano Único",
        value: 9.9,
        currency: "BRL",
      },
    });

    expect(params.payment_method_options).toBeUndefined();
    expect(params.payment_method_collection).toBe("if_required");
    expect(params.subscription_data?.trial_period_days).toBe(7);
  });

  it("adds monthly Pix mandate options when recurring Pix is enabled", async () => {
    const { buildStripeCheckoutSessionCreateParams } = await import(
      "../payment/stripe/checkoutUtils"
    );

    const params = buildStripeCheckoutSessionCreateParams({
      priceId: HOMOLOG_TEST_MONTHLY,
      customerId: "cus_test",
      userId: "user-1",
      mode: "subscription",
      trialPeriodDays: 0,
      frontendUrl: "https://homolog.catechis.app",
      interval: "monthly",
      unitAmountCents: getPlanPriceCents("single", "monthly"),
      pixRecurringEnabled: true,
      tracking: {
        planId: "single",
        planName: "Plano Catequista",
        value: 9.9,
        currency: "BRL",
      },
    });

    expect(getPlanPriceCents("single", "monthly")).toBe(990);
    expect(params.payment_method_options).toEqual({
      pix: {
        mandate_options: {
          amount: 990,
          amount_type: "maximum",
          currency: "brl",
          payment_schedule: "monthly",
          reference: "Plano Catequista",
        },
      },
    });
    expect(params.payment_method_types).toBeUndefined();
  });

  it("adds yearly Pix mandate options for annual plans", async () => {
    const { buildStripeCheckoutSessionCreateParams } = await import(
      "../payment/stripe/checkoutUtils"
    );

    const params = buildStripeCheckoutSessionCreateParams({
      priceId: "price_annual_test",
      customerId: "cus_test",
      userId: "user-1",
      mode: "subscription",
      trialPeriodDays: 0,
      frontendUrl: "https://homolog.catechis.app",
      interval: "annual",
      unitAmountCents: getPlanPriceCents("unlimited", "annual"),
      pixRecurringEnabled: true,
      tracking: {
        planId: "unlimited",
        planName: "Plano Paróquia",
        value: 990,
        currency: "BRL",
      },
    });

    expect(getPlanPriceCents("unlimited", "annual")).toBe(99000);
    expect(params.payment_method_options).toEqual({
      pix: {
        mandate_options: {
          amount: 99000,
          amount_type: "maximum",
          currency: "brl",
          payment_schedule: "yearly",
          reference: "Plano Paróquia",
        },
      },
    });
  });

  it("always collects a payment method for trials when recurring Pix is enabled", async () => {
    const { buildStripeCheckoutSessionCreateParams } = await import(
      "../payment/stripe/checkoutUtils"
    );

    const params = buildStripeCheckoutSessionCreateParams({
      priceId: HOMOLOG_TEST_MONTHLY,
      customerId: "cus_test",
      userId: "user-1",
      mode: "subscription",
      trialPeriodDays: 7,
      frontendUrl: "https://homolog.catechis.app",
      interval: "monthly",
      unitAmountCents: 990,
      pixRecurringEnabled: true,
      tracking: {
        planId: "single",
        planName: "Plano Catequista",
        value: 9.9,
        currency: "BRL",
      },
    });

    expect(params.payment_method_collection).toBe("always");
    expect(params.subscription_data?.trial_period_days).toBe(7);
    expect(params.payment_method_options?.pix?.mandate_options?.amount).toBe(990);
  });

  it("throws when the success URL origin is missing", async () => {
    const { resolveCheckoutReturnUrls } = await import(
      "../payment/stripe/checkoutUtils"
    );
    expect(() => resolveCheckoutReturnUrls("")).toThrow(/WASP_WEB_CLIENT_URL/);
  });
});
