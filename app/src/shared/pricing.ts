/**
 * Single source of truth for all pricing, plan limits, and AI credit rules.
 *
 * Every other file (planLimits.ts, aiCredits.ts, payment plans, enforcement,
 * cascade, webhooks) derives its data from this module.
 *
 * Simplified plan structure (BRL only, Stripe only):
 *   - catechist_free : sentinel "Sem assinatura" (access = zero)
 *   - single         : Plano Único (1 paróquia, 3 turmas, 150 catequizandos no total)
 *   - unlimited      : Plano Ilimitado (paróquia/diocese, tudo ilimitado)
 *
 * Legacy plan ids (catechist_pro, parish_complete, diocese, ...) are mapped to
 * the new ids via PLAN_ALIASES so existing data keeps resolving correctly.
 */

// ─── Pricing version (for audit/grandfathering) ───────────────────────────
//
// Stored on PricingEvent, User and TenantBilling as `pricingVersion`.
//   1 = pre-2026 legacy plans
//   2 = 6-plan v2 structure
//   3 = simplified 2-plan structure (this refactor)
// Kept as a simple constant — no longer drives any feature flag.

export const PRICING_VERSION = 3;
export const SUBSCRIPTION_TRIAL_DAYS = 7;

// ─── Plan IDs (vendable) ───────────────────────────────────────────────

export const PLAN_IDS = [
  'catechist_free',
  'single',
  'unlimited',
] as const;

export type PlanId = (typeof PLAN_IDS)[number];

/** Returns only vendable plan IDs (excludes legacy aliases). */
export function getAllPlanIds(): readonly PlanId[] {
  return PLAN_IDS;
}

// ─── Legacy aliases (NOT vendable, NOT in PLANS) ─────────────────────────
//
// Maps pre-simplification plan ids to the new canonical ids so that data
// created before the refactor keeps resolving to the right entitlements:
//   - catechist_pro / catechist_ai / parish_essential → single
//   - parish / parish_complete / diocese             → unlimited

export const PLAN_ALIASES = {
  catechist_pro: 'single',
  catechist_ai: 'single',
  parish_essential: 'single',
  parish: 'unlimited',
  parish_complete: 'unlimited',
  diocese: 'unlimited',
} as const satisfies Record<string, PlanId>;

export type LegacyPlanId = keyof typeof PLAN_ALIASES;

const ALIAS_LOOKUP: Record<string, PlanId> = (() => {
  const map: Record<string, PlanId> = {};
  for (const [alias, canonical] of Object.entries(PLAN_ALIASES)) {
    map[alias.toLowerCase()] = canonical;
    map[alias.toUpperCase()] = canonical;
  }
  return map;
})();

/**
 * Resolve any plan identifier (active or legacy) to a canonical PlanId.
 * Returns null if the string is not recognised at all.
 */
export function resolvePlanId(raw: string): PlanId | null {
  const lower = raw.toLowerCase();
  if ((PLAN_IDS as readonly string[]).includes(lower)) {
    return lower as PlanId;
  }
  return ALIAS_LOOKUP[lower] ?? ALIAS_LOOKUP[raw.toUpperCase()] ?? null;
}

/**
 * Resolve a plan id string (active or legacy) to a canonical PlanId,
 * falling back to 'catechist_free' when unrecognised.
 */
export function resolvePlanIdOrFree(raw: string | null | undefined): PlanId {
  if (!raw) return 'catechist_free';
  return resolvePlanId(raw) ?? 'catechist_free';
}

// ─── Types ────────────────────────────────────────────────────────────────

export type AiCreditScope = 'user' | 'per_parish' | 'diocese_pool';

export interface PlanDefinition {
  name: string;
  level: 'personal' | 'institutional';
  prices: {
    monthlyCents: number;
    annualCents?: number;
  };
  limits: {
    maxClasses: number | null;
    maxCatechumens: number | null;
    maxCatechists: number | null;
    maxParishes: number | null;
  };
  ai: {
    initialCredits?: number;
    monthlyCredits: number;
    dailyLimit: number;
    scope: AiCreditScope;
  };
  features: string[];
  highlight: boolean;
}

