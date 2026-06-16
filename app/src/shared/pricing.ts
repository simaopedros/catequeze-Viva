/**
 * Single source of truth for all pricing, plan limits, and AI credit rules.
 *
 * Every other file (planLimits.ts, aiCredits.ts, payment plans, enforcement,
 * cascade, webhooks) derives its data from this module.
 *
 * Versioning:
 *   PRICING_VERSION = 2     (current)
 *   PRICING_VERSION = 1     (legacy — grandfathering via pricingVersion field)
 */

// ─── Versioning ───────────────────────────────────────────────────────────

export const PRICING_VERSION = 2;
export const PRICING_EFFECTIVE_FROM = new Date('2026-06-01T00:00:00-03:00');

// ─── Feature flag ─────────────────────────────────────────────────────────

/**
 * Whether pricing v2 is enabled.
 * Reads ENABLE_PRICING_V2 and optional PRICING_ROLLOUT_PERCENTAGE from
 * process.env (server-side). On the client this always returns true when
 * the flag is enabled globally — granular rollout is a server concern.
 *
 * @param userId Optional — when PRICING_ROLLOUT_PERCENTAGE < 100, used to
 *               deterministically decide if this user sees v2 pricing.
 */
export function isPricingV2Enabled(userId?: string): boolean {
  try {
    // Server-side: reads from process.env
    if (typeof process !== 'undefined' && process.env) {
      if (!process.env.ENABLE_PRICING_V2) return false;
      const pct = parseInt(process.env.PRICING_ROLLOUT_PERCENTAGE || '100', 10);
      if (!userId || pct >= 100) return true;
      return hashUserId(userId) % 100 < pct;
    }
  } catch {
    // process not available — client-side, default to enabled
  }
  // Client-side: v2 is always enabled (server guards the actual enforcement)
  return true;
}

