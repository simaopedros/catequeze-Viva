/**
 * Server-side plan catalog loader.
 *
 * PRICING_CATALOG_SOURCE=static (default): identical to hardcoded DEFAULT_PLANS
 * plus Stripe Price IDs from env vars. No DB reads on the hot path.
 *
 * PRICING_CATALOG_SOURCE=db: load PricingPlan + prices (including archived)
 * with a 60s in-memory cache. Empty table falls back to DEFAULT_PLANS.
 *
 * Stripe Price ID → plan resolution chain:
 *   1. catalog prices (active + archived)
 *   2. Stripe API lookup_key / product.metadata.planSlug
 *   3. env vars STRIPE_*_PLAN_ID (legacy fallback, logged)
 */

import {
  DEFAULT_PLAN_LIST,
  DEFAULT_PLANS_BY_SLUG,
  slugFromLookupKey,
  snapshotFromPlans,
  type CatalogBySlug,
  type CatalogPlan,
  type CatalogPrice,
  type PlanCatalogSnapshot,
  type PricingInterval,
  type PricingPlanKind,
  type PricingPlanLevel,
} from '../../shared/planCatalog';
import { isUsableStripePriceId } from '../../payment/stripePriceId';
import {
  getPaymentPlanIdByPaymentProcessorPlanId,
  readEnvStripePriceId,
} from '../../payment/paymentProcessorPlans';

const CACHE_TTL_MS = 60_000;

let cachedSnapshot: PlanCatalogSnapshot | null = null;
let cachedAt = 0;

export type PricingCatalogSource = 'static' | 'db';

export function getPricingCatalogSource(): PricingCatalogSource {
  const raw = (process.env.PRICING_CATALOG_SOURCE || 'static').trim().toLowerCase();
  return raw === 'db' ? 'db' : 'static';
}

export function invalidatePlanCatalogCache(): void {
  cachedSnapshot = null;
  cachedAt = 0;
}

export function getCachedPlanCatalogForTests(): PlanCatalogSnapshot | null {
  return cachedSnapshot;
}

type CatalogContext = {
  entities?: {
    PricingPlan?: {
      findMany: (args: unknown) => Promise<any[]>;
      findFirst?: (args: unknown) => Promise<any | null>;
    };
    PricingPlanPrice?: {
      findFirst: (args: unknown) => Promise<any | null>;
    };
  };
};

function cloneDefaultSnapshot(): PlanCatalogSnapshot {
  return snapshotFromPlans(
    DEFAULT_PLAN_LIST.map((plan) => ({
      ...plan,
      prices: plan.prices.map((price) => ({ ...price })),
    })),
    'static',
  );
}

function attachEnvPriceIds(snapshot: PlanCatalogSnapshot): PlanCatalogSnapshot {
  const envInterval: Record<string, Partial<Record<PricingInterval, 'monthly' | 'annual'>>> = {
    single: { monthly: 'monthly', annual: 'annual' },
    unlimited: { monthly: 'monthly', annual: 'annual' },
    ai_credits_20: { one_time: 'monthly' },
    ai_credits_50: { one_time: 'monthly' },
  };

  for (const plan of snapshot.plans) {
    const mapping = envInterval[plan.slug];
    if (!mapping) continue;
    for (const price of plan.prices) {
      const envIntervalName = mapping[price.interval];
      if (!envIntervalName) continue;
      const fromEnv = readEnvStripePriceId(plan.slug, envIntervalName);
      if (fromEnv) {
        price.stripePriceId = fromEnv;
      }
    }
  }
  return snapshot;
}

function mapDbKind(kind: string): PricingPlanKind {
  return kind === 'CREDITS' ? 'credits' : 'subscription';
}

function mapDbLevel(level: string): PricingPlanLevel {
  return level === 'INSTITUTIONAL' ? 'institutional' : 'personal';
}

function mapDbInterval(interval: string): PricingInterval {
  if (interval === 'ANNUAL') return 'annual';
  if (interval === 'ONE_TIME') return 'one_time';
  return 'monthly';
}

function parseJsonArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item) => typeof item === 'string');
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
    } catch {
      return [];
    }
  }
  return [];
}

function rowToCatalogPlan(row: any): CatalogPlan {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description ?? null,
    kind: mapDbKind(row.kind),
    level: mapDbLevel(row.level),
    creditsAmount: row.creditsAmount ?? null,
    isSystem: Boolean(row.isSystem),
    isActive: Boolean(row.isActive),
    isPublic: Boolean(row.isPublic),
    highlight: Boolean(row.highlight),
    sortOrder: row.sortOrder ?? 0,
    limits: {
      maxClasses: row.maxClasses ?? null,
      maxCatechumens: row.maxCatechumens ?? null,
      maxCatechists: row.maxCatechists ?? null,
      maxParishes: row.maxParishes ?? null,
    },
    ai: {
      monthlyCredits: row.aiMonthlyCredits ?? 0,
      dailyLimit: row.aiDailyLimit ?? 0,
      initialCredits: row.aiInitialCredits ?? 0,
      scope: 'user',
    },
    social: {
      // null = unlimited; 0 = blocked. Do not coerce null to 0.
      maxPostsPerDay:
        row.socialMaxPostsPerDay === undefined ? 0 : row.socialMaxPostsPerDay,
      maxMediaPerPost: row.socialMaxMediaPerPost ?? 0,
      maxVideoSeconds: row.socialMaxVideoSeconds ?? 0,
    },
    features: parseJsonArray(row.features),
    translations: (row.translations as CatalogPlan['translations']) ?? null,
    stripeProductId: row.stripeProductId ?? null,
    prices: (row.prices ?? []).map((price: any): CatalogPrice => ({
      interval: mapDbInterval(price.interval),
      currency: price.currency || 'BRL',
      unitAmountCents: price.unitAmountCents,
      stripePriceId: price.stripePriceId ?? null,
      stripeLookupKey: price.stripeLookupKey ?? null,
      isActive: Boolean(price.isActive),
      archivedAt: price.archivedAt ?? null,
    })),
    pricingVersion: row.pricingVersion ?? 3,
  };
}

