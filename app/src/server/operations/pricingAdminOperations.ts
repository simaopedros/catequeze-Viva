import { HttpError } from 'wasp/server';
import * as z from 'zod';
import { requirePlatformAdmin, writeAuditLog } from '../auth/helpers';
import { validateOrThrow } from '../validation';
import {
  SYSTEM_PLAN_SLUGS,
  type PricingInterval,
  type PricingPlanKind,
  type PricingPlanLevel,
} from '../../shared/planCatalog';
import {
  invalidatePlanCatalogCache,
} from '../pricing/planCatalogService';
import { rotateStripePrice } from '../pricing/stripeCatalogSync';
import { ensurePricingCatalogSeeded } from '../scripts/seedPricingCatalog';
import {
  PAYING_USER_WHERE,
  planSlugAliases,
  uniquePayersFromParts,
} from '../billing/accountStatusCounts';
import { createTtlCache } from '../cache/ttlCache';

const ADMIN_PLANS_TTL_MS = 60_000;
const adminPlansCache = createTtlCache<any[]>(ADMIN_PLANS_TTL_MS);

export function clearAdminPlansCacheForTests() {
  adminPlansCache.clear();
}

function invalidateAdminPlansCache() {
  adminPlansCache.clear();
  invalidatePlanCatalogCache();
}

const slugSchema = z
  .string()
  .min(2)
  .max(64)
  .regex(/^[a-z][a-z0-9_]*$/, 'Slug deve ser minúsculo, começar com letra e conter só letras, números e underscore.');

const upsertSchema = z.object({
  id: z.string().optional(),
  slug: slugSchema,
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional().nullable(),
  kind: z.enum(['subscription', 'credits']),
  level: z.enum(['personal', 'institutional']),
  creditsAmount: z.number().int().nonnegative().optional().nullable(),
  isActive: z.boolean(),
  isPublic: z.boolean(),
  highlight: z.boolean().optional().default(false),
  sortOrder: z.number().int().optional(),
  maxClasses: z.number().int().nonnegative().nullable(),
  maxCatechumens: z.number().int().nonnegative().nullable(),
  maxCatechists: z.number().int().nonnegative().nullable(),
  maxParishes: z.number().int().nonnegative().nullable(),
  aiMonthlyCredits: z.number().int().nonnegative().optional().default(0),
  aiDailyLimit: z.number().int().nonnegative().optional().default(0),
  aiInitialCredits: z.number().int().nonnegative().optional().default(0),
  socialMaxPostsPerDay: z.number().int().nonnegative().nullable().optional(),
  socialMaxMediaPerPost: z.number().int().nonnegative().optional().default(0),
  socialMaxVideoSeconds: z.number().int().nonnegative().optional().default(0),
  features: z.array(z.string()).default([]),
  translations: z
    .record(z.string(), z.object({
      name: z.string().optional(),
      features: z.array(z.string()).optional(),
    }))
    .optional()
    .nullable(),
  confirmLimitReduction: z.boolean().optional(),
});

const setPriceSchema = z.object({
  planId: z.string().min(1),
  interval: z.enum(['monthly', 'annual', 'one_time']),
  unitAmountCents: z.number().int().positive(),
});

const archiveSchema = z.object({
  planId: z.string().min(1),
  confirmAffected: z.boolean().optional(),
});

const reorderSchema = z.object({
  orderedIds: z.array(z.string().min(1)).min(1),
});

function toDbKind(kind: PricingPlanKind): 'SUBSCRIPTION' | 'CREDITS' {
  return kind === 'credits' ? 'CREDITS' : 'SUBSCRIPTION';
}

function toDbLevel(level: PricingPlanLevel): 'PERSONAL' | 'INSTITUTIONAL' {
  return level === 'institutional' ? 'INSTITUTIONAL' : 'PERSONAL';
}

function toDbInterval(interval: PricingInterval): 'MONTHLY' | 'ANNUAL' | 'ONE_TIME' {
  if (interval === 'annual') return 'ANNUAL';
  if (interval === 'one_time') return 'ONE_TIME';
  return 'MONTHLY';
}

function isSystemSlug(slug: string): boolean {
  return (SYSTEM_PLAN_SLUGS as readonly string[]).includes(slug);
}