// ─── Plan definitions (single source of truth) ───────────────────────────
//
// Prices are stored in BRL cents (2900 = R$ 29,00).

export const PLANS: Record<PlanId, PlanDefinition> = {
  // Sentinel: represents "no active subscription". Zero access everywhere.
  // Kept as the DB default so existing rows keep a valid value, but the
  // enforcement layer treats its limits (all 0) as a hard block.
  catechist_free: {
    name: 'Sem assinatura',
    level: 'personal',
    prices: { monthlyCents: 0 },
    limits: {
      maxClasses: 0,
      maxCatechumens: 0,
      maxCatechists: 0,
      maxParishes: 0,
    },
    ai: {
      monthlyCredits: 0,
      dailyLimit: 0,
      scope: 'user',
    },
    features: [],
    highlight: false,
  },

  single: {
    name: 'Plano Único',
    level: 'personal',
    prices: { monthlyCents: 2900, annualCents: 29000 },
    limits: {
      maxClasses: 3,
      maxCatechumens: 150,
      maxCatechists: 1,
      maxParishes: 1,
    },
    ai: {
      monthlyCredits: 15,
      dailyLimit: 5,
      scope: 'user',
    },
    features: [
      '1 paróquia',
      'Até 3 turmas',
      '150 catequizandos no total',
      'Presença e calendário litúrgico',
      '15 créditos editoriais/mês',
    ],
    highlight: false,
  },

  unlimited: {
    name: 'Plano Ilimitado',
    level: 'institutional',
    prices: { monthlyCents: 9900, annualCents: 99000 },
    limits: {
      maxClasses: null,
      maxCatechumens: null,
      maxCatechists: null,
      maxParishes: null,
    },
    ai: {
      monthlyCredits: 50,
      dailyLimit: 20,
      scope: 'user',
    },
    features: [
      'Paróquias e turmas ilimitadas',
      'Catequizandos e catequistas ilimitados',
      'Gerador de encontros e atividades com assistência editorial',
      'Comunicação integrada (pais/catequizandos)',
      'Documentos e certidões',
      '50 créditos editoriais/mês',
    ],
    highlight: true,
  },
};

// ─── Display names ────────────────────────────────────────────────────────

export const PLAN_NAMES: Record<string, string> = Object.fromEntries(
  Object.entries(PLANS).map(([id, def]) => [id, def.name]),
) as Record<string, string>;

// Register legacy alias display names (resolve to the new plan's name).
for (const [alias, canonical] of Object.entries(PLAN_ALIASES)) {
  PLAN_NAMES[alias.toLowerCase()] = PLANS[canonical].name;
  PLAN_NAMES[alias.toUpperCase()] = PLANS[canonical].name;
}

// ─── Limit labels ─────────────────────────────────────────────────────────

export const LIMIT_LABELS: Record<string, string> = {
  parish_limit: 'paróquia',
  class_limit: 'turma',
  catechumen_limit: 'catequizando',
  catechist_limit: 'catequista',
};

// ─── Plan limit helpers ───────────────────────────────────────────────────

export interface PlanLimits {
  maxClasses: number | null;
  maxCatechumens: number | null;
  maxCatechists: number | null;
  maxParishes: number | null;
}

/**
 * Get plan limits for a given plan id (active or legacy).
 * Falls back to catechist_free when unrecognised.
 */
export function getPlanLimits(plan: string | null | undefined): PlanLimits {
  const planId = resolvePlanIdOrFree(plan);
  return PLANS[planId].limits;
}

/**
 * Display name for a plan id (active or legacy).
 */
export function planName(plan: string | null): string {
  if (!plan) return PLANS.catechist_free.name;
  return PLAN_NAMES[plan.toLowerCase()] ?? PLAN_NAMES[plan.toUpperCase()] ?? PLANS.catechist_free.name;
}

// ─── AI credit helpers ────────────────────────────────────────────────────

