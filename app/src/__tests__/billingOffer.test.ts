import { describe, expect, it } from "vitest";
import { PaymentPlanId } from "../payment/plans";
import {
  checkoutPlanIdForTrial,
  ensureWorkspaceOfferPlan,
  filterCatalogPlansForWorkspace,
  isInstitutionalTrialDisplay,
  offerPlanIdForWorkspace,
  planMatchesWorkspaceLevel,
  shouldShowParishBillingConversion,
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

  it("still offers Plano Paróquia when the public catalog only has Catequista", () => {
    const catequistaOnly = [{ planId: "single", name: "Plano Catequista" }];
    const parishPlans = ensureWorkspaceOfferPlan(
      filterCatalogPlansForWorkspace(catequistaOnly, false, (planId) =>
        planId === "single" ? "personal" : "institutional",
      ),
      false,
      (planId) =>
        planId === PaymentPlanId.Unlimited
          ? { planId: "unlimited", name: "Plano Paróquia" }
          : null,
    );
    expect(parishPlans.map((plan) => plan.planId)).toEqual(["unlimited"]);
    expect(parishPlans[0]?.name).toBe("Plano Paróquia");
  });
});

describe("shouldShowParishBillingConversion", () => {
  const base = {
    isPersonal: false,
    isParishManaged: false,
    isPaidActive: false,
    canManageBilling: true,
    workspaceType: "PARISH" as const,
  };

  it("shows the conversion page for an unpaid parish manager", () => {
    expect(shouldShowParishBillingConversion(base)).toBe(true);
  });

  it("shows the conversion page for a community workspace on trial", () => {
    expect(
      shouldShowParishBillingConversion({
        ...base,
        workspaceType: "COMMUNITY",
      }),
    ).toBe(true);
  });

  it("keeps personal, paid, diocese and inherited billing on the management page", () => {
    expect(
      shouldShowParishBillingConversion({ ...base, isPersonal: true }),
    ).toBe(false);
    expect(
      shouldShowParishBillingConversion({ ...base, isPaidActive: true }),
    ).toBe(false);
    expect(
      shouldShowParishBillingConversion({ ...base, isParishManaged: true }),
    ).toBe(false);
    expect(
      shouldShowParishBillingConversion({
        ...base,
        workspaceType: "DIOCESE",
      }),
    ).toBe(false);
    expect(
      shouldShowParishBillingConversion({ ...base, canManageBilling: false }),
    ).toBe(false);
  });
});
