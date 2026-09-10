/**
 * Product catalog types, default plans, and helpers that look up plan data.
 *
 * DEFAULT_PLANS is the static seed / fallback (identical to the pre-catalog
 * hardcoded PLANS). When PRICING_CATALOG_SOURCE=db, the server loads the same
 * shape from PricingPlan rows and passes it into these helpers.
 *
 * Helpers accept an optional catalog and default to DEFAULT_PLANS so existing
 * callers keep working and static-mode behaviour is unchanged.
 */

import { AI_FEATURES_ENABLED } from './aiFeatures';

export const PRICING_VERSION = 3;
export const SUBSCRIPTION_TRIAL_DAYS = 7;

export type PricingPlanKind = 'subscription' | 'credits';
export type PricingPlanLevel = 'personal' | 'institutional';
export type PricingInterval = 'monthly' | 'annual' | 'one_time';
export type AiCreditScope = 'user' | 'per_parish' | 'diocese_pool';

export const PLAN_IDS = [
  'catechist_free',
  'single',
  'unlimited',
] as const;

export type KnownPlanId = (typeof PLAN_IDS)[number];
/** Canonical plan slug. Dynamic admin-created plans are also valid strings. */
export type PlanId = string;

export const SYSTEM_PLAN_SLUGS = ['catechist_free', 'single'] as const;
export const KNOWN_PLAN_SLUGS = {
  catechistFree: 'catechist_free',
  single: 'single',
  unlimited: 'unlimited',
  aiCredits20: 'ai_credits_20',
  aiCredits50: 'ai_credits_50',
} as const;

export const AI_CREDIT_PACK_IDS = ['ai_credits_20', 'ai_credits_50'] as const;
export type AiCreditPackId = (typeof AI_CREDIT_PACK_IDS)[number];

export type SocialLimits = {
  maxPostsPerDay: number | null;
  maxMediaPerPost: number;
  maxVideoSeconds: number;
};

export interface PlanLimits {
  maxClasses: number | null;
  maxCatechumens: number | null;
  maxCatechists: number | null;
  maxParishes: number | null;
}

export interface CatalogPrice {
  interval: PricingInterval;
  currency: string;
  unitAmountCents: number;
  stripePriceId: string | null;
  stripeLookupKey: string | null;
  isActive: boolean;
  archivedAt?: string | Date | null;
}

export interface CatalogPlanTranslations {
  name?: string;
  features?: string[];
}

export interface CatalogPlan {
  id?: string;
  slug: string;
  name: string;
  description?: string | null;
  kind: PricingPlanKind;
  level: PricingPlanLevel;
  creditsAmount: number | null;
  isSystem: boolean;
  isActive: boolean;
  isPublic: boolean;
  highlight: boolean;
  sortOrder: number;
  limits: PlanLimits;
  ai: {
    initialCredits?: number;
    monthlyCredits: number;
    dailyLimit: number;
    scope: AiCreditScope;
  };
  social: SocialLimits;
  features: string[];
  translations: Partial<Record<'en' | 'es' | 'pt-BR', CatalogPlanTranslations>> | null;
  stripeProductId?: string | null;
  prices: CatalogPrice[];
  pricingVersion?: number;
}

export type CatalogBySlug = Record<string, CatalogPlan>;

export interface PlanCatalogSnapshot {
  plans: CatalogPlan[];
  bySlug: CatalogBySlug;
  source: 'static' | 'db';
}

/** Legacy display shape used by existing UI (prices.monthlyCents / features). */
export interface PlanDefinition {
  name: string;
  level: PricingPlanLevel;
  prices: {
    monthlyCents: number;
    annualCents?: number;
  };
  limits: PlanLimits;
  ai: CatalogPlan['ai'];
  social: SocialLimits;
  features: string[];
  highlight: boolean;
}

export const PLAN_ALIASES = {
  catechist_pro: 'single',
  catechist_ai: 'single',
  parish_essential: 'single',
  parish: 'unlimited',
  parish_complete: 'unlimited',
  diocese: 'unlimited',
} as const satisfies Record<string, KnownPlanId>;