/** Plans that have AI access (any plan with monthlyCredits > 0 or initialCredits > 0). */
export function planHasAiAccess(plan: string | null | undefined): boolean {
  if (!plan) return false;
  const planId = resolvePlanId(plan);
  if (!planId) return false;
  const def = PLANS[planId];
  return def.ai.monthlyCredits > 0 || (def.ai.initialCredits ?? 0) > 0;
}

/** Monthly AI credit allowance for a plan. */
export function getMonthlyAllowance(plan: string | null | undefined): number {
  if (!plan) return 0;
  const planId = resolvePlanId(plan);
  if (!planId) return 0;
  return PLANS[planId].ai.monthlyCredits;
}

/** Daily AI credit limit for a plan. */
export function getDailyLimit(plan: string | null | undefined): number {
  if (!plan) return 0;
  const planId = resolvePlanIdOrFree(plan);
  return PLANS[planId].ai.dailyLimit;
}

/** AI credit scope for a plan. */
export function getAiCreditScope(planId: PlanId): AiCreditScope {
  return PLANS[planId].ai.scope;
}

/** Initial (one-time) credits for a plan. */
export function getInitialCredits(planId: PlanId): number {
  return PLANS[planId].ai.initialCredits ?? 0;
}

/** Cost per AI operation (in credits). */
export const AI_CREDIT_COST = {
  generateMeeting: 1,
  generateAnnualPlanning: 3,
  generateActivity: 1,
  chatMessage: 0,
  collaborativeSession: 1,
} as const;

/** One-time free credits for trial. */
export const FREE_TRIAL_CREDITS = 0;

/**
 * Legacy AI_CREDITS object for backward compatibility.
 * Derived from PLANS — no data duplication.
 */
export const AI_CREDITS = {
  AI_PLANS: Object.entries(PLANS)
    .filter(([, def]) => def.ai.monthlyCredits > 0 || (def.ai.initialCredits ?? 0) > 0)
    .flatMap(([id]) => [id, id.toUpperCase()]) as string[],

  MONTHLY_ALLOWANCE: Object.fromEntries(
    Object.entries(PLANS).flatMap(([id, def]) => [
      [id, def.ai.monthlyCredits],
      [id.toUpperCase(), def.ai.monthlyCredits],
    ]),
  ) as Record<string, number>,

  DAILY_LIMIT: Object.fromEntries(
    Object.entries(PLANS).flatMap(([id, def]) => [
      [id, def.ai.dailyLimit],
      [id.toUpperCase(), def.ai.dailyLimit],
    ]),
  ) as Record<string, number>,

  FREE_TRIAL_CREDITS,

  COST: AI_CREDIT_COST,
} as const;

// ─── Price helpers ────────────────────────────────────────────────────────

/**
 * Get the price in cents for a plan and interval.
 * Returns 0 for the free sentinel.
 */
export function getPlanPriceCents(planId: PlanId, interval: 'monthly' | 'annual'): number {
  const def = PLANS[planId];
  if (interval === 'annual' && def.prices.annualCents != null) {
    return def.prices.annualCents;
  }
  return def.prices.monthlyCents;
}

// ─── Institutional plan detection ─────────────────────────────────────────

const INSTITUTIONAL_PLAN_IDS: PlanId[] = ['unlimited'];

/**
 * Strings (including legacy aliases) that resolve to an institutional plan.
 * Used by enforcement to recognise umbrella/institutional entitlements.
 */
export const INSTITUTIONAL_PLANS = [
  'UNLIMITED', 'unlimited',
  'PARISH_COMPLETE', 'parish_complete',
  'PARISH_ESSENTIAL', 'parish_essential',
  'DIOCESE', 'diocese',
  'PARISH', 'parish', // legacy
] as const;

export function isInstitutionalPlan(plan: string | null | undefined): boolean {
  if (!plan) return false;
  const resolved = resolvePlanId(plan);
  if (resolved) return (INSTITUTIONAL_PLAN_IDS as readonly string[]).includes(resolved);
  // Defensive: also accept raw legacy strings just in case.
  return (INSTITUTIONAL_PLANS as readonly string[]).includes(plan.toUpperCase()) ||
         (INSTITUTIONAL_PLANS as readonly string[]).includes(plan.toLowerCase());
}

