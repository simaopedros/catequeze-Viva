import { PaymentPlanId } from "../payment/plans";
import { isInstitutionalCoverPlan } from "./workspaceIdentity";

export type CatalogPlanLevel = "personal" | "institutional" | string;

/** Public SKU this workspace should sell: Catequista vs Plano Paróquia. */
export function offerPlanIdForWorkspace(isPersonal: boolean): PaymentPlanId {
  return isPersonal ? PaymentPlanId.Single : PaymentPlanId.Unlimited;
}

export function planMatchesWorkspaceLevel(
  planLevel: CatalogPlanLevel | undefined,
  isPersonal: boolean,
): boolean {
  return isPersonal ? planLevel === "personal" : planLevel === "institutional";
}

export function filterCatalogPlansForWorkspace<T extends { planId: string }>(
  plans: T[],
  isPersonal: boolean,
  getLevel: (planId: string) => CatalogPlanLevel | undefined,
): T[] {
  return plans.filter((plan) =>
    planMatchesWorkspaceLevel(getLevel(plan.planId), isPersonal),
  );
}

/**
 * Keep the workspace SKU visible even when the live public catalog hid it
 * (e.g. launch leftover with unlimited.isPublic = false).
 */
export function ensureWorkspaceOfferPlan<T extends { planId: string }>(
  plans: T[],
  isPersonal: boolean,
  resolveOffer: (planId: PaymentPlanId) => T | null | undefined,
): T[] {
  const offerId = offerPlanIdForWorkspace(isPersonal);
  if (plans.some((plan) => plan.planId === offerId)) {
    return plans;
  }
  const extra = resolveOffer(offerId);
  if (!extra || extra.planId !== offerId) {
    return plans;
  }
  return [extra, ...plans];
}

/**
 * Checkout target while the current workspace is on a product/institutional trial.
 * Parish trial uses Catequista *limits* but must never start a personal Catequista checkout.
 */
export function checkoutPlanIdForTrial(opts: {
  isPersonal: boolean;
  effectivePlanId: string;
}): PaymentPlanId {
  if (opts.isPersonal) {
    return opts.effectivePlanId === PaymentPlanId.CatechistFree
      ? PaymentPlanId.Single
      : (opts.effectivePlanId as PaymentPlanId);
  }
  if (isInstitutionalCoverPlan(opts.effectivePlanId)) {
    return PaymentPlanId.Unlimited;
  }
  return PaymentPlanId.Unlimited;
}

export function isInstitutionalTrialDisplay(
  isPersonal: boolean,
  isTrial: boolean,
  effectivePlanId: string,
): boolean {
  return !isPersonal && isTrial && !isInstitutionalCoverPlan(effectivePlanId);
}
