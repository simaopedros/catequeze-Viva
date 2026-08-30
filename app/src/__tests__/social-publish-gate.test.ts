import { describe, expect, it, vi } from 'vitest';

vi.mock('wasp/server', () => ({
  HttpError: class HttpError extends Error {
    statusCode: number;
    constructor(statusCode: number, message?: string) {
      super(message);
      this.statusCode = statusCode;
    }
  },
}));

// The Comunidade module ships disabled (shared/socialFeatures). These tests
// cover the entitlement rules themselves, so the feature gate is forced on.
vi.mock('../server/social/featureGate', () => ({
  SOCIAL_FEATURES_ENABLED: true,
  isSocialEnabled: () => true,
  assertSocialEnabled: () => {},
}));

type FakeUser = {
  id?: string;
  subscriptionStatus?: string | null;
  subscriptionPlan?: string | null;
  createdAt?: Date;
  paymentProcessorUserId?: string | null;
  socialBannedAt?: Date | null;
  socialBanReason?: string | null;
};

type FakeOptions = {
  user?: FakeUser;
  memberships?: { parishId: string }[];
  parishes?: { id: string; type: string; dioceseId?: string | null; ownerId?: string | null }[];
  parishBillings?: any[];
  postsToday?: number;
};

const YESTERDAY = new Date(Date.now() - 24 * 60 * 60 * 1000);

function makeCtx(options: FakeOptions = {}) {
  const user: FakeUser = {
    id: 'user-1',
    subscriptionStatus: null,
    subscriptionPlan: 'catechist_free',
    // Outside the signup trial window so ensureProductTrial does not grant access.
    createdAt: new Date('2020-01-01T00:00:00Z'),
    paymentProcessorUserId: 'cus_test',
    socialBannedAt: null,
    socialBanReason: null,
    ...options.user,
  };

  const parishes = options.parishes ?? [];
  const parishBillings = options.parishBillings ?? [];

  return {
    user: { id: user.id, isAdmin: false },
    entities: {
      User: {
        findUnique: vi.fn(async () => user),
        findMany: vi.fn(async () => []),
        update: vi.fn(async ({ data }: any) => Object.assign(user, data)),
      },
      Membership: {
        findMany: vi.fn(async () => options.memberships ?? []),
      },
      Parish: {
        findMany: vi.fn(async () => parishes),
      },
      TenantBilling: {
        findMany: vi.fn(async ({ where }: any) => {
          if (where?.parishId?.in) return parishBillings;
          return [];
        }),
      },
      SocialPost: {
        count: vi.fn(async () => options.postsToday ?? 0),
      },
    },
  };
}

function billing(parishId: string, plan: string, status = 'ACTIVE') {
  return {
    parishId,
    plan,
    status,
    trialEndsAt: null,
    maxClasses: null,
    maxCatechumens: null,
    maxCatechists: null,
    maxParishes: null,
  };
}

describe('resolveSocialEntitlement', () => {
  it('gives no publishing entitlement without a subscription', async () => {
    const { resolveSocialEntitlement } = await import('../server/social/publishGate');
    const entitlement = await resolveSocialEntitlement(makeCtx(), 'user-1');

    expect(entitlement.plan).toBe('catechist_free');
    expect(entitlement.canPublish).toBe(false);
    expect(entitlement.limits.maxPostsPerDay).toBe(0);
  });

  it('grants Single entitlements to an active personal subscriber', async () => {
    const { resolveSocialEntitlement } = await import('../server/social/publishGate');
    const entitlement = await resolveSocialEntitlement(
      makeCtx({ user: { subscriptionStatus: 'active', subscriptionPlan: 'single' } }),
      'user-1',
    );

    expect(entitlement.plan).toBe('single');
    expect(entitlement.source).toBe('personal');
    expect(entitlement.limits.maxPostsPerDay).toBe(5);
    expect(entitlement.limits.maxVideoSeconds).toBe(180);
  });

  it('treats the no-card product trial as Single', async () => {
    const { resolveSocialEntitlement } = await import('../server/social/publishGate');
    const entitlement = await resolveSocialEntitlement(
      makeCtx({
        user: {
          subscriptionStatus: 'trialing',
          subscriptionPlan: 'single',
          createdAt: YESTERDAY,
          paymentProcessorUserId: null,
        },
      }),
      'user-1',
    );

    expect(entitlement.plan).toBe('single');
    expect(entitlement.source).toBe('trial');
    expect(entitlement.canPublish).toBe(true);
  });

  it('lets a collaborator publish through an active institutional workspace', async () => {
    const { resolveSocialEntitlement } = await import('../server/social/publishGate');
    const entitlement = await resolveSocialEntitlement(
      makeCtx({
        memberships: [{ parishId: 'parish-1' }],
        parishes: [{ id: 'parish-1', type: 'PARISH', dioceseId: null, ownerId: null }],
        parishBillings: [billing('parish-1', 'UNLIMITED')],
      }),
      'user-1',
    );

    expect(entitlement.plan).toBe('unlimited');
    expect(entitlement.source).toBe('institutional');
    expect(entitlement.parishId).toBe('parish-1');
    expect(entitlement.limits.maxPostsPerDay).toBe(30);
  });

  it('ignores a canceled workspace subscription', async () => {
    const { resolveSocialEntitlement } = await import('../server/social/publishGate');
    const entitlement = await resolveSocialEntitlement(
      makeCtx({
        memberships: [{ parishId: 'parish-1' }],
        parishes: [{ id: 'parish-1', type: 'PARISH', dioceseId: null, ownerId: null }],
        parishBillings: [billing('parish-1', 'UNLIMITED', 'CANCELED')],
      }),
      'user-1',
    );

    expect(entitlement.canPublish).toBe(false);
  });
});