function limitReduced(previous: number | null | undefined, next: number | null | undefined): boolean {
  if (previous == null && next != null) return true;
  if (previous != null && next != null && next < previous) return true;
  return false;
}

async function countActiveSubscribers(context: any, slug: string) {
  const aliases = planSlugAliases(slug);
  const [users, tenants] = await Promise.all([
    context.entities.User.count({
      where: {
        subscriptionPlan: { in: aliases },
        subscriptionStatus: { in: ['active', 'cancel_at_period_end', 'past_due', 'trialing'] },
      },
    }),
    context.entities.TenantBilling.count({
      where: {
        plan: { in: aliases },
        status: { in: ['ACTIVE', 'PAST_DUE', 'TRIAL'] },
      },
    }),
  ]);
  return { users, tenants, total: users + tenants };
}

type CountBucket = { users: number; tenants: number; doubleCounted: number };

function emptyBucket(): CountBucket {
  return { users: 0, tenants: 0, doubleCounted: 0 };
}

/**
 * Batch audience counts for every plan slug (few groupBy queries instead of N×count).
 * No Stripe calls — DB only.
 */
async function loadPlanAudienceCounts(
  context: any,
  slugs: string[],
  now: Date,
): Promise<
  Map<
    string,
    {
      subscribers: { users: number; tenants: number; total: number };
      paying: { users: number; tenants: number; total: number };
      trial: { users: number; tenants: number; total: number };
    }
  >
> {
  const aliasToSlug = new Map<string, string>();
  for (const slug of slugs) {
    for (const alias of planSlugAliases(slug)) {
      aliasToSlug.set(alias, slug);
    }
  }
  const allAliases = [...aliasToSlug.keys()];

  const add = (
    map: Map<string, CountBucket>,
    planKey: string | null | undefined,
    field: keyof CountBucket,
    n: number,
  ) => {
    if (!planKey) return;
    const slug = aliasToSlug.get(planKey);
    if (!slug) return;
    const bucket = map.get(slug) ?? emptyBucket();
    bucket[field] += n;
    map.set(slug, bucket);
  };

  const subscriberUsers = new Map<string, CountBucket>();
  const payingMap = new Map<string, CountBucket>();
  const trialMap = new Map<string, CountBucket>();

  if (allAliases.length === 0) {
    return new Map();
  }

  const [
    userSubscriberGroups,
    userPayingGroups,
    userTrialGroups,
    tenantSubscriberGroups,
    tenantPayingGroups,
    tenantTrialGroups,
    doubleCountedGroups,
  ] = await Promise.all([
    context.entities.User.groupBy({
      by: ['subscriptionPlan'],
      where: {
        subscriptionPlan: { in: allAliases },
        subscriptionStatus: { in: ['active', 'cancel_at_period_end', 'past_due', 'trialing'] },
      },
      _count: { _all: true },
    }),
    context.entities.User.groupBy({
      by: ['subscriptionPlan'],
      where: {
        subscriptionPlan: { in: allAliases },
        ...PAYING_USER_WHERE,
      },
      _count: { _all: true },
    }),
    context.entities.User.groupBy({
      by: ['subscriptionPlan'],
      where: {
        subscriptionPlan: { in: allAliases },
        subscriptionStatus: 'trialing',
        trialEndsAt: { gte: now },
      },
      _count: { _all: true },
    }),
    context.entities.TenantBilling.groupBy({
      by: ['plan'],
      where: {
        plan: { in: allAliases },
        status: { in: ['ACTIVE', 'PAST_DUE', 'TRIAL'] },
      },
      _count: { _all: true },
    }),
    context.entities.TenantBilling.groupBy({
      by: ['plan'],
      where: {
        plan: { in: allAliases },
        status: 'ACTIVE',
        parish: {
          owner: { ...PAYING_USER_WHERE },
        },
      },
      _count: { _all: true },
    }),
    context.entities.TenantBilling.groupBy({
      by: ['plan'],
      where: {
        plan: { in: allAliases },
        status: 'TRIAL',
        trialEndsAt: { gte: now },
      },
      _count: { _all: true },
    }),
    context.entities.TenantBilling.groupBy({
      by: ['plan'],
      where: {
        plan: { in: allAliases },
        status: 'ACTIVE',
        parish: {
          owner: {
            subscriptionPlan: { in: allAliases },
            ...PAYING_USER_WHERE,
          },
        },
      },
      _count: { _all: true },
    }),
  ]);

  for (const row of userSubscriberGroups) {
    add(subscriberUsers, row.subscriptionPlan, 'users', row._count._all);
  }
  for (const row of tenantSubscriberGroups) {
    add(subscriberUsers, row.plan, 'tenants', row._count._all);
  }
  for (const row of userPayingGroups) {
    add(payingMap, row.subscriptionPlan, 'users', row._count._all);
  }
  for (const row of tenantPayingGroups) {
    add(payingMap, row.plan, 'tenants', row._count._all);
  }
  for (const row of doubleCountedGroups) {
    add(payingMap, row.plan, 'doubleCounted', row._count._all);
  }
  for (const row of userTrialGroups) {
    add(trialMap, row.subscriptionPlan, 'users', row._count._all);
  }
  for (const row of tenantTrialGroups) {
    add(trialMap, row.plan, 'tenants', row._count._all);
  }

  const result = new Map<
    string,
    {
      subscribers: { users: number; tenants: number; total: number };
      paying: { users: number; tenants: number; total: number };
      trial: { users: number; tenants: number; total: number };
    }
  >();

  for (const slug of slugs) {
    const sub = subscriberUsers.get(slug) ?? emptyBucket();
    const pay = payingMap.get(slug) ?? emptyBucket();
    const trial = trialMap.get(slug) ?? emptyBucket();
    result.set(slug, {
      subscribers: {
        users: sub.users,
        tenants: sub.tenants,
        total: sub.users + sub.tenants,
      },
      paying: {
        users: pay.users,
        tenants: pay.tenants,
        total: uniquePayersFromParts(pay.users, pay.tenants, pay.doubleCounted),
      },
      trial: {
        users: trial.users,
        tenants: trial.tenants,
        total: trial.users + trial.tenants,
      },
    });
  }

  return result;
}

