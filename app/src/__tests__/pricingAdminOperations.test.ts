import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('wasp/server', () => ({
  HttpError: class HttpError extends Error {
    statusCode: number;
    constructor(statusCode: number, message?: string) {
      super(message);
      this.statusCode = statusCode;
    }
  },
  env: {
    STRIPE_SINGLE_PLAN_ID: 'price_env_single',
    STRIPE_SINGLE_ANNUAL_PLAN_ID: '',
    STRIPE_UNLIMITED_PLAN_ID: '',
    STRIPE_UNLIMITED_ANNUAL_PLAN_ID: '',
    STRIPE_AI_CREDITS_20_PLAN_ID: '',
    STRIPE_AI_CREDITS_50_PLAN_ID: '',
  },
}));

const rotateMock = vi.fn();
vi.mock('../server/pricing/stripeCatalogSync', () => ({
  rotateStripePrice: (...args: unknown[]) => rotateMock(...args),
}));

vi.mock('../server/auth/helpers', () => ({
  requirePlatformAdmin: (user: any) => {
    if (!user?.isAdmin) {
      const error: any = new Error('Admin only');
      error.statusCode = 403;
      throw error;
    }
  },
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../server/validation', () => ({
  validateOrThrow: (_schema: unknown, input: unknown) => input,
}));

import {
  archivePricingPlan,
  listPricingPlansAdmin,
  upsertPricingPlan,
} from '../server/operations/pricingAdminOperations';
import { invalidatePlanCatalogCache } from '../server/pricing/planCatalogService';

function context(user: any, entities: any) {
  return { user, entities };
}

describe('pricingAdminOperations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidatePlanCatalogCache();
  });

  it('rejects non-admins', async () => {
    await expect(listPricingPlansAdmin(undefined, context({ isAdmin: false }, {}))).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it('refuses to archive system plans', async () => {
    const PricingPlan = {
      findUnique: vi.fn().mockResolvedValue({ id: '1', slug: 'single', isSystem: true }),
      update: vi.fn(),
    };
    await expect(
      archivePricingPlan({ planId: '1' }, context({ isAdmin: true }, { PricingPlan, User: {}, TenantBilling: {} })),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(PricingPlan.update).not.toHaveBeenCalled();
  });

  it('requires confirmation when archiving a plan with subscribers', async () => {
    const PricingPlan = {
      findUnique: vi.fn().mockResolvedValue({ id: '1', slug: 'unlimited', isSystem: false }),
      update: vi.fn(),
    };
    const result = await archivePricingPlan(
      { planId: '1' },
      context(
        { isAdmin: true },
        {
          PricingPlan,
          User: { count: vi.fn().mockResolvedValue(2) },
          TenantBilling: { count: vi.fn().mockResolvedValue(1) },
        },
      ),
    );
    expect(result.needsConfirmation).toBe(true);
    expect(result.affected).toBe(3);
    expect(PricingPlan.update).not.toHaveBeenCalled();
  });

  it('requires confirmation when reducing limits for subscribers', async () => {
    const existing = {
      id: '1',
      slug: 'single',
      maxClasses: 3,
      maxCatechumens: 150,
      maxCatechists: 1,
      maxParishes: 1,
      isSystem: true,
    };
    const PricingPlan = {
      findUnique: vi.fn().mockResolvedValue(existing),
      update: vi.fn(),
    };
    const result = await upsertPricingPlan(
      {
        id: '1',
        slug: 'single',
        name: 'Plano Catequista',
        kind: 'subscription',
        level: 'personal',
        isActive: true,
        isPublic: true,
        maxClasses: 1,
        maxCatechumens: 150,
        maxCatechists: 1,
        maxParishes: 1,
        features: [],
      },
      context(
        { isAdmin: true },
        {
          PricingPlan,
          User: { count: vi.fn().mockResolvedValue(4) },
          TenantBilling: { count: vi.fn().mockResolvedValue(0) },
        },
      ),
    );
    expect(result.needsConfirmation).toBe(true);
    expect(PricingPlan.update).not.toHaveBeenCalled();
  });
});
