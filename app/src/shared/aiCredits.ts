/**
 * AI credit constants — re-exports from pricing.ts (single source of truth).
 * Kept for backward compatibility; all data lives in pricing.ts.
 */
export {
  AI_CREDITS,
  AI_CREDIT_COST,
  FREE_TRIAL_CREDITS,
  planHasAiAccess,
  getMonthlyAllowance,
  getDailyLimit,
  getAiCreditScope,
  getInitialCredits,
  resolvePlanIdOrFree,
  resolvePlanId,
  PLANS,
  PLAN_IDS,
  PRICING_VERSION,
  type PlanId,
  type AiCreditScope,
} from './pricing';