export type LegacyPlanId = keyof typeof PLAN_ALIASES;

const ALIAS_LOOKUP: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const [alias, canonical] of Object.entries(PLAN_ALIASES)) {
    map[alias.toLowerCase()] = canonical;
    map[alias.toUpperCase()] = canonical;
  }
  return map;
})();

/**
 * Maps a TenantBilling.plan enum/string (legacy or current) to a canonical slug.
 * Mirrors the SQL CASE in the catalog migration.
 */
export function mapLegacyTenantPlan(value: string): string {
  const upper = value.toUpperCase();
  const mapping: Record<string, string> = {
    PARISH_COMPLETE: 'unlimited',
    DIOCESE: 'unlimited',
    PARISH: 'unlimited',
    UNLIMITED: 'unlimited',
    CATECHIST_PRO: 'single',
    CATECHIST_AI: 'single',
    PARISH_ESSENTIAL: 'single',
    SINGLE: 'single',
    CATECHIST_FREE: 'catechist_free',
    MISSIONARY_FREE: 'catechist_free',
  };
  if (mapping[upper]) return mapping[upper];
  const resolved = ALIAS_LOOKUP[value] ?? ALIAS_LOOKUP[value.toLowerCase()];
  if (resolved) return resolved;
  return value.toLowerCase();
}

function price(
  interval: PricingInterval,
  cents: number,
  lookup: string,
): CatalogPrice {
  return {
    interval,
    currency: 'BRL',
    unitAmountCents: cents,
    stripePriceId: null,
    stripeLookupKey: lookup,
    isActive: true,
    archivedAt: null,
  };
}

/**
 * Static catalog — must stay in lockstep with the previous hardcoded PLANS.
 * Catequista (`single`) and Paróquia (`unlimited`) are public self-serve.
 * Diocese is sales-assisted (WhatsApp + admin license), not a Stripe SKU.
 */
