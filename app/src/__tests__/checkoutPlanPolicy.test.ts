import { describe, expect, it } from "vitest";
import { getCheckoutPlanRejection } from "../payment/checkoutPlanPolicy";
import { PaymentPlanId } from "../payment/plans";
import { AI_FEATURES_ENABLED } from "../shared/aiFeatures";
import { LAUNCH_CATEQUISTA_ONLY } from "../shared/pricing";

describe("getCheckoutPlanRejection", () => {
  it("allows Plano Único during launch", () => {
    expect(getCheckoutPlanRejection(PaymentPlanId.Single)).toBeNull();
  });

  it("rejects the free sentinel", () => {
    expect(getCheckoutPlanRejection(PaymentPlanId.CatechistFree)).toMatch(
      /não requer pagamento/i,
    );
  });

  it("rejects Ilimitado while launch-phase is on", () => {
    expect(LAUNCH_CATEQUISTA_ONLY).toBe(true);
    expect(getCheckoutPlanRejection(PaymentPlanId.Unlimited)).toMatch(
      /Ilimitado/i,
    );
  });

  it("rejects AI credit packs while AI is off", () => {
    expect(AI_FEATURES_ENABLED).toBe(false);
    expect(getCheckoutPlanRejection(PaymentPlanId.AiCredits20)).toMatch(
      /créditos/i,
    );
    expect(getCheckoutPlanRejection(PaymentPlanId.AiCredits50)).toMatch(
      /créditos/i,
    );
  });
});
