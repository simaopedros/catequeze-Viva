/**
 * Comunidade moderation — the feed is post-moderated, so nothing here blocks
 * publishing. Reports come from any visitor (anonymous included) and platform
 * admins act on them from /admin/comunidade.
 */
import { HttpError } from 'wasp/server';
import { requirePlatformAdmin, writeAuditLog } from '../auth/helpers';

const REPORT_REASONS = [
  'DOCTRINE',
  'HATE',
  'SEXUAL',
  'VIOLENCE',
  'SPAM',
  'MINOR_PRIVACY',
  'OTHER',
] as const;

type ReportReason = (typeof REPORT_REASONS)[number];

// Operations do not receive the Express request, so anonymous reports are
// throttled per process instead of per IP. Signed-in reporters are throttled
// per account and de-duplicated in the database.
const REPORT_WINDOW_MS = 60 * 1000;
const MAX_REPORTS_PER_WINDOW = 10;
const reportWindows = new Map<string, { count: number; resetAt: number }>();

function assertReportRate(key: string): void {
  const now = Date.now();
  const entry = reportWindows.get(key);

  if (!entry || now > entry.resetAt) {
    reportWindows.set(key, { count: 1, resetAt: now + REPORT_WINDOW_MS });
    return;
  }

  entry.count += 1;
  if (entry.count > MAX_REPORTS_PER_WINDOW) {
    throw new HttpError(429, 'Muitas denúncias em pouco tempo. Tente novamente em instantes.');
  }
}

// ─── Report (public) ───────────────────────────────────────────────────────

export const reportSocialContent = async (
  args: {
    targetType: 'POST' | 'COMMENT';
    targetId: string;
    reason?: string;
    details?: string;
  },
  context: any,
) => {
  const targetType = args?.targetType === 'COMMENT' ? 'COMMENT' : 'POST';
  const targetId = String(args?.targetId || '');
  if (!targetId) {
    throw new HttpError(400, 'Conteúdo inválido.');
  }

  const reason: ReportReason = (REPORT_REASONS as readonly string[]).includes(
    String(args?.reason),
  )
    ? (args!.reason as ReportReason)
    : 'OTHER';

  assertReportRate(context.user?.id ?? 'anonymous');

  const exists =
    targetType === 'POST'
      ? await context.entities.SocialPost.findUnique({
          where: { id: targetId },
          select: { id: true },
        })
      : await context.entities.SocialComment.findUnique({
          where: { id: targetId },
          select: { id: true },
        });

  if (!exists) {
    throw new HttpError(404, 'Conteúdo não encontrado.');
  }

  if (context.user) {
    const duplicate = await context.entities.SocialReport.findFirst({
      where: { targetType, targetId, reporterId: context.user.id, status: 'OPEN' },
      select: { id: true },
    });
    if (duplicate) {
      return { success: true, alreadyReported: true };
    }
  }

  await context.entities.SocialReport.create({
    data: {
      targetType,
      targetId,
      reporterId: context.user?.id ?? null,
      reason,
      details: args?.details ? String(args.details).slice(0, 1000) : null,
    },
  });

  return { success: true, alreadyReported: false };
};

// ─── Admin queue ───────────────────────────────────────────────────────────