export const DEFAULT_PLAN_LIST: CatalogPlan[] = [
  {
    slug: 'catechist_free',
    name: 'Sem assinatura',
    description: 'Sentinela de acesso zero (sem assinatura).',
    kind: 'subscription',
    level: 'personal',
    creditsAmount: null,
    isSystem: true,
    isActive: false,
    isPublic: false,
    highlight: false,
    sortOrder: 0,
    limits: {
      maxClasses: 0,
      maxCatechumens: 0,
      maxCatechists: 0,
      maxParishes: 0,
    },
    ai: { monthlyCredits: 0, dailyLimit: 0, scope: 'user' },
    social: { maxPostsPerDay: 0, maxMediaPerPost: 0, maxVideoSeconds: 0 },
    features: [],
    translations: {
      en: { name: 'No subscription', features: [] },
      es: { name: 'Sin suscripción', features: [] },
    },
    stripeProductId: null,
    prices: [price('monthly', 0, 'catechist_free_monthly')],
    pricingVersion: PRICING_VERSION,
  },
  {
    slug: 'single',
    name: 'Plano Catequista',
    description: '1 paróquia, 3 turmas, 150 catequizandos no total.',
    kind: 'subscription',
    level: 'personal',
    creditsAmount: null,
    isSystem: true,
    isActive: true,
    isPublic: true,
    highlight: true,
    sortOrder: 1,
    limits: {
      maxClasses: 3,
      maxCatechumens: 150,
      maxCatechists: 1,
      maxParishes: 1,
    },
    ai: { monthlyCredits: 0, dailyLimit: 0, scope: 'user' },
    social: { maxPostsPerDay: 5, maxMediaPerPost: 4, maxVideoSeconds: 180 },
    features: [
      'Até 3 turmas',
      '150 catequizandos no total',
      'Presença e calendário litúrgico',
      'Publicar na Comunidade',
      'Consome calendário e subsídios oficiais da paróquia',
    ],
    translations: {
      en: {
        name: 'Catechist Plan',
        features: [
          'Up to 3 classes',
          '150 catechumens in total',
          'Attendance and liturgical calendar',
          'Portal for the families in your class',
          'Receives official parish calendar and subsidies',
        ],
      },
      es: {
        name: 'Plan Catequista',
        features: [
          'Hasta 3 grupos',
          '150 catecúmenos en total',
          'Asistencia y calendario litúrgico',
          'Portal para las familias de tu grupo',
          'Recibe el calendario y los subsidios oficiales de la parroquia',
        ],
      },
    },
    stripeProductId: null,
    prices: [
      price('monthly', 990, 'single_monthly'),
      price('annual', 9900, 'single_annual'),
    ],
    pricingVersion: PRICING_VERSION,
  },
  {
    slug: 'unlimited',
    name: 'Plano Paróquia',
    description: 'Paróquia — turmas, catequizandos e equipe ilimitados.',
    kind: 'subscription',
    level: 'institutional',
    creditsAmount: null,
    isSystem: false,
    isActive: true,
    isPublic: true,
    highlight: false,
    sortOrder: 2,
    limits: {
      maxClasses: null,
      maxCatechumens: null,
      maxCatechists: null,
      maxParishes: null,
    },
    ai: { monthlyCredits: 0, dailyLimit: 0, scope: 'user' },
    social: { maxPostsPerDay: 30, maxMediaPerPost: 10, maxVideoSeconds: 900 },
    features: [
      'Turmas e equipe ilimitadas',
      'Catequizandos ilimitados',
      'Espaço institucional da paróquia',
      'Comunicação integrada (pais/catequizandos)',
      'Documentos e certidões',
      'Calendário, pasta e comunicados para comunidades e turmas',
    ],
    translations: {
      en: {
        name: 'Parish Plan',
        features: [
          'Unlimited classes and team',
          'Unlimited catechumens',
          'Institutional parish workspace',
          'Integrated communication',
          'Documents and certificates',
          'Calendar, folder and announcements for communities and classes',
        ],
      },
      es: {
        name: 'Plan Parroquia',
        features: [
          'Grupos y equipo ilimitados',
          'Catecúmenos ilimitados',
          'Espacio institucional de la parroquia',
          'Comunicación integrada',
          'Documentos y certificados',
          'Calendario, carpeta y comunicados para comunidades y grupos',
        ],
      },
    },
    stripeProductId: null,
    prices: [
      price('monthly', 9900, 'unlimited_monthly'),
      price('annual', 99000, 'unlimited_annual'),
    ],
    pricingVersion: PRICING_VERSION,
  },
  {
    slug: 'ai_credits_20',
    name: '+20 Créditos editoriais',
    description: 'Pacote avulso de 20 créditos editoriais.',
    kind: 'credits',
    level: 'personal',
    creditsAmount: 20,
    isSystem: false,
    isActive: false,
    isPublic: false,
    highlight: false,
    sortOrder: 10,
    limits: {
      maxClasses: 0,
      maxCatechumens: 0,
      maxCatechists: 0,
      maxParishes: 0,
    },
    ai: { monthlyCredits: 0, dailyLimit: 0, scope: 'user' },
    social: { maxPostsPerDay: 0, maxMediaPerPost: 0, maxVideoSeconds: 0 },
    features: ['+20 créditos editoriais'],
    translations: {
      en: { name: '+20 Editorial credits', features: ['+20 editorial credits'] },
      es: { name: '+20 créditos editoriales', features: ['+20 créditos editoriales'] },
    },
    stripeProductId: null,
    prices: [price('one_time', 2500, 'ai_credits_20_one_time')],
    pricingVersion: PRICING_VERSION,
  },
  {
    slug: 'ai_credits_50',
    name: '+50 Créditos editoriais',
    description: 'Pacote avulso de 50 créditos editoriais.',
    kind: 'credits',
    level: 'personal',
    creditsAmount: 50,
    isSystem: false,
    isActive: false,
    isPublic: false,
    highlight: false,
    sortOrder: 11,
    limits: {
      maxClasses: 0,
      maxCatechumens: 0,
      maxCatechists: 0,
      maxParishes: 0,
    },
    ai: { monthlyCredits: 0, dailyLimit: 0, scope: 'user' },
    social: { maxPostsPerDay: 0, maxMediaPerPost: 0, maxVideoSeconds: 0 },
    features: ['+50 créditos editoriais'],
    translations: {
      en: { name: '+50 Editorial credits', features: ['+50 editorial credits'] },
      es: { name: '+50 créditos editoriales', features: ['+50 créditos editoriales'] },
    },
    stripeProductId: null,
    prices: [price('one_time', 4500, 'ai_credits_50_one_time')],
    pricingVersion: PRICING_VERSION,
  },
];