export const listPricingPlansAdmin = async (_args: void, context: any) => {
  requirePlatformAdmin(context.user);

  const cached = adminPlansCache.get();
  if (cached) return cached;

  // Seed only when the catalog table is empty — avoids Stripe price retrieves on every load.
  const existingCount = await context.entities.PricingPlan.count();
  if (existingCount === 0) {
    const seeded = await ensurePricingCatalogSeeded({
      pricingPlan: context.entities.PricingPlan,
      pricingPlanPrice: context.entities.PricingPlanPrice,
    });
    if (seeded.createdPlans > 0 || seeded.createdPrices > 0) {
      invalidatePlanCatalogCache();
    }
  }

  const rows = await context.entities.PricingPlan.findMany({
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      kind: true,
      level: true,
      creditsAmount: true,
      isSystem: true,
      isActive: true,
      isPublic: true,
      highlight: true,
      sortOrder: true,
      maxClasses: true,
      maxCatechumens: true,
      maxCatechists: true,
      maxParishes: true,
      aiMonthlyCredits: true,
      aiDailyLimit: true,
      aiInitialCredits: true,
      socialMaxPostsPerDay: true,
      socialMaxMediaPerPost: true,
      socialMaxVideoSeconds: true,
      features: true,
      translations: true,
      pricingVersion: true,
      stripeProductId: true,
      createdAt: true,
      updatedAt: true,
      prices: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          interval: true,
          currency: true,
          unitAmountCents: true,
          stripePriceId: true,
          stripeLookupKey: true,
          isActive: true,
          archivedAt: true,
          createdAt: true,
        },
      },
    },
    orderBy: { sortOrder: 'asc' },
  });

  const now = new Date();
  const audience = await loadPlanAudienceCounts(
    context,
    rows.map((row: { slug: string }) => row.slug),
    now,
  );

  const withCounts = rows.map((row: any) => {
    const counts = audience.get(row.slug) ?? {
      subscribers: { users: 0, tenants: 0, total: 0 },
      paying: { users: 0, tenants: 0, total: 0 },
      trial: { users: 0, tenants: 0, total: 0 },
    };
    return {
      ...row,
      subscriberCount: counts.subscribers.total,
      subscriberUsers: counts.subscribers.users,
      subscriberTenants: counts.subscribers.tenants,
      payingCount: counts.paying.total,
      trialCount: counts.trial.total,
    };
  });

  adminPlansCache.set(withCounts);
  return withCounts;
};

