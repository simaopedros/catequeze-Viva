import { beforeEach, describe, expect, it, vi } from 'vitest';

const ENV_SINGLE_MONTHLY = 'price_1EnvSingleMonthlyX';
const ENV_SINGLE_ANNUAL = 'price_1EnvSingleAnnualXX';
const ENV_UNLIMITED_MONTHLY = 'price_1EnvUnlimitedMonth';
const ENV_UNLIMITED_ANNUAL = 'price_1EnvUnlimitedAnnual';
const ENV_AI20 = 'price_1EnvAiCredits20XXX';
const ENV_AI50 = 'price_1EnvAiCredits50XXX';

const waspEnv = {
  STRIPE_SINGLE_PLAN_ID: ENV_SINGLE_MONTHLY,
  STRIPE_SINGLE_ANNUAL_PLAN_ID: ENV_SINGLE_ANNUAL,
  STRIPE_UNLIMITED_PLAN_ID: ENV_UNLIMITED_MONTHLY,
  STRIPE_UNLIMITED_ANNUAL_PLAN_ID: ENV_UNLIMITED_ANNUAL,
  STRIPE_AI_CREDITS_20_PLAN_ID: ENV_AI20,
  STRIPE_AI_CREDITS_50_PLAN_ID: ENV_AI50,
};

vi.mock('wasp/server', () => ({
  env: waspEnv,
}));

describe('planCatalogService', () => {
  beforeEach(() => {
    process.env.PRICING_CATALOG_SOURCE = 'static';
    process.env.STRIPE_SINGLE_PLAN_ID = ENV_SINGLE_MONTHLY;
    process.env.STRIPE_SINGLE_ANNUAL_PLAN_ID = ENV_SINGLE_ANNUAL;
    process.env.STRIPE_UNLIMITED_PLAN_ID = ENV_UNLIMITED_MONTHLY;
    process.env.STRIPE_UNLIMITED_ANNUAL_PLAN_ID = ENV_UNLIMITED_ANNUAL;
    process.env.STRIPE_AI_CREDITS_20_PLAN_ID = ENV_AI20;
    process.env.STRIPE_AI_CREDITS_50_PLAN_ID = ENV_AI50;
    vi.resetModules();
    vi.doMock('wasp/server', () => ({
      env: waspEnv,
    }));
  });

  it('static mode matches DEFAULT_PLANS and attaches env price ids', async () => {
    const { loadPlanCatalog, getPricingCatalogSource } = await import('../server/pricing/planCatalogService');
    const { DEFAULT_PLANS_BY_SLUG } = await import('../shared/planCatalog');
    expect(getPricingCatalogSource()).toBe('static');
    const snapshot = await loadPlanCatalog();
    expect(snapshot.source).toBe('static');
    expect(snapshot.bySlug.single.limits.maxClasses).toBe(DEFAULT_PLANS_BY_SLUG.single.limits.maxClasses);
    expect(snapshot.bySlug.single.prices.find((p) => p.interval === 'monthly')?.stripePriceId).toBe(ENV_SINGLE_MONTHLY);
    expect(snapshot.bySlug.unlimited.isPublic).toBe(false);
  });

  it('defaults to db when PRICING_CATALOG_SOURCE is unset', async () => {
    delete process.env.PRICING_CATALOG_SOURCE;
    const { getPricingCatalogSource } = await import('../server/pricing/planCatalogService');
    expect(getPricingCatalogSource()).toBe('db');
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

  it('db mode includes a newly published custom plan', async () => {
    process.env.PRICING_CATALOG_SOURCE = 'db';
    const { loadPlanCatalog, invalidatePlanCatalogCache } = await import('../server/pricing/planCatalogService');
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
        highlight: true,
        sortOrder: 1,
        maxClasses: 3,
        maxCatechumens: 150,
        maxCatechists: 1,
        maxParishes: 1,
        aiMonthlyCredits: 0,
        aiDailyLimit: 0,
        aiInitialCredits: 0,
        socialMaxPostsPerDay: 5,
        socialMaxMediaPerPost: 4,
        socialMaxVideoSeconds: 180,
        features: [],
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
      {
        id: 'p2',
        slug: 'paroquia_plus',
        name: 'Paróquia Plus',
        kind: 'SUBSCRIPTION',
        level: 'INSTITUTIONAL',
        isSystem: false,
        isActive: true,
        isPublic: true,
        highlight: false,
        sortOrder: 3,
        maxClasses: null,
        maxCatechumens: null,
        maxCatechists: null,
        maxParishes: 5,
        aiMonthlyCredits: 0,
        aiDailyLimit: 0,
        aiInitialCredits: 0,
        socialMaxPostsPerDay: 10,
        socialMaxMediaPerPost: 4,
        socialMaxVideoSeconds: 180,
        features: ['Até 5 paróquias'],
        translations: null,
        prices: [{
          interval: 'MONTHLY',
          currency: 'BRL',
          unitAmountCents: 4900,
          stripePriceId: 'price_db_paroquia',
          stripeLookupKey: 'paroquia_plus_monthly',
          isActive: true,
        }],
      },
    ]);
    const snapshot = await loadPlanCatalog({ entities: { PricingPlan: { findMany } } });
    expect(snapshot.source).toBe('db');
    expect(snapshot.bySlug.paroquia_plus.name).toBe('Paróquia Plus');
    expect(snapshot.bySlug.paroquia_plus.isPublic).toBe(true);
    expect(snapshot.bySlug.paroquia_plus.limits.maxParishes).toBe(5);
  });
});