export const DEFAULT_PLANS_BY_SLUG: CatalogBySlug = Object.fromEntries(
  DEFAULT_PLAN_LIST.map((plan) => [plan.slug, plan]),
);

export const DEFAULT_PLANS = DEFAULT_PLANS_BY_SLUG;

export function snapshotFromPlans(
  plans: CatalogPlan[],
  source: 'static' | 'db',
): PlanCatalogSnapshot {
  const sorted = [...plans].sort((a, b) => a.sortOrder - b.sortOrder);
  return {
    plans: sorted,
    bySlug: Object.fromEntries(sorted.map((plan) => [plan.slug, plan])),
    source,
  };
}

export const DEFAULT_CATALOG_SNAPSHOT = snapshotFromPlans(DEFAULT_PLAN_LIST, 'static');

/**
 * True while the static catalog hides Unlimited. Derived from DEFAULT_PLANS.
 * Public UI should prefer plan.isPublic from the live catalog.
 */
export const LAUNCH_CATEQUISTA_ONLY = !DEFAULT_PLANS.unlimited.isPublic;

/** True when the live public catalog has no institutional plan on sale. */
export function catalogIsCatequistaOnly(
  plans: Array<{ slug?: string; level: string }>,
): boolean {
  return !plans.some((plan) => plan.level === 'institutional');
}

export function getAllPlanIds(catalog: CatalogBySlug = DEFAULT_PLANS_BY_SLUG): string[] {
  return Object.values(catalog)
    .filter((plan) => plan.kind === 'subscription')
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((plan) => plan.slug);
}

export function getAvailablePlanIds(catalog: CatalogBySlug = DEFAULT_PLANS_BY_SLUG): string[] {
  return Object.values(catalog)
    .filter(
      (plan) =>
        plan.kind === 'subscription' &&
        plan.slug !== 'catechist_free' &&
        plan.isPublic &&
        plan.isActive,
    )
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((plan) => plan.slug);
}

export function resolvePlanId(
  raw: string,
  catalog: CatalogBySlug = DEFAULT_PLANS_BY_SLUG,
): string | null {
  const lower = raw.toLowerCase();
  if (catalog[lower]) return catalog[lower].slug;
  if ((PLAN_IDS as readonly string[]).includes(lower)) return lower;
  if (catalog[raw]) return catalog[raw].slug;
  return ALIAS_LOOKUP[lower] ?? ALIAS_LOOKUP[raw] ?? ALIAS_LOOKUP[raw.toUpperCase()] ?? null;
}

export function resolvePlanIdOrFree(
  raw: string | null | undefined,
  catalog: CatalogBySlug = DEFAULT_PLANS_BY_SLUG,
): string {
  if (!raw) return 'catechist_free';
  return resolvePlanId(raw, catalog) ?? 'catechist_free';
}

export function getCatalogPlan(
  plan: string | null | undefined,
  catalog: CatalogBySlug = DEFAULT_PLANS_BY_SLUG,
): CatalogPlan {
  const slug = resolvePlanIdOrFree(plan, catalog);
  return catalog[slug] ?? DEFAULT_PLANS_BY_SLUG.catechist_free;
}

