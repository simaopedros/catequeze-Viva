import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('wasp/server', () => ({
  env: {
    STRIPE_SINGLE_PLAN_ID: 'price_env_single',
    STRIPE_SINGLE_ANNUAL_PLAN_ID: 'price_env_single_annual',
    STRIPE_UNLIMITED_PLAN_ID: 'price_env_unlimited',
    STRIPE_UNLIMITED_ANNUAL_PLAN_ID: 'price_env_unlimited_annual',
    STRIPE_AI_CREDITS_20_PLAN_ID: 'price_env_ai20',
    STRIPE_AI_CREDITS_50_PLAN_ID: 'price_env_ai50',
  },
}));

describe('planCatalogService', () => {
  beforeEach(() => {
    process.env.PRICING_CATALOG_SOURCE = 'static';
    vi.resetModules();
  });

  it('static mode matches DEFAULT_PLANS and attaches env price ids', async () => {
    const { loadPlanCatalog, getPricingCatalogSource } = await import('../server/pricing/planCatalogService');
    const { DEFAULT_PLANS_BY_SLUG } = await import('../shared/planCatalog');
    expect(getPricingCatalogSource()).toBe('static');
    const snapshot = await loadPlanCatalog();
    expect(snapshot.source).toBe('static');
    expect(snapshot.bySlug.single.limits.maxClasses).toBe(DEFAULT_PLANS_BY_SLUG.single.limits.maxClasses);
    expect(snapshot.bySlug.single.prices.find((p) => p.interval === 'monthly')?.stripePriceId).toBe('price_env_single');
    expect(snapshot.bySlug.unlimited.isPublic).toBe(false);
  });

  it('db mode uses cache and falls back to DEFAULT when table is empty', async () => {
    process.env.PRICING_CATALOG_SOURCE = 'db';
    const { loadPlanCatalog, invalidatePlanCatalogCache } = await import('../server/pricing/planCatalogService');
    invalidatePlanCatalogCache();
    const findMany = vi.fn().mockResolvedValue([]);
    const first = await loadPlanCatalog({ entities: { PricingPlan: { findMany } } });
    expect(first.source).toBe('static');
    expect(findMany).toHaveBeenCalled();

    findMany.mockResolvedValue([
      {
        id: 'p1',
        slug: 'single',
        name: 'Plano Catequista',
        kind: 'SUBSCRIPTION',
        level: 'PERSONAL',
        isSystem: true,
        isActive: true,
        isPublic: true,
        highlight: false,
        sortOrder: 1,
        maxClasses: 3,
        maxCatechumens: 150,
        maxCatechists: 1,
        maxParishes: 1,
        aiMonthlyCredits: 0,
        aiDailyLimit: 0,
        aiInitialCredits: 0,
        socialMaxPostsPerDay: 0,
        socialMaxMediaPerPost: 0,
        socialMaxVideoSeconds: 0,
        features: ['Até 3 turmas'],
        translations: null,
        prices: [{
          interval: 'MONTHLY',
          currency: 'BRL',
          unitAmountCents: 990,
          stripePriceId: 'price_db_single',
          stripeLookupKey: 'single_monthly',
          isActive: true,
        }],
      },
    ]);
    invalidatePlanCatalogCache();
    const second = await loadPlanCatalog({ entities: { PricingPlan: { findMany } } });
    expect(second.source).toBe('db');
    expect(second.bySlug.single.prices[0].stripePriceId).toBe('price_db_single');
    const third = await loadPlanCatalog({ entities: { PricingPlan: { findMany } } });
    expect(findMany).toHaveBeenCalledTimes(2);
    expect(third.bySlug.single.prices[0].stripePriceId).toBe('price_db_single');
  });

  it('resolves archived stripe price ids from the catalog before env fallback', async () => {
    process.env.PRICING_CATALOG_SOURCE = 'db';
    const { resolvePlanByStripePriceId, invalidatePlanCatalogCache } = await import('../server/pricing/planCatalogService');
    invalidatePlanCatalogCache();
    const findMany = vi.fn().mockResolvedValue([
      {
        id: 'p1',
        slug: 'single',
        name: 'Plano Catequista',
        kind: 'SUBSCRIPTION',
        level: 'PERSONAL',
        isSystem: true,
        isActive: true,
        isPublic: true,
        highlight: false,
        sortOrder: 1,
        maxClasses: 3,
        maxCatechumens: 150,
        maxCatechists: 1,
        maxParishes: 1,
        aiMonthlyCredits: 0,
        aiDailyLimit: 0,
        aiInitialCredits: 0,
        socialMaxPostsPerDay: 0,
        socialMaxMediaPerPost: 0,
        socialMaxVideoSeconds: 0,
        features: [],
        translations: null,
        prices: [{
          interval: 'MONTHLY',
          currency: 'BRL',
          unitAmountCents: 990,
          stripePriceId: 'price_archived_old',
          stripeLookupKey: 'single_monthly',
          isActive: false,
          archivedAt: new Date(),
        }],
      },
    ]);
    const plan = await resolvePlanByStripePriceId(
      { entities: { PricingPlan: { findMany } } },
      'price_archived_old',
    );
    expect(plan.slug).toBe('single');
  });

  it('extracts slugs with underscores from lookup keys', async () => {
    const { slugFromLookupKey } = await import('../shared/planCatalog');
    expect(slugFromLookupKey('ai_credits_20_one_time')).toBe('ai_credits_20');
    expect(slugFromLookupKey('single_monthly')).toBe('single');
    expect(slugFromLookupKey('unlimited_annual')).toBe('unlimited');
  });
});
