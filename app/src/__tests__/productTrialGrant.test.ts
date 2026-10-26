import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('wasp/server', () => ({
  HttpError: class HttpError extends Error {
    statusCode: number;
    constructor(statusCode: number, message?: string) {
      super(message);
      this.statusCode = statusCode;
    }
  },
  env: {},
}));

vi.mock('../payment/stripe/syncUserSubscription', () => ({
  refreshUserBillingFromStripe: vi.fn(async () => {
    throw new Error('no stripe in tests');
  }),
}));

import {
  assertCanCreateClass,
  ensureProductTrial,
  isEligibleForNoCardProductTrial,
} from '../server/operations/billingEnforcement';
import {
  PRODUCT_TRIAL_PLAN_ID,
  SUBSCRIPTION_TRIAL_DAYS,
  isInAppProductTrial,
} from '../shared/pricing';

const DAY_MS = 24 * 60 * 60 * 1000;

beforeAll(() => {
  process.env.PRICING_CATALOG_SOURCE = 'static';
});

type FakeUser = {
  id: string;
  subscriptionStatus: string | null;
  subscriptionPlan: string | null;
  createdAt: Date;
  paymentProcessorUserId: string | null;
  trialEndsAt: Date | null;
  datePaid: Date | null;
};

function newUser(overrides: Partial<FakeUser> = {}): FakeUser {
  return {
    id: 'user-1',
    subscriptionStatus: null,
    subscriptionPlan: 'catechist_free',
    createdAt: new Date(Date.now() - 60 * 60 * 1000),
    paymentProcessorUserId: null,
    trialEndsAt: null,
    datePaid: null,
    ...overrides,
  };
}

function matchesWhere(user: FakeUser, where: Record<string, unknown>): boolean {
  return Object.entries(where).every(
    ([key, value]) => (user as any)[key] === value,
  );
}

function makeCtx(user: FakeUser, opts: { activeClasses?: number } = {}) {
  const pick = () => {
    const { id: _id, ...rest } = user;
    return { ...rest };
  };
  const User = {
    findUnique: vi.fn(async () => pick()),
    update: vi.fn(async ({ data }: any) => {
      Object.assign(user, data);
      return pick();
    }),
    updateMany: vi.fn(async ({ where, data }: any) => {
      if (!matchesWhere(user, where)) return { count: 0 };
      Object.assign(user, data);
      return { count: 1 };
    }),
  };
  return {
    user: { id: user.id },
    entities: {
      User,
      Parish: {
        findUnique: vi.fn(async () => ({ type: 'PERSONAL', ownerId: user.id })),
      },
      CatechesisClass: {
        count: vi.fn(async () => opts.activeClasses ?? 0),
      },
    },
  };
}

describe('ensureProductTrial — no-card 7-day grant', () => {
  it('grants trialing on the trial plan until createdAt + 7 days for a new signup', async () => {
    const user = newUser();
    const ctx = makeCtx(user);

    const result = await ensureProductTrial(ctx, user.id);

    expect(result.subscriptionStatus).toBe('trialing');
    expect(result.subscriptionPlan).toBe(PRODUCT_TRIAL_PLAN_ID);
    expect(result.trialEndsAt?.getTime()).toBe(
      user.createdAt.getTime() + SUBSCRIPTION_TRIAL_DAYS * DAY_MS,
    );
    expect(ctx.entities.User.updateMany).toHaveBeenCalledTimes(1);
    expect(ctx.entities.User.updateMany.mock.calls[0][0].where).toEqual({
      id: user.id,
      subscriptionStatus: null,
      paymentProcessorUserId: null,
      trialEndsAt: null,
      datePaid: null,
    });
  });

  it('is idempotent: a second call does not write again or move trialEndsAt', async () => {
    const user = newUser();
    const ctx = makeCtx(user);

    const first = await ensureProductTrial(ctx, user.id);
    const second = await ensureProductTrial(ctx, user.id);

    expect(ctx.entities.User.updateMany).toHaveBeenCalledTimes(1);
    expect(ctx.entities.User.update).not.toHaveBeenCalled();
    expect(second.trialEndsAt?.getTime()).toBe(first.trialEndsAt?.getTime());
    expect(second.subscriptionStatus).toBe('trialing');
  });

  it('does not clobber a Stripe subscription written between read and write', async () => {
    const user = newUser();
    const ctx = makeCtx(user);
    ctx.entities.User.findUnique.mockImplementationOnce(async () => {
      const snapshot = { ...user };
      Object.assign(user, {
        subscriptionStatus: 'active',
        paymentProcessorUserId: 'cus_race',
      });
      const { id: _id, ...rest } = snapshot;
      return rest;
    });

    const result = await ensureProductTrial(ctx, user.id);

    expect(user.subscriptionStatus).toBe('active');
    expect(result.subscriptionStatus).toBe('active');
  });

  it.each([
    ['a Stripe customer', { paymentProcessorUserId: 'cus_1' }],
    ['an active subscription', { subscriptionStatus: 'active', subscriptionPlan: 'single' }],
    ['a canceled subscription', { subscriptionStatus: 'deleted' }],
    [
      'a previous trial',
      {
        subscriptionStatus: null,
        trialEndsAt: new Date(Date.now() - DAY_MS),
      },
    ],
    ['a past payment', { datePaid: new Date(Date.now() - 30 * DAY_MS) }],
    ['an account older than 7 days', { createdAt: new Date(Date.now() - 8 * DAY_MS) }],
  ])('never grants to %s', async (_label, overrides) => {
    const user = newUser(overrides as Partial<FakeUser>);
    const before = { ...user };
    const ctx = makeCtx(user);

    await ensureProductTrial(ctx, user.id);

    expect(ctx.entities.User.updateMany).not.toHaveBeenCalled();
    expect(user).toEqual(before);
  });

  it('keeps healing the plan id of a grandfather in-app trial', async () => {
    const user = newUser({ subscriptionStatus: 'trialing', subscriptionPlan: 'catechist_free' });
    const ctx = makeCtx(user);

    const result = await ensureProductTrial(ctx, user.id);

    expect(ctx.entities.User.updateMany).not.toHaveBeenCalled();
    expect(result.subscriptionPlan).toBe(PRODUCT_TRIAL_PLAN_ID);
    expect(result.trialEndsAt).toBeNull();
  });
});