export function toPlanDefinition(plan: CatalogPlan): PlanDefinition {
  const monthly = plan.prices.find((p) => p.interval === 'monthly' && p.isActive);
  const annual = plan.prices.find((p) => p.interval === 'annual' && p.isActive);
  const oneTime = plan.prices.find((p) => p.interval === 'one_time' && p.isActive);
  return {
    name: plan.name,
    level: plan.level,
    prices: {
      monthlyCents: monthly?.unitAmountCents ?? oneTime?.unitAmountCents ?? 0,
      annualCents: annual?.unitAmountCents,
    },
    limits: plan.limits,
    ai: plan.ai,
    social: plan.social,
    features: plan.features,
    highlight: plan.highlight,
  };
}

export const PLANS: Record<string, PlanDefinition> = Object.fromEntries(
  DEFAULT_PLAN_LIST.filter((plan) => plan.kind === 'subscription').map((plan) => [
    plan.slug,
    toPlanDefinition(plan),
  ]),
) as Record<KnownPlanId, PlanDefinition> & Record<string, PlanDefinition>;

export const PLAN_NAMES: Record<string, string> = Object.fromEntries(
  Object.values(DEFAULT_PLANS_BY_SLUG).map((plan) => [plan.slug, plan.name]),
);
for (const [alias, canonical] of Object.entries(PLAN_ALIASES)) {
  PLAN_NAMES[alias.toLowerCase()] = DEFAULT_PLANS_BY_SLUG[canonical].name;
  PLAN_NAMES[alias.toUpperCase()] = DEFAULT_PLANS_BY_SLUG[canonical].name;
}

export const LIMIT_LABELS: Record<string, string> = {
  parish_limit: 'paróquia',
  class_limit: 'turma',
  catechumen_limit: 'catequizando',
  catechist_limit: 'catequista',
  social_post_limit: 'publicação diária',
};

export function getPlanLimits(
  plan: string | null | undefined,
  catalog: CatalogBySlug = DEFAULT_PLANS_BY_SLUG,
): PlanLimits {
  return getCatalogPlan(plan, catalog).limits;
}

export function getSocialLimits(
  plan: string | null | undefined,
  catalog: CatalogBySlug = DEFAULT_PLANS_BY_SLUG,
): SocialLimits {
  return getCatalogPlan(plan, catalog).social;
}

export function planCanPublishSocial(
  plan: string | null | undefined,
  catalog: CatalogBySlug = DEFAULT_PLANS_BY_SLUG,
): boolean {
  const limits = getSocialLimits(plan, catalog);
  return limits.maxPostsPerDay === null || limits.maxPostsPerDay > 0;
}

export function planName(
  plan: string | null,
  catalog: CatalogBySlug = DEFAULT_PLANS_BY_SLUG,
): string {
  if (!plan) return DEFAULT_PLANS_BY_SLUG.catechist_free.name;
  const resolved = resolvePlanId(plan, catalog);
  if (resolved && catalog[resolved]) return catalog[resolved].name;
  return PLAN_NAMES[plan.toLowerCase()] ?? PLAN_NAMES[plan.toUpperCase()] ?? DEFAULT_PLANS_BY_SLUG.catechist_free.name;
}

export function localizedPlanField(
  plan: CatalogPlan,
  lang: string | undefined,
): { name: string; features: string[] } {
  const locale = (lang || 'pt-BR').toLowerCase();
  const key = locale.startsWith('en') ? 'en' : locale.startsWith('es') ? 'es' : 'pt-BR';
  const overlay = plan.translations?.[key];
  return {
    name: overlay?.name || plan.name,
    features: overlay?.features?.length ? overlay.features : plan.features,
  };
}

export function planHasAiAccess(
  plan: string | null | undefined,
  catalog: CatalogBySlug = DEFAULT_PLANS_BY_SLUG,
): boolean {
  if (!plan) return false;
  const def = getCatalogPlan(plan, catalog);
  if (def.slug === 'catechist_free' && resolvePlanId(plan, catalog) == null && !catalog[plan.toLowerCase()]) {
    return false;
  }
  const resolved = resolvePlanId(plan, catalog);
  if (!resolved) return false;
  const found = catalog[resolved];
  if (!found) return false;
  return found.ai.monthlyCredits > 0 || (found.ai.initialCredits ?? 0) > 0;
}

