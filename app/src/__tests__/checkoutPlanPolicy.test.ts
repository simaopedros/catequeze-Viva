import { describe, expect, it } from "vitest";
import { getCheckoutPlanRejection } from "../payment/checkoutPlanPolicy";
import { PaymentPlanId } from "../payment/plans";
import { AI_FEATURES_ENABLED } from "../shared/aiFeatures";
import { LAUNCH_CATEQUISTA_ONLY, DEFAULT_PLANS_BY_SLUG } from "../shared/pricing";

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

  it("uses catalog isActive when a plan object is provided", () => {
    expect(
      getCheckoutPlanRejection("unlimited", DEFAULT_PLANS_BY_SLUG.unlimited),
    ).toMatch(/Ilimitado/i);
    expect(getCheckoutPlanRejection("single", DEFAULT_PLANS_BY_SLUG.single)).toBeNull();
  });

  it("rejects plans that are active but not public", () => {
    expect(
      getCheckoutPlanRejection("unlimited", {
        ...DEFAULT_PLANS_BY_SLUG.unlimited,
        isActive: true,
        isPublic: false,
      }),
    ).toMatch(/Ilimitado|não está disponível/i);
  });

  it("allows a plan when both isActive and isPublic are true", () => {
    expect(
      getCheckoutPlanRejection("unlimited", {
        ...DEFAULT_PLANS_BY_SLUG.unlimited,
        isActive: true,
        isPublic: true,
      }),
    ).toBeNull();
  });
});