export const getSocialModerationQueue = async (
  args: { status?: 'OPEN' | 'ACTIONED' | 'DISMISSED' },
  context: any,
) => {
  requirePlatformAdmin(context.user);

  const status = args?.status ?? 'OPEN';

  const reports = await context.entities.SocialReport.findMany({
    where: { status },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      reporter: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });

  const postIds = reports
    .filter((report: any) => report.targetType === 'POST')
    .map((report: any) => report.targetId);
  const commentIds = reports
    .filter((report: any) => report.targetType === 'COMMENT')
    .map((report: any) => report.targetId);

  const [posts, comments, pendingPosts] = await Promise.all([
    postIds.length
      ? context.entities.SocialPost.findMany({
          where: { id: { in: postIds } },
          select: {
            id: true,
            slug: true,
            body: true,
            status: true,
            author: {
              select: { id: true, firstName: true, lastName: true, socialBannedAt: true },
            },
          },
        })
      : [],
    commentIds.length
      ? context.entities.SocialComment.findMany({
          where: { id: { in: commentIds } },
          select: {
            id: true,
            body: true,
            status: true,
            post: { select: { slug: true } },
            author: {
              select: { id: true, firstName: true, lastName: true, socialBannedAt: true },
            },
          },
        })
      : [],
    context.entities.SocialPost.findMany({
      where: { status: 'PENDING_REVIEW' },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        slug: true,
        body: true,
        createdAt: true,
        author: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
  ]);

  const postMap = new Map(posts.map((post: any) => [post.id, post]));
  const commentMap = new Map(comments.map((comment: any) => [comment.id, comment]));

  return {
    reports: reports.map((report: any) => {
      const target =
        report.targetType === 'POST'
          ? postMap.get(report.targetId)
          : commentMap.get(report.targetId);

      return {
        id: report.id,
        createdAt: report.createdAt,
        reason: report.reason,
        details: report.details,
        status: report.status,
        targetType: report.targetType,
        targetId: report.targetId,
        reporter: report.reporter
          ? {
              id: report.reporter.id,
              displayName:
                [report.reporter.firstName, report.reporter.lastName]
                  .filter(Boolean)
                  .join(' ') || report.reporter.email,
            }
          : null,
        target: target
          ? {
              body: (target as any).body,
              status: (target as any).status,
              slug: (target as any).slug ?? (target as any).post?.slug ?? null,
              author: {
                id: (target as any).author.id,
                displayName:
                  [(target as any).author.firstName, (target as any).author.lastName]
                    .filter(Boolean)
                    .join(' ') || 'Membro da Comunidade',
                banned: Boolean((target as any).author.socialBannedAt),
              },
            }
          : null,
      };
    }),
    pendingPosts: pendingPosts.map((post: any) => ({
      id: post.id,
      slug: post.slug,
      body: post.body,
      createdAt: post.createdAt,
      author: {
        id: post.author.id,
        displayName:
          [post.author.firstName, post.author.lastName].filter(Boolean).join(' ') ||
          'Membro da Comunidade',
      },
    })),
  };
};

/** Remove reported content and close every open report against it. */
export const moderateSocialContent = async (
  args: {
    targetType: 'POST' | 'COMMENT';
    targetId: string;
    action: 'REMOVE' | 'APPROVE' | 'DISMISS';
    reason?: string;
  },
  context: any,
) => {
  requirePlatformAdmin(context.user);

  const targetType = args?.targetType === 'COMMENT' ? 'COMMENT' : 'POST';
  const targetId = String(args?.targetId || '');
  const reason = args?.reason ? String(args.reason).slice(0, 500) : null;

  if (args.action === 'REMOVE') {
    if (targetType === 'POST') {
      await context.entities.SocialPost.update({
        where: { id: targetId },
        data: {
          status: 'REMOVED',
          removedAt: new Date(),
          removedById: context.user.id,
          removalReason: reason,
          publishedAt: null,
        },
      });
    } else {
      await context.entities.SocialComment.update({
        where: { id: targetId },
        data: {
          status: 'REMOVED',
          removedAt: new Date(),
          removedById: context.user.id,
          removalReason: reason,
        },
      });
    }
  } else if (args.action === 'APPROVE' && targetType === 'POST') {
    await context.entities.SocialPost.update({
      where: { id: targetId },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
        removedAt: null,
        removedById: null,
        removalReason: null,
      },
    });
  } else if (args.action === 'APPROVE' && targetType === 'COMMENT') {
    await context.entities.SocialComment.update({
      where: { id: targetId },
      data: { status: 'PUBLISHED', removedAt: null, removedById: null, removalReason: null },
    });
  }

  await context.entities.SocialReport.updateMany({
    where: { targetType, targetId, status: 'OPEN' },
    data: {
      status: args.action === 'DISMISS' ? 'DISMISSED' : 'ACTIONED',
      reviewedAt: new Date(),
      reviewedById: context.user.id,
      reviewNote: reason,
    },
  });

  await writeAuditLog(
    context,
    args.action === 'REMOVE' ? 'DELETE' : 'APPROVE',
    targetType === 'POST' ? 'SocialPost' : 'SocialComment',
    targetId,
    { moderationAction: args.action, reason },
  );

  return { success: true };
};

export const setSocialAuthorBan = async (
  args: { userId: string; banned: boolean; reason?: string },
  context: any,
) => {
  requirePlatformAdmin(context.user);

  const userId = String(args?.userId || '');
  if (!userId) {
    throw new HttpError(400, 'Autor inválido.');
  }

  await context.entities.User.update({
    where: { id: userId },
    data: {
      socialBannedAt: args.banned ? new Date() : null,
      socialBanReason: args.banned ? (args.reason || '').slice(0, 500) || null : null,
    },
  });

  await writeAuditLog(context, 'UPDATE', 'User', userId, {
    socialBanned: args.banned,
    reason: args.reason ?? null,
  });

  return { success: true };
};
