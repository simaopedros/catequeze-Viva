/**
 * Idempotent seed of the admin pricing catalog from DEFAULT_PLANS.
 * Imports existing Stripe Price IDs from env vars — never creates Stripe objects.
 *
 * Missing default slugs/prices are inserted. Existing admin rows are never
 * overwritten (so a later deploy cannot wipe edits in /admin/planos).
 */
import type { PrismaClient } from '@prisma/client';
import { DEFAULT_PLAN_LIST, lookupKeyFor, type CatalogPlan, type PricingInterval } from '../../shared/planCatalog';
import { AI_FEATURES_ENABLED } from '../../shared/aiFeatures';
import { isUsableStripePriceId } from '../../payment/stripePriceId';
import { readEnvStripePriceId } from '../../payment/paymentProcessorPlans';
import { importStripePrice } from '../pricing/stripeCatalogSync';

type CatalogSeedDb = {
  pricingPlan: {
    findUnique: (args: any) => Promise<any>;
    create: (args: any) => Promise<any>;
    update: (args: any) => Promise<any>;
  };
  pricingPlanPrice: {
    findFirst: (args: any) => Promise<any>;
    create: (args: any) => Promise<any>;
  };
};

function toDbKind(kind: 'subscription' | 'credits') {
  return kind === 'credits' ? 'CREDITS' : 'SUBSCRIPTION';
}

function toDbLevel(level: 'personal' | 'institutional') {
  return level === 'institutional' ? 'INSTITUTIONAL' : 'PERSONAL';
}

function toDbInterval(interval: PricingInterval) {
  if (interval === 'annual') return 'ANNUAL';
  if (interval === 'one_time') return 'ONE_TIME';
  return 'MONTHLY';
}

function envIntervalFor(interval: PricingInterval): 'monthly' | 'annual' {
  return interval === 'annual' ? 'annual' : 'monthly';
}

function planRowData(plan: CatalogPlan) {
  const isCredits = plan.kind === 'credits';
  return {
    name: plan.name,
    description: plan.description ?? null,
    kind: toDbKind(plan.kind) as any,
    level: toDbLevel(plan.level) as any,
    creditsAmount: plan.creditsAmount,
    isSystem: plan.isSystem,
    isActive: isCredits ? AI_FEATURES_ENABLED && plan.isActive : plan.isActive,
    isPublic: isCredits ? AI_FEATURES_ENABLED && plan.isPublic : plan.isPublic,
    highlight: plan.highlight,
    sortOrder: plan.sortOrder,
    maxClasses: plan.limits.maxClasses,
    maxCatechumens: plan.limits.maxCatechumens,
    maxCatechists: plan.limits.maxCatechists,
    maxParishes: plan.limits.maxParishes,
    aiMonthlyCredits: plan.ai.monthlyCredits,
    aiDailyLimit: plan.ai.dailyLimit,
    aiInitialCredits: plan.ai.initialCredits ?? 0,
    socialMaxPostsPerDay: plan.social.maxPostsPerDay,
    socialMaxMediaPerPost: plan.social.maxMediaPerPost,
    socialMaxVideoSeconds: plan.social.maxVideoSeconds,
    features: plan.features as any,
    translations: plan.translations as any,
    pricingVersion: plan.pricingVersion ?? 3,
  };
}

export function defaultPlansMatchSnapshot(plans: typeof DEFAULT_PLAN_LIST) {
  return plans.map((plan) => ({
    slug: plan.slug,
    monthlyCents: plan.prices.find((p) => p.interval === 'monthly' || p.interval === 'one_time')?.unitAmountCents ?? 0,
    annualCents: plan.prices.find((p) => p.interval === 'annual')?.unitAmountCents ?? null,
    maxClasses: plan.limits.maxClasses,
    maxCatechumens: plan.limits.maxCatechumens,
    isSystem: plan.isSystem,
    isPublic: plan.isPublic,
    isActive: plan.isActive,
  }));
}

async function resolveStripeImport(plan: CatalogPlan, price: CatalogPlan['prices'][number]) {
  const envPriceId = readEnvStripePriceId(plan.slug, envIntervalFor(price.interval));
  let stripePriceId: string | null = isUsableStripePriceId(envPriceId) ? envPriceId : null;
  let unitAmountCents = price.unitAmountCents;
  let lookupKey = price.stripeLookupKey || lookupKeyFor(plan.slug, price.interval);
  let productId: string | null = null;

  if (stripePriceId) {
    try {
      const imported = await importStripePrice(stripePriceId);
      if (imported) {
        unitAmountCents = imported.unitAmountCents || unitAmountCents;
        lookupKey = imported.lookupKey || lookupKey;
        productId = imported.productId || null;
      }
    } catch (error) {
      console.warn('[seedPricingCatalog] could not retrieve Stripe price', stripePriceId, error);
    }
  }

  return { stripePriceId, unitAmountCents, lookupKey, productId };
}

/**
 * Inserts DEFAULT_PLANS that are missing. Never updates an existing plan or price.
 */
export async function ensurePricingCatalogSeeded(db: CatalogSeedDb): Promise<{ createdPlans: number; createdPrices: number }> {
  let createdPlans = 0;
  let createdPrices = 0;

  for (const plan of DEFAULT_PLAN_LIST) {
    let saved = await db.pricingPlan.findUnique({ where: { slug: plan.slug } });
    if (!saved) {
      try {
        saved = await db.pricingPlan.create({
          data: { slug: plan.slug, ...planRowData(plan) },
        });
        createdPlans += 1;
      } catch (error) {
        saved = await db.pricingPlan.findUnique({ where: { slug: plan.slug } });
        if (!saved) throw error;
      }
    }

    for (const price of plan.prices) {
      const existing = await db.pricingPlanPrice.findFirst({
        where: {
          planId: saved.id,
          interval: toDbInterval(price.interval),
          isActive: true,
        },
      });
      if (existing) continue;

      const imported = await resolveStripeImport(plan, price);
      if (imported.productId && imported.productId !== saved.stripeProductId) {
        saved = await db.pricingPlan.update({
          where: { id: saved.id },
          data: { stripeProductId: imported.productId },
        });
      }

      try {
        await db.pricingPlanPrice.create({
          data: {
            planId: saved.id,
            interval: toDbInterval(price.interval),
            currency: 'BRL',
            unitAmountCents: imported.unitAmountCents,
            stripePriceId: imported.stripePriceId,
            stripeLookupKey: imported.lookupKey,
            isActive: true,
          },
        });
        createdPrices += 1;
      } catch (error) {
        const raced = await db.pricingPlanPrice.findFirst({
          where: {
            planId: saved.id,
            interval: toDbInterval(price.interval),
            isActive: true,
          },
        });
        if (!raced) throw error;
      }
    }
  }

  return { createdPlans, createdPrices };
}

export async function seedPricingCatalog(prismaClient: PrismaClient): Promise<void> {
  await ensurePricingCatalogSeeded({
    pricingPlan: prismaClient.pricingPlan,
    pricingPlanPrice: prismaClient.pricingPlanPrice,
  });
}
