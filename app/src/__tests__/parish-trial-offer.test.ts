/**
 * Regression: creating a parish on the free sentinel must offer the 7-day
 * parish trial (PARISH_TRIAL_AVAILABLE) instead of a dead-end 0/0 LIMIT.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('wasp/server', () => {
  class HttpError extends Error {
    statusCode: number;
    constructor(statusCode: number, message?: string) {
      super(message);
      this.statusCode = statusCode;
    }
  }
  return { HttpError };
});

vi.mock('../server/pricing/planCatalogService', () => ({
  loadPlanCatalog: vi.fn(async () => ({
    bySlug: {
      catechist_free: {
        slug: 'catechist_free',
        limits: {
          maxClasses: 0,
          maxCatechumens: 0,
          maxCatechists: 0,
          maxParishes: 0,
        },
      },
      single: {
        slug: 'single',
        limits: {
          maxClasses: 3,
          maxCatechumens: 150,
          maxCatechists: 1,
          maxParishes: 1,
        },
      },
    },
  })),
}));

import {
  assertCanCreateParish,
  PARISH_TRIAL_AVAILABLE_PREFIX,
} from '../server/operations/billingEnforcement';

function makeContext(user: {
  id: string;
  subscriptionStatus: string | null;
  subscriptionPlan: string | null;
  createdAt: Date;
  paymentProcessorUserId?: string | null;
  trialEndsAt?: Date | null;
}) {
  const row = {
    subscriptionStatus: user.subscriptionStatus,
    subscriptionPlan: user.subscriptionPlan,
    createdAt: user.createdAt,
    paymentProcessorUserId: user.paymentProcessorUserId ?? null,
    trialEndsAt: user.trialEndsAt ?? null,
    datePaid: null,
  };
  return {
    user: { id: user.id, isAdmin: false },
    entities: {
      User: {
        findUnique: vi.fn(async () => ({ ...row })),
        update: vi.fn(async ({ data }: any) => Object.assign(row, data)),
        updateMany: vi.fn(async ({ data }: any) => {
          Object.assign(row, data);
          return { count: 1 };
        }),
      },
      TenantBilling: {
        findUnique: vi.fn(async () => null),
      },
      Parish: {
        count: vi.fn(async () => 0),
      },
    },
  };
}

describe('assertCanCreateParish — parish trial offer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws PARISH_TRIAL_AVAILABLE for free users outside signup trial window', async () => {
    const ctx = makeContext({
      id: 'user-1',
      subscriptionStatus: null,
      subscriptionPlan: 'catechist_free',
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    });

    await expect(assertCanCreateParish(ctx, {})).rejects.toMatchObject({
      statusCode: 403,
      message: expect.stringContaining(PARISH_TRIAL_AVAILABLE_PREFIX),
    });
  });

  it('allows creation when startTrial is true', async () => {
    const ctx = makeContext({
      id: 'user-1',
      subscriptionStatus: null,
      subscriptionPlan: 'catechist_free',
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    });

    await expect(
      assertCanCreateParish(ctx, { startTrial: true }),
    ).resolves.toBeUndefined();
  });

  it('grants the no-card in-app trial to new users still inside the signup window', async () => {
    const ctx = makeContext({
      id: 'user-1',
      subscriptionStatus: null,
      subscriptionPlan: 'catechist_free',
      createdAt: new Date(),
    });

    await expect(assertCanCreateParish(ctx, {})).resolves.toBeUndefined();
    expect(ctx.entities.User.updateMany).toHaveBeenCalledTimes(1);
  });

  it('offers the parish trial to users whose in-app trial is already used', async () => {
    const ctx = makeContext({
      id: 'user-1',
      subscriptionStatus: null,
      subscriptionPlan: 'catechist_free',
      createdAt: new Date(),
      trialEndsAt: new Date(Date.now() - 60 * 1000),
    });

    await expect(assertCanCreateParish(ctx, {})).rejects.toMatchObject({
      statusCode: 403,
      message: expect.stringContaining(PARISH_TRIAL_AVAILABLE_PREFIX),
    });
    expect(ctx.entities.User.updateMany).not.toHaveBeenCalled();
  });

  it('allows creation for grandfather in-app trial users', async () => {
    const ctx = makeContext({
      id: 'user-1',
      subscriptionStatus: 'trialing',
      subscriptionPlan: 'single',
      createdAt: new Date(),
    });

    await expect(assertCanCreateParish(ctx, {})).resolves.toBeUndefined();
  });
});