describe('assertCanPublishSocial', () => {
  it('rejects anonymous visitors', async () => {
    const { assertCanPublishSocial } = await import('../server/social/publishGate');
    const ctx: any = makeCtx();
    ctx.user = null;

    await expect(assertCanPublishSocial(ctx)).rejects.toMatchObject({ statusCode: 401 });
  });

  it('rejects users without a subscription', async () => {
    const { assertCanPublishSocial } = await import('../server/social/publishGate');

    await expect(assertCanPublishSocial(makeCtx())).rejects.toMatchObject({
      statusCode: 403,
      message: expect.stringContaining('SUBSCRIPTION_REQUIRED'),
    });
  });

  it('rejects banned authors even with an active plan', async () => {
    const { assertCanPublishSocial } = await import('../server/social/publishGate');
    const ctx = makeCtx({
      user: {
        subscriptionStatus: 'active',
        subscriptionPlan: 'single',
        socialBannedAt: new Date(),
        socialBanReason: 'Conteúdo ofensivo',
      },
    });

    await expect(assertCanPublishSocial(ctx)).rejects.toMatchObject({
      statusCode: 403,
      message: expect.stringContaining('suspensa'),
    });
  });

  it('allows an active subscriber under the daily quota', async () => {
    const { assertCanPublishSocial } = await import('../server/social/publishGate');
    const entitlement = await assertCanPublishSocial(
      makeCtx({
        user: { subscriptionStatus: 'active', subscriptionPlan: 'single' },
        postsToday: 4,
      }),
    );

    expect(entitlement.plan).toBe('single');
  });

  it('rejects once the daily quota is reached', async () => {
    const { assertCanPublishSocial } = await import('../server/social/publishGate');

    await expect(
      assertCanPublishSocial(
        makeCtx({
          user: { subscriptionStatus: 'active', subscriptionPlan: 'single' },
          postsToday: 5,
        }),
      ),
    ).rejects.toMatchObject({
      statusCode: 403,
      message: expect.stringContaining('LIMIT'),
    });
  });

  it('skips the quota check when asked (comments and reactions)', async () => {
    const { assertCanPublishSocial } = await import('../server/social/publishGate');
    const ctx = makeCtx({
      user: { subscriptionStatus: 'active', subscriptionPlan: 'single' },
      postsToday: 99,
    });

    await expect(assertCanPublishSocial(ctx, { skipQuota: true })).resolves.toMatchObject({
      plan: 'single',
    });
  });
});

describe('assertMediaWithinPlan', () => {
  it('rejects more media than the plan allows', async () => {
    const { assertMediaWithinPlan } = await import('../server/social/publishGate');
    const { getSocialLimits } = await import('../shared/planLimits');

    const entitlement = {
      plan: 'single' as const,
      source: 'personal' as const,
      limits: getSocialLimits('single'),
      canPublish: true,
      parishId: null,
    };

    expect(() =>
      assertMediaWithinPlan(
        entitlement,
        Array.from({ length: 5 }, () => ({ kind: 'IMAGE' as const })),
      ),
    ).toThrowError(/LIMIT/);
  });

  it('rejects videos longer than the plan allows', async () => {
    const { assertMediaWithinPlan } = await import('../server/social/publishGate');
    const { getSocialLimits } = await import('../shared/planLimits');

    const entitlement = {
      plan: 'single' as const,
      source: 'personal' as const,
      limits: getSocialLimits('single'),
      canPublish: true,
      parishId: null,
    };

    expect(() =>
      assertMediaWithinPlan(entitlement, [{ kind: 'VIDEO', durationSeconds: 240 }]),
    ).toThrowError(/LIMIT/);
    expect(() =>
      assertMediaWithinPlan(entitlement, [{ kind: 'VIDEO', durationSeconds: 120 }]),
    ).not.toThrow();
  });
});
