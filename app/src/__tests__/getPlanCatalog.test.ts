import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../server/pricing/planCatalogService', () => ({
  loadPlanCatalog: vi.fn(),
}));

import { loadPlanCatalog } from '../server/pricing/planCatalogService';
import { getPlanCatalog } from '../server/operations/planCatalogOperations';
import {
  DEFAULT_PLANS_BY_SLUG,
  catalogIsCatequistaOnly,
  publicCatalogPlans,
  snapshotFromPlans,
  type CatalogPlan,
} from '../shared/planCatalog';

const loadPlanCatalogMock = vi.mocked(loadPlanCatalog);

function customPublishedPlan(): CatalogPlan {
  return {
    ...DEFAULT_PLANS_BY_SLUG.single,
    slug: 'paroquia_plus',
    name: 'Paróquia Plus',
    description: 'Plano novo publicado no admin',
    level: 'institutional',
    isSystem: false,
    isPublic: true,
    isActive: true,
    highlight: false,
    sortOrder: 3,
    limits: {
      maxClasses: null,
      maxCatechumens: null,
      maxCatechists: null,
      maxParishes: 5,
    },
    prices: [
      {
        interval: 'monthly',
        currency: 'BRL',
        unitAmountCents: 4900,
        stripePriceId: 'price_custom',
        stripeLookupKey: 'paroquia_plus_monthly',
        isActive: true,
        archivedAt: null,
      },
    ],
  };
}

describe('getPlanCatalog', () => {
  beforeEach(() => {
    loadPlanCatalogMock.mockReset();
  });

  it('exposes published custom plans and keeps unpublished ones off the sales list', async () => {
    const unpublished = {
      ...DEFAULT_PLANS_BY_SLUG.unlimited,
      isPublic: false,
      isActive: true,
    };
    loadPlanCatalogMock.mockResolvedValue(
      snapshotFromPlans(
        [DEFAULT_PLANS_BY_SLUG.single, unpublished, customPublishedPlan()],
        'db',
      ),
    );

    const listed = await getPlanCatalog(undefined, {});
    expect(listed.map((plan) => plan.slug).sort()).toEqual(['paroquia_plus', 'single']);
    expect(listed.find((plan) => plan.slug === 'paroquia_plus')?.isPublic).toBe(true);
    expect(listed.find((plan) => plan.slug === 'paroquia_plus')?.name).toBe('Paróquia Plus');
  });
});

describe('catalogIsCatequistaOnly', () => {
  it('is false when the static catalog includes Plano Paróquia', () => {
    expect(catalogIsCatequistaOnly(publicCatalogPlans())).toBe(false);
    expect(catalogIsCatequistaOnly([DEFAULT_PLANS_BY_SLUG.single])).toBe(true);
    expect(catalogIsCatequistaOnly([DEFAULT_PLANS_BY_SLUG.single, customPublishedPlan()])).toBe(
      false,
    );
  });
});