export function getMonthlyAllowance(
  plan: string | null | undefined,
  catalog: CatalogBySlug = DEFAULT_PLANS_BY_SLUG,
): number {
  if (!plan) return 0;
  const resolved = resolvePlanId(plan, catalog);
  if (!resolved) return 0;
  return (catalog[resolved] ?? DEFAULT_PLANS_BY_SLUG.catechist_free).ai.monthlyCredits;
}

export function getDailyLimit(
  plan: string | null | undefined,
  catalog: CatalogBySlug = DEFAULT_PLANS_BY_SLUG,
): number {
  return getCatalogPlan(plan, catalog).ai.dailyLimit;
}

export function getAiCreditScope(
  planId: string,
  catalog: CatalogBySlug = DEFAULT_PLANS_BY_SLUG,
): AiCreditScope {
  return getCatalogPlan(planId, catalog).ai.scope;
}

export function getInitialCredits(
  planId: string,
  catalog: CatalogBySlug = DEFAULT_PLANS_BY_SLUG,
): number {
  return getCatalogPlan(planId, catalog).ai.initialCredits ?? 0;
}

export const AI_CREDIT_COST = {
  generateMeeting: 1,
  generateAnnualPlanning: 3,
  generateActivity: 1,
  chatMessage: 0,
  collaborativeSession: 1,
} as const;

export const FREE_TRIAL_CREDITS = 0;

export const AI_CREDITS = {
  AI_PLANS: Object.values(DEFAULT_PLANS_BY_SLUG)
    .filter((def) => def.ai.monthlyCredits > 0 || (def.ai.initialCredits ?? 0) > 0)
    .flatMap((def) => [def.slug, def.slug.toUpperCase()]) as string[],

  MONTHLY_ALLOWANCE: Object.fromEntries(
    Object.values(DEFAULT_PLANS_BY_SLUG).flatMap((def) => [
      [def.slug, def.ai.monthlyCredits],
      [def.slug.toUpperCase(), def.ai.monthlyCredits],
    ]),
  ) as Record<string, number>,

  DAILY_LIMIT: Object.fromEntries(
    Object.values(DEFAULT_PLANS_BY_SLUG).flatMap((def) => [
      [def.slug, def.ai.dailyLimit],
      [def.slug.toUpperCase(), def.ai.dailyLimit],
    ]),
  ) as Record<string, number>,

  FREE_TRIAL_CREDITS,
  COST: AI_CREDIT_COST,
} as const;

export function getPlanPriceCents(
  planId: string,
  interval: 'monthly' | 'annual',
  catalog: CatalogBySlug = DEFAULT_PLANS_BY_SLUG,
): number {
  const plan = getCatalogPlan(planId, catalog);
  const wanted: PricingInterval = interval === 'annual' ? 'annual' : 'monthly';
  const match = plan.prices.find((p) => p.interval === wanted && p.isActive);
  if (match) return match.unitAmountCents;
  const monthly = plan.prices.find((p) => p.interval === 'monthly' && p.isActive);
  return monthly?.unitAmountCents ?? 0;
}

export function getActiveCatalogPrice(
  plan: CatalogPlan,
  interval: 'monthly' | 'annual' | 'one_time',
): CatalogPrice | undefined {
  return plan.prices.find((p) => p.interval === interval && p.isActive);
}

export function isInstitutionalPlan(
  plan: string | null | undefined,
  catalog: CatalogBySlug = DEFAULT_PLANS_BY_SLUG,
): boolean {
  if (!plan) return false;
  const resolved = resolvePlanId(plan, catalog);
  if (resolved && catalog[resolved]) {
    return catalog[resolved].level === 'institutional';
  }
  const fallback = ALIAS_LOOKUP[plan.toLowerCase()] ?? ALIAS_LOOKUP[plan.toUpperCase()];
  if (fallback && catalog[fallback]) return catalog[fallback].level === 'institutional';
  return false;
}

