/**
 * Idempotent seed of the admin pricing catalog from DEFAULT_PLANS.
 * Imports existing Stripe Price IDs from env vars — never creates Stripe objects.
 */
import type { PrismaClient } from '@prisma/client';
import { DEFAULT_PLAN_LIST, lookupKeyFor, type PricingInterval } from '../../shared/planCatalog';
import { AI_FEATURES_ENABLED } from '../../shared/aiFeatures';
import { isUsableStripePriceId } from '../../payment/stripePriceId';

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

export async function seedPricingCatalog(prismaClient: PrismaClient): Promise<void> {
  const { readEnvStripePriceId } = await import('../../payment/paymentProcessorPlans');
  const { importStripePrice } = await import('../pricing/stripeCatalogSync');
  for (const plan of DEFAULT_PLAN_LIST) {
    const isCredits = plan.kind === 'credits';
    const data = {
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

    const saved = await prismaClient.pricingPlan.upsert({
      where: { slug: plan.slug },
      create: { slug: plan.slug, ...data },
      update: data,
    });

    for (const price of plan.prices) {
      const envPriceId = readEnvStripePriceId(plan.slug, envIntervalFor(price.interval));
      let stripePriceId: string | null = isUsableStripePriceId(envPriceId) ? envPriceId : null;
      let unitAmountCents = price.unitAmountCents;
      let lookupKey = price.stripeLookupKey || lookupKeyFor(plan.slug, price.interval);
      let productId: string | null = saved.stripeProductId ?? null;

      if (stripePriceId) {
        try {
          const imported = await importStripePrice(stripePriceId);
          if (imported) {
            unitAmountCents = imported.unitAmountCents || unitAmountCents;
            lookupKey = imported.lookupKey || lookupKey;
            productId = imported.productId || productId;
          }
        } catch (error) {
          console.warn('[seedPricingCatalog] could not retrieve Stripe price', stripePriceId, error);
        }
      }

      if (productId && productId !== saved.stripeProductId) {
        await prismaClient.pricingPlan.update({
          where: { id: saved.id },
          data: { stripeProductId: productId },
        });
      }

      const existing = await prismaClient.pricingPlanPrice.findFirst({
        where: {
          planId: saved.id,
          interval: toDbInterval(price.interval) as any,
          isActive: true,
        },
      });

      if (existing) {
        await prismaClient.pricingPlanPrice.update({
          where: { id: existing.id },
          data: {
            unitAmountCents,
            stripePriceId: stripePriceId ?? existing.stripePriceId,
            stripeLookupKey: lookupKey,
            currency: 'BRL',
          },
        });
      } else {
        await prismaClient.pricingPlanPrice.create({
          data: {
            planId: saved.id,
            interval: toDbInterval(price.interval) as any,
            currency: 'BRL',
            unitAmountCents,
            stripePriceId,
            stripeLookupKey: lookupKey,
            isActive: true,
          },
        });
      }
    }
  }
}