/** Personal-level plan IDs. Everything not institutional. */
const PERSONAL_PLAN_IDS: PlanId[] = ['catechist_free', 'single'];

// ─── Entitlement helpers (single source of truth) ─────────────────────────

/**
 * Subscription statuses that grant access.
 * `cancel_at_period_end` grants access until the period ends.
 * `past_due` grants access during the dunning grace period.
 * `trialing` is the product trial (no card) — access depends on trial window.
 */
const ACTIVE_LIKE_STATUSES = new Set(['active', 'cancel_at_period_end', 'past_due']);

/** Default plan granted during the no-card product trial. */
export const PRODUCT_TRIAL_PLAN_ID: PlanId = 'single';

export type UserSubscriptionFields = {
  subscriptionStatus?: string | null;
  subscriptionPlan?: string | null;
  /** Used to bound product trial (status = trialing) from signup time. */
  createdAt?: Date | string | null;
};

/**
 * Whether a subscription status string counts as paid access.
 * Treats `active`, `cancel_at_period_end`, and `past_due` as active-like.
 * Product trial (`trialing`) is handled separately via getPersonalPlanId.
 * Never compare subscriptionStatus strings directly — use this or getPersonalPlanId.
 */
export function isSubscriptionActiveLike(status: string | null | undefined): boolean {
  if (!status) return false;
  return ACTIVE_LIKE_STATUSES.has(status.toLowerCase());
}

/** True when status is the no-card product trial marker. */
export function isProductTrialStatus(status: string | null | undefined): boolean {
  return (status || '').toLowerCase() === 'trialing';
}

/**
 * Product trial window from account creation (SUBSCRIPTION_TRIAL_DAYS).
 * If createdAt is missing, returns false (fail closed for access checks).
 */
export function isProductTrialWindowOpen(
  createdAt: Date | string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!createdAt) return false;
  const start = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
  if (Number.isNaN(start.getTime())) return false;
  const endMs = start.getTime() + SUBSCRIPTION_TRIAL_DAYS * 24 * 60 * 60 * 1000;
  return endMs >= now.getTime();
}

/**
 * Effective PERSONAL plan id (lowercase) for a user's personal workspace.
 * Honors active-like subscriptions (active, cancel_at_period_end, past_due)
 * and the no-card product trial (`trialing` within SUBSCRIPTION_TRIAL_DAYS of createdAt).
 * Institutional plan values on User.subscription* resolve to catechist_free
 * (institutional access is governed by TenantBilling).
 */
export function getPersonalPlanId(
  user: UserSubscriptionFields | null | undefined,
): string {
  const status = (user?.subscriptionStatus || '').toLowerCase();

  // No-card product trial → Single entitlements while the window is open.
  if (isProductTrialStatus(status) && isProductTrialWindowOpen(user?.createdAt)) {
    const trialPlan = (user?.subscriptionPlan || PRODUCT_TRIAL_PLAN_ID).toLowerCase();
    const resolvedTrial = resolvePlanId(trialPlan);
    if (
      resolvedTrial &&
      resolvedTrial !== 'catechist_free' &&
      (PERSONAL_PLAN_IDS as readonly string[]).includes(resolvedTrial)
    ) {
      return resolvedTrial;
    }
    return PRODUCT_TRIAL_PLAN_ID;
  }

  const active = isSubscriptionActiveLike(user?.subscriptionStatus);
  const plan = (active ? user?.subscriptionPlan : null)?.toLowerCase() || '';
  const resolved = resolvePlanId(plan);
  if (resolved && (PERSONAL_PLAN_IDS as readonly string[]).includes(resolved)) {
    return resolved;
  }
  return 'catechist_free';
}

/** Whether the user has paid or trial personal access (Single, even cancel_at_period_end). */
export function hasPersonalAccess(
  user: UserSubscriptionFields | null | undefined,
): boolean {
  return getPersonalPlanId(user) !== 'catechist_free';
}

/** True while the user is on the no-card product trial (not a paid Stripe sub). */
export function isOnProductTrial(
  user: UserSubscriptionFields | null | undefined,
  now: Date = new Date(),
): boolean {
  return (
    isProductTrialStatus(user?.subscriptionStatus) &&
    isProductTrialWindowOpen(user?.createdAt, now)
  );
}