export function isPersonalPlan(
  plan: string | null | undefined,
  catalog: CatalogBySlug = DEFAULT_PLANS_BY_SLUG,
): boolean {
  if (!plan) return false;
  const resolved = resolvePlanId(plan, catalog);
  if (resolved && catalog[resolved]) {
    return catalog[resolved].level === 'personal';
  }
  return (['catechist_free', 'single'] as string[]).includes((resolved || plan).toLowerCase());
}

export const INSTITUTIONAL_PLANS = [
  'UNLIMITED', 'unlimited',
  'PARISH_COMPLETE', 'parish_complete',
  'PARISH_ESSENTIAL', 'parish_essential',
  'DIOCESE', 'diocese',
  'PARISH', 'parish',
] as const;

/**
 * Values to use in Prisma `plan: { in: ... }` filters after TenantBilling.plan
 * became a free-form slug. Includes lowercase canonical slugs, uppercase enum
 * leftovers, and PLAN_ALIASES so pre- and post-migration rows both match.
 */
export function prismaPlanValues(...canonicalSlugs: string[]): string[] {
  const out = new Set<string>();
  for (const slug of canonicalSlugs) {
    const canonical = mapLegacyTenantPlan(slug);
    out.add(canonical);
    out.add(canonical.toUpperCase());
    for (const [alias, target] of Object.entries(PLAN_ALIASES)) {
      if (target === canonical) {
        out.add(alias);
        out.add(alias.toLowerCase());
        out.add(alias.toUpperCase());
      }
    }
  }
  return [...out];
}

export const PRISMA_FREE_PLANS = prismaPlanValues('catechist_free');
export const PRISMA_INSTITUTIONAL_PLANS = prismaPlanValues('unlimited');
export const PRISMA_PAID_PARISH_PLANS = prismaPlanValues('unlimited', 'single');

export function catalogEffect(plan: CatalogPlan): { kind: 'subscription' } | { kind: 'credits'; amount: number } {
  if (plan.kind === 'credits') {
    return { kind: 'credits', amount: plan.creditsAmount ?? 0 };
  }
  return { kind: 'subscription' };
}

export const AI_CREDIT_PACKS: Record<AiCreditPackId, { credits: number; priceCents: number }> = {
  ai_credits_20: {
    credits: DEFAULT_PLANS_BY_SLUG.ai_credits_20.creditsAmount ?? 20,
    priceCents: getActiveCatalogPrice(DEFAULT_PLANS_BY_SLUG.ai_credits_20, 'one_time')?.unitAmountCents ?? 2500,
  },
  ai_credits_50: {
    credits: DEFAULT_PLANS_BY_SLUG.ai_credits_50.creditsAmount ?? 50,
    priceCents: getActiveCatalogPrice(DEFAULT_PLANS_BY_SLUG.ai_credits_50, 'one_time')?.unitAmountCents ?? 4500,
  },
};

export function publicCatalogPlans(catalog: CatalogBySlug = DEFAULT_PLANS_BY_SLUG): CatalogPlan[] {
  return Object.values(catalog)
    .filter((plan) => plan.isPublic && plan.isActive)
    .filter((plan) => plan.kind !== 'credits' || AI_FEATURES_ENABLED)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((plan) => ({
      ...plan,
      prices: plan.prices.filter((p) => p.isActive),
    }));
}

export function lookupKeyFor(slug: string, interval: PricingInterval): string {
  return `${slug}_${interval}`;
}

/** Inverse of lookupKeyFor. Handles slugs that themselves contain underscores. */
export function slugFromLookupKey(lookupKey: string | null | undefined): string | null {
  if (!lookupKey) return null;
  for (const suffix of ['_monthly', '_annual', '_one_time'] as const) {
    if (lookupKey.endsWith(suffix)) {
      return lookupKey.slice(0, -suffix.length);
    }
  }
  return null;
}

export function formatPriceLabel(cents: number, interval: 'monthly' | 'annual' | 'one_time'): string {
  const value = (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  if (interval === 'annual') return `${value}/ano`;
  if (interval === 'one_time') return value;
  return `${value}/mês`;
}