export const upsertPricingPlan = async (rawInput: unknown, context: any) => {
  requirePlatformAdmin(context.user);
  const input = validateOrThrow(upsertSchema, rawInput);

  const existing = input.id
    ? await context.entities.PricingPlan.findUnique({ where: { id: input.id } })
    : await context.entities.PricingPlan.findUnique({ where: { slug: input.slug } });

  if (existing && existing.slug !== input.slug) {
    throw new HttpError(400, 'O slug de um plano existente não pode ser alterado.');
  }
  if (existing && isSystemSlug(existing.slug) && input.slug !== existing.slug) {
    throw new HttpError(400, 'Planos de sistema não podem ter o slug alterado.');
  }

  const reducingLimits = existing && (
    limitReduced(existing.maxClasses, input.maxClasses) ||
    limitReduced(existing.maxCatechumens, input.maxCatechumens) ||
    limitReduced(existing.maxCatechists, input.maxCatechists) ||
    limitReduced(existing.maxParishes, input.maxParishes)
  );

  const subscribers = existing ? await countActiveSubscribers(context, existing.slug) : { users: 0, tenants: 0, total: 0 };
  const impactPreview = {
    subscribersAffected: subscribers.total,
    reducingLimits: Boolean(reducingLimits),
  };

  if (reducingLimits && subscribers.total > 0 && !input.confirmLimitReduction) {
    return {
      needsConfirmation: true,
      impactPreview,
      plan: existing,
    };
  }

  const data = {
    slug: input.slug,
    name: input.name,
    description: input.description ?? null,
    kind: toDbKind(input.kind as PricingPlanKind),
    level: toDbLevel(input.level as PricingPlanLevel),
    creditsAmount: input.kind === 'credits' ? (input.creditsAmount ?? 0) : null,
    isSystem: existing?.isSystem ?? isSystemSlug(input.slug),
    isActive: input.isActive,
    isPublic: input.isPublic,
    highlight: input.highlight ?? false,
    sortOrder: input.sortOrder ?? existing?.sortOrder ?? 100,
    maxClasses: input.maxClasses,
    maxCatechumens: input.maxCatechumens,
    maxCatechists: input.maxCatechists,
    maxParishes: input.maxParishes,
    aiMonthlyCredits: input.aiMonthlyCredits ?? 0,
    aiDailyLimit: input.aiDailyLimit ?? 0,
    aiInitialCredits: input.aiInitialCredits ?? 0,
    socialMaxPostsPerDay: input.socialMaxPostsPerDay ?? null,
    socialMaxMediaPerPost: input.socialMaxMediaPerPost ?? 0,
    socialMaxVideoSeconds: input.socialMaxVideoSeconds ?? 0,
    features: input.features,
    translations: input.translations ?? undefined,
  };

  const saved = existing
    ? await context.entities.PricingPlan.update({ where: { id: existing.id }, data, include: { prices: true } })
    : await context.entities.PricingPlan.create({ data, include: { prices: true } });

  invalidateAdminPlansCache();
  await writeAuditLog(context, existing ? 'UPDATE' : 'CREATE', 'PricingPlan', saved.id, {
    operation: existing ? 'PRICING_PLAN_UPDATE' : 'PRICING_PLAN_CREATE',
    before: existing,
    after: data,
    impactPreview,
  });

  return { needsConfirmation: false, impactPreview, plan: saved };
};

