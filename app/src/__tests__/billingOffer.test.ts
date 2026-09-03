import { describe, expect, it } from "vitest";
import { PaymentPlanId } from "../payment/plans";
import {
  checkoutPlanIdForTrial,
  filterCatalogPlansForWorkspace,
  isInstitutionalTrialDisplay,
  offerPlanIdForWorkspace,
  planMatchesWorkspaceLevel,
} from "../shared/billingOffer";

const catalog = [
  { planId: "single", level: "personal" },
  { planId: "unlimited", level: "institutional" },
];

describe("billingOffer", () => {
  it("offers Catequista on personal and Plano Paróquia on institutional", () => {
    expect(offerPlanIdForWorkspace(true)).toBe(PaymentPlanId.Single);
    expect(offerPlanIdForWorkspace(false)).toBe(PaymentPlanId.Unlimited);
  });

  it("filters the public catalog to the active workspace level", () => {
    const personal = filterCatalogPlansForWorkspace(
      catalog,
      true,
      (planId) => catalog.find((plan) => plan.planId === planId)?.level,
    );
    const parish = filterCatalogPlansForWorkspace(
      catalog,
      false,
      (planId) => catalog.find((plan) => plan.planId === planId)?.level,
    );
    expect(personal.map((plan) => plan.planId)).toEqual(["single"]);
    expect(parish.map((plan) => plan.planId)).toEqual(["unlimited"]);
  });

  it("does not checkout Catequista from a parish trial", () => {
    expect(
      checkoutPlanIdForTrial({
        isPersonal: false,
        effectivePlanId: PaymentPlanId.Single,
      }),
    ).toBe(PaymentPlanId.Unlimited);
    expect(
      checkoutPlanIdForTrial({
        isPersonal: true,
        effectivePlanId: PaymentPlanId.Single,
      }),
    ).toBe(PaymentPlanId.Single);
  });

  it("treats parish trial as a display state, not a Catequista license", () => {
    expect(isInstitutionalTrialDisplay(false, true, PaymentPlanId.Single)).toBe(
      true,
    );
    expect(isInstitutionalTrialDisplay(true, true, PaymentPlanId.Single)).toBe(
      false,
    );
    expect(
      isInstitutionalTrialDisplay(false, true, PaymentPlanId.Unlimited),
    ).toBe(false);
  });

  it("matches plan level to workspace", () => {
    expect(planMatchesWorkspaceLevel("personal", true)).toBe(true);
    expect(planMatchesWorkspaceLevel("institutional", false)).toBe(true);
    expect(planMatchesWorkspaceLevel("personal", false)).toBe(false);
  });
});