/** Calendar end of product trial from account creation. */
export function getProductTrialEndsAt(
  createdAt: Date | string | null | undefined,
): Date | null {
  if (!createdAt) return null;
  const start = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
  if (Number.isNaN(start.getTime())) return null;
  return new Date(start.getTime() + SUBSCRIPTION_TRIAL_DAYS * 24 * 60 * 60 * 1000);
}

/**
 * Whole days remaining in the product trial (ceil).
 * Returns null when the user is not on product trial.
 */
export function getProductTrialDaysLeft(
  user: UserSubscriptionFields | null | undefined,
  now: Date = new Date(),
): number | null {
  if (!isOnProductTrial(user, now)) return null;
  const endsAt = getProductTrialEndsAt(user?.createdAt);
  if (!endsAt) return null;
  return Math.max(0, Math.ceil((endsAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
}

// ─── Institutional billing helpers ────────────────────────────────────────

export interface BillingInfo {
  plan: string;
  status: string;
  trialEndsAt?: string | null | Date;
}

/**
 * Whether a TenantBilling record grants active access.
 * ACTIVE always grants access. TRIAL grants access until trialEndsAt.
 * PAST_DUE grants access (grace period).
 */
export function isBillingActive(
  billing: BillingInfo | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!billing) return false;
  if (billing.status === 'ACTIVE' || billing.status === 'PAST_DUE') return true;
  if (billing.status === 'TRIAL' && billing.trialEndsAt) {
    const trialEnd = typeof billing.trialEndsAt === 'string'
      ? new Date(billing.trialEndsAt)
      : billing.trialEndsAt;
    return trialEnd >= now;
  }
  return false;
}

/** Institutional TenantBilling on TRIAL that is still within trialEndsAt. */
export function isOnInstitutionalTrial(
  billing: BillingInfo | null | undefined,
  now: Date = new Date(),
): boolean {
  return Boolean(
    billing && billing.status === 'TRIAL' && isBillingActive(billing, now),
  );
}

export function getInstitutionalTrialDaysLeft(
  billing: BillingInfo | null | undefined,
  now: Date = new Date(),
): number | null {
  if (!isOnInstitutionalTrial(billing, now) || !billing?.trialEndsAt) return null;
  const endsAt =
    typeof billing.trialEndsAt === 'string'
      ? new Date(billing.trialEndsAt)
      : billing.trialEndsAt;
  if (Number.isNaN(endsAt.getTime())) return null;
  return Math.max(0, Math.ceil((endsAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
}

export function getEffectiveBillingPlan(billing: BillingInfo | null | undefined): string {
  if (!billing) return 'CATECHIST_FREE';
  if (!isBillingActive(billing)) return 'CATECHIST_FREE';
  // Normalise legacy plan values to the new canonical ids (uppercase, as
  // stored in the TenantBilling.plan enum column).
  const resolved = resolvePlanId(billing.plan);
  // Active product trial that still stores the free sentinel should grant
  // Single entitlements so onboarding (first class, first people) works.
  if (!resolved || resolved === 'catechist_free') {
    if (billing.status === 'TRIAL') return PRODUCT_TRIAL_PLAN_ID.toUpperCase();
    return 'CATECHIST_FREE';
  }
  return resolved.toUpperCase();
}

/**
 * Whether an institutional workspace has usable access via TenantBilling.
 *
 * Grants access for:
 * - Unlimited (and legacy institutional aliases that resolve to unlimited)
 * - Single (product trial on parish TenantBilling uses SINGLE entitlements)
 * - Active TRIAL that still stores free sentinel (maps to Single via getEffectiveBillingPlan)
 *
 * Free / canceled / expired trial → false.
 * Note: only Unlimited is an "umbrella" institutional license (isInstitutionalPlan);
 * Single still unlocks the same pastoral tools (including family invites) under limits.
 */
export function hasInstitutionalAccess(billing: BillingInfo | null | undefined): boolean {
  return getInstitutionalPlanId(billing) != null;
}

/**
 * Resolve the effective plan for an institutional workspace from TenantBilling.
 * Returns `unlimited` or `single` when billing is active; null if free/blocked.
 */
export function getInstitutionalPlanId(billing: BillingInfo | null | undefined): PlanId | null {
  if (!isBillingActive(billing)) return null;
  // getEffectiveBillingPlan maps TRIAL + free sentinel → SINGLE
  const effective = getEffectiveBillingPlan(billing);
  const resolved = resolvePlanId(effective);
  if (resolved === 'unlimited' || resolved === 'single') {
    return resolved;
  }
  return null;
}

// ─── Workspace-effective plan ─────────────────────────────────────────────

export interface WorkspaceEffectivePlan {
  plan: PlanId;
  source: 'personal' | 'institutional' | 'trial' | 'free';
  billingInfo?: BillingInfo | null;
}

/**
 * Determine the effective plan for a workspace, considering both personal
 * and institutional context. This is the single function UI and guards
 * should use to decide what plan governs the current workspace.
 */
export function getWorkspaceEffectivePlan(opts: {
  user: UserSubscriptionFields | null | undefined;
  parishType?: string | null;
  billing?: BillingInfo | null;
  dioceseBilling?: BillingInfo | null;
}): WorkspaceEffectivePlan {
  const { user, parishType, billing, dioceseBilling } = opts;
  const isPersonal = !parishType || parishType === 'PERSONAL';

  if (isPersonal) {
    const plan = resolvePlanIdOrFree(getPersonalPlanId(user));
    const status = (user?.subscriptionStatus || '').toLowerCase();
    if (plan !== 'catechist_free' && isProductTrialStatus(status)) {
      return { plan, source: 'trial' };
    }
    return {
      plan,
      source: plan === 'catechist_free' ? 'free' : 'personal',
    };
  }

  // Institutional workspace — resolve by coverage order

  // 1. Parish own billing (takes priority over diocese umbrella).
  // Single + Unlimited both unlock pastoral tools (invites, classes, etc.).
  if (billing && isBillingActive(billing)) {
    const plan = getInstitutionalPlanId(billing);
    if (plan) {
      // Product trial on parish TenantBilling (often plan=SINGLE or free sentinel).
      if (billing.status === 'TRIAL') {
        return { plan, source: 'trial', billingInfo: billing };
      }
      return { plan, source: 'institutional', billingInfo: billing };
    }
  }

  // 2. Diocese umbrella (fallback when parish has no billing)
  if (dioceseBilling && isBillingActive(dioceseBilling)) {
    const umbrella = getInstitutionalPlanId(dioceseBilling);
    if (umbrella === 'unlimited') {
      return {
        plan: 'unlimited',
        source: 'institutional',
        billingInfo: dioceseBilling,
      };
    }
  }

  // 3. If billing exists but is TRIAL and not expired (defensive; covered by isBillingActive above)
  if (billing && billing.status === 'TRIAL' && billing.trialEndsAt) {
    const trialEnd = typeof billing.trialEndsAt === 'string'
      ? new Date(billing.trialEndsAt)
      : billing.trialEndsAt;
    if (trialEnd >= new Date()) {
      const resolved = resolvePlanId(billing.plan);
      const trialPlan =
        resolved && resolved !== 'catechist_free' ? resolved : PRODUCT_TRIAL_PLAN_ID;
      return { plan: trialPlan, source: 'trial', billingInfo: billing };
    }
  }

  // 4. Free fallback (no subscription — blocked)
  return { plan: 'catechist_free', source: 'free' };
}

// ─── AI credit packs (one-time add-ons) ───────────────────────────────────

export const AI_CREDIT_PACK_IDS = ['ai_credits_20', 'ai_credits_50'] as const;
export type AiCreditPackId = (typeof AI_CREDIT_PACK_IDS)[number];

export const AI_CREDIT_PACKS: Record<AiCreditPackId, { credits: number; priceCents: number }> = {
  ai_credits_20: { credits: 20, priceCents: 2500 },
  ai_credits_50: { credits: 50, priceCents: 4500 },
};