export const setPricingPlanPrice = async (rawInput: unknown, context: any) => {
  requirePlatformAdmin(context.user);
  const input = validateOrThrow(setPriceSchema, rawInput);

  const plan = await context.entities.PricingPlan.findUnique({
    where: { id: input.planId },
    include: { prices: true },
  });
  if (!plan) throw new HttpError(404, 'Plano não encontrado.');

  const current = (plan.prices as any[]).find(
    (price) => price.interval === toDbInterval(input.interval as PricingInterval) && price.isActive,
  );

  const rotated = await rotateStripePrice({
    plan: {
      slug: plan.slug,
      name: plan.name,
      kind: plan.kind === 'CREDITS' ? 'credits' : 'subscription',
      stripeProductId: plan.stripeProductId,
    },
    interval: input.interval as PricingInterval,
    unitAmountCents: input.unitAmountCents,
    previousStripePriceId: current?.stripePriceId ?? null,
  });

  if (plan.stripeProductId !== rotated.productId) {
    await context.entities.PricingPlan.update({
      where: { id: plan.id },
      data: { stripeProductId: rotated.productId },
    });
  }

  if (current) {
    await context.entities.PricingPlanPrice.update({
      where: { id: current.id },
      data: {
        isActive: false,
        archivedAt: new Date(),
        // Free the unique lookup key so the new active row can reuse it.
        stripeLookupKey: current.stripeLookupKey
          ? `${current.stripeLookupKey}_archived_${String(current.id).slice(0, 8)}`
          : null,
      },
    });
  }

  const created = await context.entities.PricingPlanPrice.create({
    data: {
      planId: plan.id,
      interval: toDbInterval(input.interval as PricingInterval),
      currency: 'BRL',
      unitAmountCents: input.unitAmountCents,
      stripePriceId: rotated.priceId,
      stripeLookupKey: rotated.lookupKey,
      isActive: true,
    },
  });

  invalidateAdminPlansCache();
  await writeAuditLog(context, 'UPDATE', 'PricingPlanPrice', created.id, {
    operation: 'PRICING_PLAN_PRICE_ROTATE',
    planId: plan.id,
    slug: plan.slug,
    interval: input.interval,
    previousPriceId: current?.stripePriceId ?? null,
    newPriceId: rotated.priceId,
    unitAmountCents: input.unitAmountCents,
  });

  return {
    price: created,
    archivedPriceId: current?.id ?? null,
    message: 'Assinantes atuais continuam no preço anterior. Apenas novas compras usam o valor novo.',
  };
};

export const archivePricingPlan = async (rawInput: unknown, context: any) => {
  requirePlatformAdmin(context.user);
  const input = validateOrThrow(archiveSchema, rawInput);

  const plan = await context.entities.PricingPlan.findUnique({ where: { id: input.planId } });
  if (!plan) throw new HttpError(404, 'Plano não encontrado.');
  if (plan.isSystem || isSystemSlug(plan.slug)) {
    throw new HttpError(400, 'Planos de sistema não podem ser arquivados.');
  }

  const subscribers = await countActiveSubscribers(context, plan.slug);
  if (subscribers.total > 0 && !input.confirmAffected) {
    return {
      needsConfirmation: true,
      affected: subscribers.total,
      plan,
    };
  }

  const saved = await context.entities.PricingPlan.update({
    where: { id: plan.id },
    data: { isActive: false, isPublic: false },
  });

  invalidateAdminPlansCache();
  await writeAuditLog(context, 'UPDATE', 'PricingPlan', saved.id, {
    operation: 'PRICING_PLAN_ARCHIVE',
    slug: plan.slug,
    affected: subscribers.total,
  });

  return { needsConfirmation: false, affected: subscribers.total, plan: saved };
};

export const reorderPricingPlans = async (rawInput: unknown, context: any) => {
  requirePlatformAdmin(context.user);
  const input = validateOrThrow(reorderSchema, rawInput);

  await Promise.all(
    input.orderedIds.map((id, index) =>
      context.entities.PricingPlan.update({
        where: { id },
        data: { sortOrder: index },
      }),
    ),
  );

  invalidateAdminPlansCache();
  await writeAuditLog(context, 'UPDATE', 'PricingPlan', input.orderedIds[0], {
    operation: 'PRICING_PLAN_REORDER',
    orderedIds: input.orderedIds,
  });

  return { success: true };
};

export async function buildImpactPreviewForTests(
  context: any,
  slug: string,
): Promise<{ users: number; tenants: number; total: number }> {
  return countActiveSubscribers(context, slug);
}
