/**
 * Plan limits — re-exports from pricing.ts (single source of truth).
 * Kept for backward compatibility; all data lives in pricing.ts.
 */
export {
  getPlanLimits,
  getSocialLimits,
  planCanPublishSocial,
  planCanCreateGroups,
  planCanAccessCatechesis,
  planName,
  PLAN_NAMES,
  LIMIT_LABELS,
  isBillingActive,
  getEffectiveBillingPlan,
  getPersonalPlanId,
  isInstitutionalPlan,
  resolvePlanIdOrFree,
  isSubscriptionActiveLike,
  isProductTrialStatus,
  isProductTrialWindowOpen,
  isOnProductTrial,
  getProductTrialEndsAt,
  getProductTrialDaysLeft,
  isOnInstitutionalTrial,
  getInstitutionalTrialDaysLeft,
  hasPersonalAccess,
  hasInstitutionalAccess,
  getInstitutionalPlanId,
  getWorkspaceEffectivePlan,
  PLANS,
  SUBSCRIPTION_TRIAL_DAYS,
  PRODUCT_TRIAL_PLAN_ID,
  PRISMA_INSTITUTIONAL_PLANS,
  PRISMA_FREE_PLANS,
  type PlanId,
  type PlanLimits,
  type SocialLimits,
  type BillingInfo,
  type WorkspaceEffectivePlan,
  type UserSubscriptionFields,
} from './pricing';

// PLAN_LIMITS is derived from pricing.ts for backward compatibility.
// Includes lowercase + UPPERCASE keys for current and legacy plan ids.
import { PLANS, PLAN_ALIASES } from './pricing';
import type { PlanLimits } from './pricing';

/** Legacy PLAN_LIMITS map (all lowercase + UPPERCASE keys, incl. legacy aliases). */
export const PLAN_LIMITS: Record<string, PlanLimits> = {};
for (const [id, def] of Object.entries(PLANS)) {
  const limits = def.limits;
  PLAN_LIMITS[id] = limits;
  PLAN_LIMITS[id.toUpperCase()] = limits;
}
// Legacy aliases resolve to their canonical plan's limits.
for (const [alias, canonical] of Object.entries(PLAN_ALIASES)) {
  const limits = PLANS[canonical].limits;
  PLAN_LIMITS[alias.toLowerCase()] = limits;
  PLAN_LIMITS[alias.toUpperCase()] = limits;
}
