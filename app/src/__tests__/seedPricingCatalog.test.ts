import { describe, expect, it } from 'vitest';
import { DEFAULT_PLAN_LIST, DEFAULT_PLANS_BY_SLUG } from '../shared/planCatalog';
import { defaultPlansMatchSnapshot } from '../server/scripts/seedPricingCatalog';

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