describe('isEligibleForNoCardProductTrial', () => {
  const now = new Date('2026-03-10T12:00:00.000Z');

  it('accepts a fresh free account with no billing history', () => {
    expect(
      isEligibleForNoCardProductTrial(
        newUser({ createdAt: new Date('2026-03-09T12:00:00.000Z') }),
        now,
      ),
    ).toBe(true);
  });

  it('accepts a null plan', () => {
    expect(
      isEligibleForNoCardProductTrial(
        newUser({ subscriptionPlan: null, createdAt: now }),
        now,
      ),
    ).toBe(true);
  });

  it('rejects a non-free plan id even without status', () => {
    expect(
      isEligibleForNoCardProductTrial(
        newUser({ subscriptionPlan: 'single', createdAt: now }),
        now,
      ),
    ).toBe(false);
  });
});

describe('assertCanCreateClass — personal workspace onboarding', () => {
  it('lets a brand-new signup create the first class', async () => {
    const user = newUser();
    const ctx = makeCtx(user);

    await expect(assertCanCreateClass(ctx, 'personal-1')).resolves.toBeUndefined();
    expect(user.subscriptionStatus).toBe('trialing');
  });

  it('still blocks with LIMIT when the trial was already used', async () => {
    const user = newUser({
      subscriptionStatus: 'deleted',
      createdAt: new Date(Date.now() - 10 * DAY_MS),
      trialEndsAt: new Date(Date.now() - 3 * DAY_MS),
    });
    const ctx = makeCtx(user);

    await expect(assertCanCreateClass(ctx, 'personal-1')).rejects.toMatchObject({
      statusCode: 403,
      message: expect.stringMatching(/^LIMIT:/),
    });
  });
});

describe('isInAppProductTrial', () => {
  const createdAt = new Date('2026-03-05T12:00:00.000Z');

  it('recognises the no-card grant (trialEndsAt = createdAt + 7 days)', () => {
    expect(
      isInAppProductTrial({
        subscriptionStatus: 'trialing',
        createdAt,
        trialEndsAt: new Date(createdAt.getTime() + SUBSCRIPTION_TRIAL_DAYS * DAY_MS),
      }),
    ).toBe(true);
  });

  it('recognises a grandfather trial without trialEndsAt', () => {
    expect(isInAppProductTrial({ subscriptionStatus: 'trialing', createdAt })).toBe(true);
  });

  it('does not treat a Stripe Checkout trial as in-app', () => {
    expect(
      isInAppProductTrial({
        subscriptionStatus: 'trialing',
        createdAt,
        paymentProcessorUserId: 'cus_1',
        trialEndsAt: new Date('2026-03-16T09:31:07.000Z'),
      }),
    ).toBe(false);
  });

  it('is false when not trialing', () => {
    expect(
      isInAppProductTrial({
        subscriptionStatus: 'deleted',
        createdAt,
        trialEndsAt: new Date(createdAt.getTime() + SUBSCRIPTION_TRIAL_DAYS * DAY_MS),
      }),
    ).toBe(false);
  });
});
