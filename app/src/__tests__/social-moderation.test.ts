import { beforeEach, describe, expect, it, vi } from 'vitest';

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

type CtxOptions = {
  user?: { id: string; isAdmin?: boolean } | null;
  postExists?: boolean;
  commentExists?: boolean;
  duplicateReport?: boolean;
};

function makeCtx(options: CtxOptions = {}) {
  const created: any[] = [];
  const updatedPosts: any[] = [];
  const updatedUsers: any[] = [];
  const closedReports: any[] = [];

  const ctx = {
    user: options.user === undefined ? { id: 'reporter-1', isAdmin: false } : options.user,
    entities: {
      SocialPost: {
        findUnique: vi.fn(async () => (options.postExists === false ? null : { id: 'post-1' })),
        update: vi.fn(async (args: any) => {
          updatedPosts.push(args);
          return { id: 'post-1' };
        }),
      },
      SocialComment: {
        findUnique: vi.fn(async () =>
          options.commentExists === false ? null : { id: 'comment-1' },
        ),
        update: vi.fn(async () => ({ id: 'comment-1' })),
      },
      SocialReport: {
        findFirst: vi.fn(async () => (options.duplicateReport ? { id: 'report-1' } : null)),
        create: vi.fn(async (args: any) => {
          created.push(args.data);
          return { id: `report-${created.length}` };
        }),
        updateMany: vi.fn(async (args: any) => {
          closedReports.push(args);
          return { count: 1 };
        }),
      },
      User: {
        update: vi.fn(async (args: any) => {
          updatedUsers.push(args);
          return { id: args.where.id };
        }),
      },
      AuditLog: {
        create: vi.fn(async () => ({ id: 'audit-1' })),
      },
    },
  };

  return { ctx, created, updatedPosts, updatedUsers, closedReports };
}

async function loadModeration() {
  // Fresh module per test so the in-memory report throttle starts empty.
  vi.resetModules();
  return import('../server/operations/socialModerationOperations');
}

