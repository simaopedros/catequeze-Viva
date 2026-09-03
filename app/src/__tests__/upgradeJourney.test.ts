import { describe, expect, it } from "vitest";
import { PaymentPlanId } from "../payment/plans";
import { getSuggestedUpgradePlan } from "../catequese/lib/upgradeJourney";

describe("getSuggestedUpgradePlan", () => {
  it("does not suggest Plano Paróquia checkout from a personal Catequista space", () => {
    expect(
      getSuggestedUpgradePlan({
        currentPlan: "single",
        isPersonalWorkspace: true,
      }),
    ).toBeNull();
  });

  it("suggests Plano Paróquia from a parish trial that still uses single limits", () => {
    expect(
      getSuggestedUpgradePlan({
        currentPlan: "single",
        isPersonalWorkspace: false,
      }),
    ).toBe(PaymentPlanId.Unlimited);
  });

  it("returns null when the parish already has unlimited", () => {
    expect(
      getSuggestedUpgradePlan({
        currentPlan: "unlimited",
        isPersonalWorkspace: false,
      }),
    ).toBeNull();
  });
});
