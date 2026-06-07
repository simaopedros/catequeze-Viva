/**
 * Shared plan limits — usable by both client and server.
 * Keep in sync with billingEnforcement.ts server enforcement.
 */
export interface PlanLimits {
  maxClasses: number | null;
  maxCatechumens: number | null;
  maxParishes: number | null;
}

export const PLAN_NAMES: Record<string, string> = {
  catechist_free: 'Catequista Grátis',
  catechist_pro: 'Catequista Pro',
  catechist_ai: 'Catequista IA',
  parish: 'Paróquia',
  diocese: 'Diocese',
};

export const LIMIT_LABELS: Record<string, string> = {
  parish_limit: 'paróquia',
  class_limit: 'turma',
  catechumen_limit: 'catequizando',
};

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  catechist_free:  { maxClasses: 2,    maxCatechumens: 30,   maxParishes: 1 },
  catechist_pro:   { maxClasses: null, maxCatechumens: null, maxParishes: null },
  catechist_ai:    { maxClasses: null, maxCatechumens: null, maxParishes: null },
  parish:          { maxClasses: null, maxCatechumens: null, maxParishes: null },
  diocese:         { maxClasses: null, maxCatechumens: null, maxParishes: null },
  CATECHIST_FREE:  { maxClasses: 2,    maxCatechumens: 30,   maxParishes: 1 },
  CATECHIST_PRO:   { maxClasses: null, maxCatechumens: null, maxParishes: null },
  CATECHIST_AI:    { maxClasses: null, maxCatechumens: null, maxParishes: null },
  PARISH:          { maxClasses: null, maxCatechumens: null, maxParishes: null },
  DIOCESE:         { maxClasses: null, maxCatechumens: null, maxParishes: null },
};

export function getPlanLimits(plan: string | null | undefined): PlanLimits {
  if (!plan) return PLAN_LIMITS.catechist_free;
  const normalized = plan.toLowerCase();
  return PLAN_LIMITS[normalized] || PLAN_LIMITS[plan] || PLAN_LIMITS.catechist_free;
}

export function planName(plan: string | null): string {
  if (!plan) return 'Catequista Grátis';
  return PLAN_NAMES[plan.toLowerCase()] || plan;
}

// Personal-level plans. Institutional plans (parish/diocese) must never apply to
// a personal workspace — they belong to TenantBilling, not the personal space.
const PERSONAL_PLAN_IDS = ['catechist_free', 'catechist_pro', 'catechist_ai'];

/**
 * Effective PERSONAL plan id (lowercase) for a user's personal workspace.
 * Only honors an active personal subscription; institutional plan values
 * (parish/diocese) and inactive subscriptions resolve to catechist_free, so an
 * institutional purchase never upgrades the buyer's personal space.
 */
export function getPersonalPlanId(user: { subscriptionStatus?: string | null; subscriptionPlan?: string | null } | null | undefined): string {
  const active = user?.subscriptionStatus === 'active';
  const plan = (active ? user?.subscriptionPlan : null)?.toLowerCase() || '';
  return PERSONAL_PLAN_IDS.includes(plan) ? plan : 'catechist_free';
}

/**
 * Check if a billing record is currently active.
 * Active means status is ACTIVE, or TRIAL with a future trialEndsAt.
 */
export interface BillingInfo {
  plan: string;
  status: string;
  trialEndsAt?: string | null | Date;
}

export function isBillingActive(billing: BillingInfo | null | undefined): boolean {
  if (!billing) return false;
  if (billing.status === 'ACTIVE') return true;
  if (billing.status === 'TRIAL' && billing.trialEndsAt) {
    const trialEnd = typeof billing.trialEndsAt === 'string' ? new Date(billing.trialEndsAt) : billing.trialEndsAt;
    return trialEnd >= new Date();
  }
  return false;
}

/**
 * Get the effective plan from a billing record.
 * Returns the plan if active, otherwise falls back to CATECHIST_FREE.
 */
export function getEffectiveBillingPlan(billing: BillingInfo | null | undefined): string {
  if (!billing) return 'CATECHIST_FREE';
  if (!isBillingActive(billing)) return 'CATECHIST_FREE';
  return billing.plan.toUpperCase() || 'CATECHIST_FREE';
}