describe('reportSocialContent', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it('accepts a report from a signed-in visitor', async () => {
    const { reportSocialContent } = await loadModeration();
    const { ctx, created } = makeCtx();

    const result = await reportSocialContent(
      { targetType: 'POST', targetId: 'post-1', reason: 'HATE', details: 'ofensivo' },
      ctx,
    );

    expect(result).toEqual({ success: true, alreadyReported: false });
    expect(created[0]).toMatchObject({
      targetType: 'POST',
      targetId: 'post-1',
      reason: 'HATE',
      reporterId: 'reporter-1',
    });
  });

  it('accepts an anonymous report', async () => {
    const { reportSocialContent } = await loadModeration();
    const { ctx, created } = makeCtx({ user: null });

    await reportSocialContent({ targetType: 'POST', targetId: 'post-1' }, ctx);

    expect(created[0].reporterId).toBeNull();
    // Unknown reasons fall back instead of failing the report.
    expect(created[0].reason).toBe('OTHER');
  });

  it('falls back to OTHER for an unrecognised reason', async () => {
    const { reportSocialContent } = await loadModeration();
    const { ctx, created } = makeCtx();

    await reportSocialContent(
      { targetType: 'POST', targetId: 'post-1', reason: 'NOT_A_REASON' },
      ctx,
    );

    expect(created[0].reason).toBe('OTHER');
  });

  it('rejects a report on missing content', async () => {
    const { reportSocialContent } = await loadModeration();
    const { ctx } = makeCtx({ postExists: false });

    await expect(
      reportSocialContent({ targetType: 'POST', targetId: 'ghost' }, ctx),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('rejects an empty target', async () => {
    const { reportSocialContent } = await loadModeration();
    const { ctx } = makeCtx();

    await expect(
      reportSocialContent({ targetType: 'POST', targetId: '' }, ctx),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('does not duplicate an open report from the same user', async () => {
    const { reportSocialContent } = await loadModeration();
    const { ctx, created } = makeCtx({ duplicateReport: true });

    const result = await reportSocialContent({ targetType: 'POST', targetId: 'post-1' }, ctx);

    expect(result).toEqual({ success: true, alreadyReported: true });
    expect(created).toHaveLength(0);
  });

  it('throttles bursts of reports', async () => {
    const { reportSocialContent } = await loadModeration();
    const { ctx } = makeCtx({ user: null });

    for (let i = 0; i < 10; i += 1) {
      await reportSocialContent({ targetType: 'POST', targetId: `post-${i}` }, ctx);
    }

    await expect(
      reportSocialContent({ targetType: 'POST', targetId: 'post-11' }, ctx),
    ).rejects.toMatchObject({ statusCode: 429 });
  });
});

describe('moderateSocialContent', () => {
  it('requires a platform admin', async () => {
    const { moderateSocialContent } = await loadModeration();
    const { ctx } = makeCtx({ user: { id: 'user-1', isAdmin: false } });

    await expect(
      moderateSocialContent({ targetType: 'POST', targetId: 'post-1', action: 'REMOVE' }, ctx),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('removes a post and closes its open reports', async () => {
    const { moderateSocialContent } = await loadModeration();
    const { ctx, updatedPosts, closedReports } = makeCtx({
      user: { id: 'admin-1', isAdmin: true },
    });

    await moderateSocialContent(
      { targetType: 'POST', targetId: 'post-1', action: 'REMOVE', reason: 'Discurso de ódio' },
      ctx,
    );

    expect(updatedPosts[0].data).toMatchObject({
      status: 'REMOVED',
      removedById: 'admin-1',
      removalReason: 'Discurso de ódio',
      publishedAt: null,
    });
    expect(closedReports[0].data).toMatchObject({ status: 'ACTIONED', reviewedById: 'admin-1' });
  });

  it('approves a held post back into the feed', async () => {
    const { moderateSocialContent } = await loadModeration();
    const { ctx, updatedPosts } = makeCtx({ user: { id: 'admin-1', isAdmin: true } });

    await moderateSocialContent({ targetType: 'POST', targetId: 'post-1', action: 'APPROVE' }, ctx);

    expect(updatedPosts[0].data).toMatchObject({ status: 'PUBLISHED', removedAt: null });
  });

  it('dismisses a report without touching the content', async () => {
    const { moderateSocialContent } = await loadModeration();
    const { ctx, updatedPosts, closedReports } = makeCtx({
      user: { id: 'admin-1', isAdmin: true },
    });

    await moderateSocialContent({ targetType: 'POST', targetId: 'post-1', action: 'DISMISS' }, ctx);

    expect(updatedPosts).toHaveLength(0);
    expect(closedReports[0].data).toMatchObject({ status: 'DISMISSED' });
  });
});

describe('setSocialAuthorBan', () => {
  it('requires a platform admin', async () => {
    const { setSocialAuthorBan } = await loadModeration();
    const { ctx } = makeCtx({ user: { id: 'user-1', isAdmin: false } });

    await expect(setSocialAuthorBan({ userId: 'author-1', banned: true }, ctx)).rejects.toMatchObject(
      { statusCode: 403 },
    );
  });

  it('bans and unbans an author', async () => {
    const { setSocialAuthorBan } = await loadModeration();
    const { ctx, updatedUsers } = makeCtx({ user: { id: 'admin-1', isAdmin: true } });

    await setSocialAuthorBan({ userId: 'author-1', banned: true, reason: 'Spam' }, ctx);
    expect(updatedUsers[0].data.socialBannedAt).toBeInstanceOf(Date);
    expect(updatedUsers[0].data.socialBanReason).toBe('Spam');

    await setSocialAuthorBan({ userId: 'author-1', banned: false }, ctx);
    expect(updatedUsers[1].data).toEqual({ socialBannedAt: null, socialBanReason: null });
  });
});