async function loadFromDatabase(context: CatalogContext): Promise<PlanCatalogSnapshot | null> {
  const delegate = context.entities?.PricingPlan;
  if (!delegate?.findMany) return null;
  try {
    const rows = await delegate.findMany({
      include: { prices: true },
      orderBy: { sortOrder: 'asc' },
    });
    if (!rows || rows.length === 0) return null;
    return snapshotFromPlans(rows.map(rowToCatalogPlan), 'db');
  } catch (error) {
    console.warn('[pricing] failed to load catalog from db, using DEFAULT_PLANS', error);
    return null;
  }
}

export async function loadPlanCatalog(context?: CatalogContext): Promise<PlanCatalogSnapshot> {
  const source = getPricingCatalogSource();
  if (source === 'static') {
    return attachEnvPriceIds(cloneDefaultSnapshot());
  }

  const now = Date.now();
  if (cachedSnapshot && now - cachedAt < CACHE_TTL_MS) {
    return cachedSnapshot;
  }

  const fromDb = context ? await loadFromDatabase(context) : null;
  const snapshot = fromDb ?? attachEnvPriceIds(cloneDefaultSnapshot());
  cachedSnapshot = snapshot;
  cachedAt = now;
  return snapshot;
}

export async function requireCatalogPlan(
  context: CatalogContext | undefined,
  slug: string,
): Promise<CatalogPlan> {
  const catalog = await loadPlanCatalog(context);
  const plan = catalog.bySlug[slug] ?? catalog.bySlug[slug.toLowerCase()];
  if (!plan) {
    throw new Error(`Plano "${slug}" não encontrado no catálogo.`);
  }
  return plan;
}

function findPlanByPriceId(catalog: PlanCatalogSnapshot, priceId: string): CatalogPlan | null {
  const target = priceId.trim();
  for (const plan of catalog.plans) {
    if (plan.prices.some((price) => price.stripePriceId === target)) {
      return plan;
    }
  }
  return null;
}

async function resolveFromStripeMetadata(priceId: string): Promise<CatalogPlan | null> {
  try {
    const { stripeClient } = await import('../../payment/stripe/stripeClient');
    const stripePrice = await stripeClient.prices.retrieve(priceId, { expand: ['product'] });
    const lookupKey = stripePrice.lookup_key || '';
    const product = typeof stripePrice.product === 'object' && stripePrice.product && 'metadata' in stripePrice.product
      ? stripePrice.product
      : null;
    const slugFromMeta = product?.metadata?.planSlug || product?.metadata?.plan_id || '';
    const slugFromLookup = slugFromLookupKey(lookupKey) || '';
    const slug = (slugFromMeta || slugFromLookup || '').toLowerCase();
    if (slug && DEFAULT_PLANS_BY_SLUG[slug]) {
      return DEFAULT_PLANS_BY_SLUG[slug];
    }
    return null;
  } catch (error) {
    console.warn('[pricing] Stripe price retrieve failed during catalog fallback', priceId, error);
    return null;
  }
}

export async function resolvePlanByStripePriceId(
  context: CatalogContext | undefined,
  priceId: string,
): Promise<CatalogPlan> {
  const target = priceId.trim();
  const source = getPricingCatalogSource();

  if (source === 'db') {
    const catalog = await loadPlanCatalog(context);
    const fromCatalog = findPlanByPriceId(catalog, target);
    if (fromCatalog) return fromCatalog;

    console.warn('[pricing] priceId not in catalog db, trying Stripe metadata', target);
    const fromStripe = await resolveFromStripeMetadata(target);
    if (fromStripe) return fromStripe;

    console.warn('[pricing] falling back to env vars for priceId', target);
  }

  try {
    const slug = getPaymentPlanIdByPaymentProcessorPlanId(target);
    const plan = DEFAULT_PLANS_BY_SLUG[slug];
    if (plan) return plan;
  } catch {
    // continue
  }

  const fromStripe = await resolveFromStripeMetadata(target);
  if (fromStripe) return fromStripe;

  throw new Error(`Unknown payment processor plan ID: ${priceId}`);
}

export async function requireActiveStripePriceId(
  context: CatalogContext | undefined,
  slug: string,
  interval: 'monthly' | 'annual' | 'one_time' = 'monthly',
): Promise<string> {
  const source = getPricingCatalogSource();
  if (source === 'db') {
    const catalog = await loadPlanCatalog(context);
    const plan = catalog.bySlug[slug];
    const wanted = interval === 'annual' ? 'annual' : interval === 'one_time' ? 'one_time' : 'monthly';
    const match = plan?.prices.find(
      (price) => price.interval === wanted && price.isActive && isUsableStripePriceId(price.stripePriceId),
    );
    if (match?.stripePriceId) return match.stripePriceId.trim();
    console.warn('[pricing] missing db price, falling back to env', slug, interval);
  }

  const envInterval = interval === 'one_time' ? 'monthly' : interval;
  const fromEnv = readEnvStripePriceId(slug, envInterval);
  if (isUsableStripePriceId(fromEnv)) return fromEnv.trim();

  throw new Error(
    `Stripe Price ID não configurado para o plano "${slug}" (${interval}). ` +
      `Defina o preço no admin (/admin/planos) ou a env var correspondente no .env.server.`,
  );
}

export function catalogBySlug(snapshot: PlanCatalogSnapshot): CatalogBySlug {
  return snapshot.bySlug;
}
