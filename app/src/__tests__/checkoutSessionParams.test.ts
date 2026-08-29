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
  it("starts a TEST paid subscription session for Plano Único with no Stripe trial", async () => {
    const { buildStripeCheckoutSessionCreateParams } = await import(
      "../payment/stripe/checkoutUtils"
    );

    const params = buildStripeCheckoutSessionCreateParams({
      priceId: HOMOLOG_TEST_MONTHLY,
      customerId: "cus_test",
      userId: "user-1",
      mode: "subscription",
      // Leftover caller value must not create a second Stripe trial.
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
    expect(params.payment_method_collection).toBe("always");
    expect(params.subscription_data?.trial_period_days).toBeUndefined();
    expect(params.subscription_data?.trial_settings).toBeUndefined();
    expect(params.metadata?.currency).toBe("BRL");
    expect(params.metadata?.value).toBe("9.9");
    expect(params.metadata?.trial_days).toBe("0");
    expect(JSON.stringify(params)).not.toMatch(/trial_period_days/);
    expect(JSON.stringify(params)).not.toMatch(/ai_credits|unlimited/i);
  });

  it("throws when the success URL origin is missing", async () => {
    const { resolveCheckoutReturnUrls } = await import(
      "../payment/stripe/checkoutUtils"
    );
    expect(() => resolveCheckoutReturnUrls("")).toThrow(/WASP_WEB_CLIENT_URL/);
  });
});
