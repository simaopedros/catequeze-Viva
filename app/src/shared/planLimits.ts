/**
 * Plan limits — re-exports from pricing.ts (single source of truth).
 * Kept for backward compatibility; all data lives in pricing.ts.
 */
export {
  getPlanLimits,
  planName,
  PLAN_NAMES,
  LIMIT_LABELS,
  isBillingActive,
  getEffectiveBillingPlan,
  getPersonalPlanId,
  isInstitutionalPlan,
  resolvePlanIdOrFree,
  isSubscriptionActiveLike,
  hasPersonalAccess,
  hasInstitutionalAccess,
  getInstitutionalPlanId,
  getWorkspaceEffectivePlan,
  PLANS,
  type PlanId,
  type PlanLimits,
  type BillingInfo,
  type WorkspaceEffectivePlan,
} from './pricing';

// PLAN_LIMITS is derived from pricing.ts for backward compatibility
import { PLANS, resolvePlanIdOrFree } from './pricing';
import type { PlanLimits } from './pricing';

/** Legacy PLAN_LIMITS map (all lowercase + UPPERCASE keys). */
export const PLAN_LIMITS: Record<string, PlanLimits> = {};
for (const [id, def] of Object.entries(PLANS)) {
  const limits = def.limits;
  PLAN_LIMITS[id] = limits;
  PLAN_LIMITS[id.toUpperCase()] = limits;
}
PLAN_LIMITS['parish'] = PLANS.parish_complete.limits;
PLAN_LIMITS['PARISH'] = PLANS.parish_complete.limits;