function hashUserId(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

// ─── Plan IDs (vendable) ───────────────────────────────────────────────

export const PLAN_IDS = [
  'catechist_free',
  'catechist_pro',
  'catechist_ai',
  'parish_essential',
  'parish_complete',
  'diocese',
] as const;

export type PlanId = (typeof PLAN_IDS)[number];

/** Returns only vendable plan IDs (excludes legacy aliases). */
export function getAllPlanIds(): readonly PlanId[] {
  return PLAN_IDS;
}

// ─── Legacy aliases (NOT vendable, NOT in PLANS) ─────────────────────────

export const PLAN_ALIASES = {
  parish: 'parish_complete',
  PARISH: 'parish_complete',
} as const satisfies Record<string, PlanId>;

export type LegacyPlanId = keyof typeof PLAN_ALIASES;

/**
 * Resolve any plan identifier (active or legacy) to a canonical PlanId.
 * Returns null if the string is not recognised at all.
 */
export function resolvePlanId(raw: string): PlanId | null {
  const lower = raw.toLowerCase();
  if ((PLAN_IDS as readonly string[]).includes(lower)) {
    return lower as PlanId;
  }
  if (lower in PLAN_ALIASES) {
    return PLAN_ALIASES[lower as keyof typeof PLAN_ALIASES];
  }
  // Case-insensitive alias lookup
  const upper = raw.toUpperCase();
  if (upper in PLAN_ALIASES) {
    return PLAN_ALIASES[upper as keyof typeof PLAN_ALIASES];
  }
  return null;
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

export const PLANS: Record<PlanId, PlanDefinition> = {
  catechist_free: {
    name: 'Catequista Grátis',
    level: 'personal',
    prices: { monthlyCents: 0 },
    limits: {
      maxClasses: 1,
      maxCatechumens: 15,
      maxCatechists: 1,
      maxParishes: 1,
    },
    ai: {
      initialCredits: 3,
      monthlyCredits: 0,
      dailyLimit: 3,
      scope: 'user',
    },
    features: [
      '1 turma',
      '15 catequizandos',
      '1 paróquia pessoal',
      'Presença básica',
      'Calendário litúrgico',
      '3 créditos de IA iniciais',
    ],
    highlight: false,
  },

  catechist_pro: {
    name: 'Catequista Pro',
    level: 'personal',
    prices: { monthlyCents: 500, annualCents: 5000 },
    limits: {
      maxClasses: 3,
      maxCatechumens: 150,
      maxCatechists: 1,
      maxParishes: 1,
    },
    ai: {
      monthlyCredits: 5,
      dailyLimit: 2,
      scope: 'user',
    },
    features: [
      '3 turmas',
      '150 catequizandos',
      'Relatórios avançados',
      'Suporte prioritário',
      '5 créditos de IA/mês (amostra)',
    ],
    highlight: false,
  },

  catechist_ai: {
    name: 'Catequista IA',
    level: 'personal',
    prices: { monthlyCents: 900, annualCents: 9000 },
    limits: {
      maxClasses: null,
      maxCatechumens: null,
      maxCatechists: 1,
      maxParishes: 1,
    },
    ai: {
      monthlyCredits: 20,
      dailyLimit: 10,
      scope: 'user',
    },
    features: [
      'Tudo do plano Pro',
      'Gerador de encontros por IA',
      'Planejamento anual automático',
      'Gerador de atividades e quizzes',
      'Assistente teológico',
      'Mensagens WhatsApp para pais',
      '20 créditos de IA/mês',
    ],
    highlight: true,
  },

  parish_essential: {
    name: 'Paróquia Essencial',
    level: 'institutional',
    prices: { monthlyCents: 1900, annualCents: 19000 },
    limits: {
      maxClasses: null,
      maxCatechumens: 200,
      maxCatechists: 5,
      maxParishes: 1,
    },
    ai: {
      monthlyCredits: 30,
      dailyLimit: 20,
      scope: 'user',
    },
    features: [
      '5 catequistas',
      '200 catequizandos',
      'Turmas ilimitadas',
      'Comunicação integrada',
      'Documentos e certidões',
      'Painel do coordenador',
      '30 créditos de IA/mês',
    ],
    highlight: false,
  },

  parish_complete: {
    name: 'Paróquia Completa',
    level: 'institutional',
    prices: { monthlyCents: 2900, annualCents: 29000 },
    limits: {
      maxClasses: null,
      maxCatechumens: null,
      maxCatechists: null,
      maxParishes: 1,
    },
    ai: {
      monthlyCredits: 50,
      dailyLimit: 20,
      scope: 'user',
    },
    features: [
      'Catequistas ilimitados',
      'Catequizandos ilimitados',
      'Tudo da Essencial',
      'API de integração',
      'Onboarding dedicado',
      '50 créditos de IA/mês',
    ],
    highlight: true,
  },

  diocese: {
    name: 'Diocese',
    level: 'institutional',
    prices: { monthlyCents: 9900, annualCents: 99000 },
    limits: {
      maxClasses: null,
      maxCatechumens: null,
      maxCatechists: null,
      maxParishes: 10,
    },
    ai: {
      monthlyCredits: 50, // per parish (scope: per_parish)
      dailyLimit: 20,
      scope: 'per_parish',
    },
    features: [
      'Até 10 paróquias',
      'Tudo da Paróquia Completa',
      'Biblioteca oficial diocesana',
      'Analytics consolidado',
      'Onboarding dedicado',
      '50 créditos de IA por paróquia/mês',
    ],
    highlight: false,
  },
};

// ─── Display names ────────────────────────────────────────────────────────

export const PLAN_NAMES: Record<string, string> = Object.fromEntries(
  Object.entries(PLANS).map(([id, def]) => [id, def.name]),
) as Record<string, string>;

// Also register legacy alias display names
PLAN_NAMES['parish'] = PLANS.parish_complete.name;
PLAN_NAMES['PARISH'] = PLANS.parish_complete.name;

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
  return PLAN_NAMES[plan.toLowerCase()] ?? PLANS.catechist_free.name;
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
export const FREE_TRIAL_CREDITS = 3;

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
 * Returns 0 for free plans.
 */
export function getPlanPriceCents(planId: PlanId, interval: 'monthly' | 'annual'): number {
  const def = PLANS[planId];
  if (interval === 'annual' && def.prices.annualCents != null) {
    return def.prices.annualCents;
  }
  return def.prices.monthlyCents;
}

// ─── Institutional plan detection ─────────────────────────────────────────

const INSTITUTIONAL_PLAN_IDS: PlanId[] = ['parish_essential', 'parish_complete', 'diocese'];

/** Plan IDs for institutional plans (parish/diocese). Used by enforcement. */
export const INSTITUTIONAL_PLANS = [
  'PARISH_ESSENTIAL', 'PARISH_COMPLETE', 'DIOCESE',
  'parish_essential', 'parish_complete', 'diocese',
  'PARISH', 'parish', // legacy
] as const;

export function isInstitutionalPlan(plan: string | null | undefined): boolean {
  if (!plan) return false;
  return (INSTITUTIONAL_PLANS as readonly string[]).includes(plan.toUpperCase()) ||
         (INSTITUTIONAL_PLANS as readonly string[]).includes(plan.toLowerCase());
}

/** Personal-level plan IDs. Everything not institutional. */
const PERSONAL_PLAN_IDS: PlanId[] = ['catechist_free', 'catechist_pro', 'catechist_ai'];

// ─── Entitlement helpers (single source of truth) ─────────────────────────

/**
 * Subscription statuses that grant access.
 * `cancel_at_period_end` grants access until the period ends.
 * `past_due` grants access during the dunning grace period.
 */
const ACTIVE_LIKE_STATUSES = new Set(['active', 'cancel_at_period_end', 'past_due']);

/**
 * Whether a subscription status string counts as having access.
 * Treats `active`, `cancel_at_period_end`, and `past_due` as active-like.
 * Never compare subscriptionStatus strings directly — use this.
 */
export function isSubscriptionActiveLike(status: string | null | undefined): boolean {
  if (!status) return false;
  return ACTIVE_LIKE_STATUSES.has(status.toLowerCase());
}

/**
 * Effective PERSONAL plan id (lowercase) for a user's personal workspace.
 * Honors active-like subscriptions (active, cancel_at_period_end, past_due).
 * Institutional plan values on User.subscription* resolve to catechist_free
 * (institutional access is governed by TenantBilling).
 */
export function getPersonalPlanId(
  user: { subscriptionStatus?: string | null; subscriptionPlan?: string | null } | null | undefined,
): string {
  const active = isSubscriptionActiveLike(user?.subscriptionStatus);
  const plan = (active ? user?.subscriptionPlan : null)?.toLowerCase() || '';
  const resolved = resolvePlanId(plan);
  if (resolved && (PERSONAL_PLAN_IDS as readonly string[]).includes(resolved)) {
    return resolved;
  }
  return 'catechist_free';
}

/** Whether the user has paid personal access (Pro/IA, even cancel_at_period_end). */
export function hasPersonalAccess(
  user: { subscriptionStatus?: string | null; subscriptionPlan?: string | null } | null | undefined,
): boolean {
  return getPersonalPlanId(user) !== 'catechist_free';
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
export function isBillingActive(billing: BillingInfo | null | undefined): boolean {
  if (!billing) return false;
  if (billing.status === 'ACTIVE' || billing.status === 'PAST_DUE') return true;
  if (billing.status === 'TRIAL' && billing.trialEndsAt) {
    const trialEnd = typeof billing.trialEndsAt === 'string'
      ? new Date(billing.trialEndsAt)
      : billing.trialEndsAt;
    return trialEnd >= new Date();
  }
  return false;
}

export function getEffectiveBillingPlan(billing: BillingInfo | null | undefined): string {
  if (!billing) return 'CATECHIST_FREE';
  if (!isBillingActive(billing)) return 'CATECHIST_FREE';
  return billing.plan.toUpperCase() || 'CATECHIST_FREE';
}

/** Whether an institutional workspace has paid access via TenantBilling. */
export function hasInstitutionalAccess(billing: BillingInfo | null | undefined): boolean {
  if (!isBillingActive(billing)) return false;
  const plan = billing?.plan?.toUpperCase() || '';
  return plan !== 'CATECHIST_FREE';
}

/** Resolve the institutional plan from TenantBilling (or null if free). */
export function getInstitutionalPlanId(billing: BillingInfo | null | undefined): PlanId | null {
  if (!isBillingActive(billing)) return null;
  const plan = billing?.plan?.toUpperCase() || '';
  const resolved = resolvePlanId(plan);
  if (resolved && (INSTITUTIONAL_PLAN_IDS as readonly string[]).includes(resolved)) {
    return resolved;
  }
  return null;
}

// ─── Workspace-effective plan ─────────────────────────────────────────────

export interface WorkspaceEffectivePlan {
  plan: PlanId;
  source: 'personal' | 'institutional' | 'diocese_umbrella' | 'trial' | 'free';
  billingInfo?: BillingInfo | null;
}

/**
 * Determine the effective plan for a workspace, considering both personal
 * and institutional context. This is the single function UI and guards
 * should use to decide what plan governs the current workspace.
 */
export function getWorkspaceEffectivePlan(opts: {
  user: { subscriptionStatus?: string | null; subscriptionPlan?: string | null } | null | undefined;
  parishType?: string | null;
  billing?: BillingInfo | null;
  dioceseBilling?: BillingInfo | null;
}): WorkspaceEffectivePlan {
  const { user, parishType, billing, dioceseBilling } = opts;
  const isPersonal = !parishType || parishType === 'PERSONAL';

  if (isPersonal) {
    const plan = resolvePlanIdOrFree(getPersonalPlanId(user));
    return {
      plan,
      source: plan === 'catechist_free' ? 'free' : 'personal',
    };
  }

  // Institutional workspace — resolve by coverage order

  // 1. Parish own billing (takes priority over diocese umbrella)
  if (billing && isBillingActive(billing)) {
    const plan = getInstitutionalPlanId(billing);
    if (plan) {
      return { plan, source: 'institutional', billingInfo: billing };
    }
  }

  // 2. Diocese umbrella (fallback when parish has no billing)
  if (dioceseBilling && isBillingActive(dioceseBilling) && dioceseBilling.plan?.toUpperCase() === 'DIOCESE') {
    return {
      plan: 'diocese',
      source: 'diocese_umbrella',
      billingInfo: dioceseBilling,
    };
  }

  // 3. If billing exists but is TRIAL and not expired
  if (billing && billing.status === 'TRIAL' && billing.trialEndsAt) {
    const trialEnd = typeof billing.trialEndsAt === 'string'
      ? new Date(billing.trialEndsAt)
      : billing.trialEndsAt;
    if (trialEnd >= new Date()) {
      return { plan: 'catechist_free', source: 'trial', billingInfo: billing };
    }
  }

  // 4. Free fallback
  return { plan: 'catechist_free', source: 'free' };
}

// ─── AI credit packs (one-time add-ons) ───────────────────────────────────

export const AI_CREDIT_PACK_IDS = ['ai_credits_20', 'ai_credits_50'] as const;
export type AiCreditPackId = (typeof AI_CREDIT_PACK_IDS)[number];

export const AI_CREDIT_PACKS: Record<AiCreditPackId, { credits: number; priceCents: number }> = {
  ai_credits_20: { credits: 20, priceCents: 500 },
  ai_credits_50: { credits: 50, priceCents: 900 },
};
