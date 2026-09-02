import { describe, expect, it, vi } from 'vitest';

vi.mock('../payment/paymentProcessorPlans', () => ({
  readEnvStripePriceId: () => '',
}));

vi.mock('../server/pricing/stripeCatalogSync', () => ({
  importStripePrice: vi.fn().mockResolvedValue(null),
}));

import { DEFAULT_PLAN_LIST, DEFAULT_PLANS_BY_SLUG } from '../shared/planCatalog';
import { defaultPlansMatchSnapshot, ensurePricingCatalogSeeded } from '../server/scripts/seedPricingCatalog';

describe('seedPricingCatalog snapshot', () => {
  it('seed snapshot matches DEFAULT_PLANS', () => {
    const snapshot = defaultPlansMatchSnapshot(DEFAULT_PLAN_LIST);
    expect(snapshot).toEqual([
      {
        slug: 'catechist_free',
        monthlyCents: 0,
        annualCents: null,
        maxClasses: 0,
        maxCatechumens: 0,
        isSystem: true,
        isPublic: false,
        isActive: false,
      },
      {
        slug: 'single',
        monthlyCents: 990,
        annualCents: 9900,
        maxClasses: 3,
        maxCatechumens: 150,
        isSystem: true,
        isPublic: true,
        isActive: true,
      },
      {
        slug: 'unlimited',
        monthlyCents: 9900,
        annualCents: 99000,
        maxClasses: null,
        maxCatechumens: null,
        isSystem: false,
        isPublic: false,
        isActive: false,
      },
      {
        slug: 'ai_credits_20',
        monthlyCents: 2500,
        annualCents: null,
        maxClasses: 0,
        maxCatechumens: 0,
        isSystem: false,
        isPublic: false,
        isActive: false,
      },
      {
        slug: 'ai_credits_50',
        monthlyCents: 4500,
        annualCents: null,
        maxClasses: 0,
        maxCatechumens: 0,
        isSystem: false,
        isPublic: false,
        isActive: false,
      },
    ]);
    expect(DEFAULT_PLANS_BY_SLUG.single.isSystem).toBe(true);
    expect(DEFAULT_PLANS_BY_SLUG.catechist_free.isSystem).toBe(true);
  });

  it('is idempotent in shape (running twice yields the same snapshot)', () => {
    expect(defaultPlansMatchSnapshot(DEFAULT_PLAN_LIST)).toEqual(
      defaultPlansMatchSnapshot(DEFAULT_PLAN_LIST),
    );
  });
});

function memoryCatalogDb() {
  const plans = new Map<string, any>();
  const prices: any[] = [];
  return {
    plans,
    prices,
    db: {
      pricingPlan: {
        findUnique: async ({ where }: any) => plans.get(where.slug) ?? null,
        create: async ({ data }: any) => {
          const row = { id: `id-${data.slug}`, stripeProductId: null, ...data };
          plans.set(data.slug, row);
          return row;
        },
        update: async ({ where, data }: any) => {
          const current = [...plans.values()].find((row) => row.id === where.id);
          Object.assign(current, data);
          return current;
        },
      },
      pricingPlanPrice: {
        findFirst: async ({ where }: any) =>
          prices.find(
            (row) =>
              row.planId === where.planId &&
              row.interval === where.interval &&
              row.isActive === where.isActive,
          ) ?? null,
        create: async ({ data }: any) => {
          const row = { id: `price-${prices.length}`, ...data };
          prices.push(row);
          return row;
        },
      },
    },
  };
}

describe('ensurePricingCatalogSeeded', () => {
  it('inserts the five current DEFAULT_PLANS and their prices, then no-ops', async () => {
    const { db, plans } = memoryCatalogDb();
    const expectedPrices = DEFAULT_PLAN_LIST.reduce((sum, plan) => sum + plan.prices.length, 0);

    const first = await ensurePricingCatalogSeeded(db);
    expect(first.createdPlans).toBe(5);
    expect(first.createdPrices).toBe(expectedPrices);
    expect([...plans.keys()].sort()).toEqual([
      'ai_credits_20',
      'ai_credits_50',
      'catechist_free',
      'single',
      'unlimited',
    ]);

    const second = await ensurePricingCatalogSeeded(db);
    expect(second.createdPlans).toBe(0);
    expect(second.createdPrices).toBe(0);
  });

  it('does not overwrite a plan already edited in admin', async () => {
    const { db, plans } = memoryCatalogDb();
    plans.set('single', { id: 'keep', slug: 'single', name: 'Nome editado', stripeProductId: null });
    const createSpy = vi.spyOn(db.pricingPlan, 'create');
    const updateSpy = vi.spyOn(db.pricingPlan, 'update');

    await ensurePricingCatalogSeeded(db);

    expect(createSpy.mock.calls.some((call: any) => call[0].data.slug === 'single')).toBe(false);
    expect(updateSpy).not.toHaveBeenCalled();
    expect(plans.get('single').name).toBe('Nome editado');
  });
});
