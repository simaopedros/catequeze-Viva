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

/**
 * Short commercial billing page: status → plan benefits → parish offer.
 * Personal spaces, paid licenses, Stripe-managed trials, diocese workspaces
 * and inherited coverage keep the existing management layout.
 */
export function shouldShowParishBillingConversion(opts: {
  isPersonal: boolean;
  isParishManaged: boolean;
  isPaidActive: boolean;
  canManageBilling: boolean;
  workspaceType?: string | null;
  hasStripeSubscription?: boolean;
}): boolean {
  if (!opts.canManageBilling || opts.isPersonal) return false;
  if (opts.isParishManaged || opts.isPaidActive || opts.hasStripeSubscription) {
    return false;
  }
  if (opts.workspaceType === "DIOCESE") return false;
  return true;
}

/**
 * Compact management page for a Catequista subscriber (paid or Stripe trial).
 * In-app trials without a Stripe subscription still use conversion checkout.
 */
export function shouldShowPersonalActiveBilling(opts: {
  isPersonal: boolean;
  isPaidActive: boolean;
  canManageBilling: boolean;
  hasStripeSubscription?: boolean;
}): boolean {
  return (
    opts.isPersonal &&
    opts.canManageBilling &&
    (opts.isPaidActive || Boolean(opts.hasStripeSubscription))
  );
}

/** Catequista unpaid / in-app trial without a live Stripe subscription. */
export function shouldShowPersonalConversion(opts: {
  isPersonal: boolean;
  isPaidActive: boolean;
  canManageBilling: boolean;
  hasStripeSubscription?: boolean;
}): boolean {
  return (
    opts.isPersonal &&
    !opts.isPaidActive &&
    !opts.hasStripeSubscription &&
    opts.canManageBilling
  );
}

/**
 * The paywall used to compare "your trial: 0 classes" with plan limits.
 * Empty current usage is noise; show only what the trial/plan includes.
 */
export function shouldShowBillingUsageContrast(opts: {
  isTrial: boolean;
  classesUsed: number;
  catechumensUsed: number;
}): boolean {
  return opts.isTrial && (opts.classesUsed > 0 || opts.catechumensUsed > 0);
}

/**
 * Paid parish/community license the coordinator manages (not diocese cover).
 */
export function shouldShowInstitutionalActiveBilling(opts: {
  isPersonal: boolean;
  isPaidActive: boolean;
  canManageBilling: boolean;
  planInherited?: boolean;
  workspaceType?: string | null;
  hasStripeSubscription?: boolean;
}): boolean {
  if (!opts.canManageBilling || opts.isPersonal) return false;
  if (!(opts.isPaidActive || opts.hasStripeSubscription)) return false;
  if (opts.planInherited || opts.workspaceType === "DIOCESE") return false;
  return true;
}

/** Parish covered by an inherited diocese license — who manages, no SKU. */
export function shouldShowCoveredWorkspaceBilling(opts: {
  canManageBilling: boolean;
  planInherited?: boolean;
}): boolean {
  return opts.canManageBilling && Boolean(opts.planInherited);
}

/** Diocese workspace: assisted sales, never a self-serve catalog. */
export function shouldShowDioceseWorkspaceBilling(opts: {
  canManageBilling: boolean;
  workspaceType?: string | null;
}): boolean {
  return opts.canManageBilling && opts.workspaceType === "DIOCESE";
}

/** Auxiliary, class guest, viewer: who manages, no plan/price copy. */
export function shouldShowCollaboratorBilling(opts: {
  canManageBilling: boolean;
}): boolean {
  return !opts.canManageBilling;
}

/**
 * Whether this workspace already has a Stripe-managed subscription to manage.
 * A personal Catequista trial must not hide the parish conversion page.
 */
export function workspaceHasStripeManagedSubscription(opts: {
  isPersonal: boolean;
  hasUserStripeSubscription: boolean;
  userPlan?: string | null;
  isInstitutionalTrial: boolean;
}): boolean {
  if (!opts.hasUserStripeSubscription) return false;
  if (opts.isPersonal) return true;
  if (!opts.isInstitutionalTrial) return false;
  return (opts.userPlan || "").toLowerCase() === "unlimited";
}
