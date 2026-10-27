/**
 * System health operations — job monitoring and AI usage overview.
 */
import { requirePlatformAdmin } from '../auth/helpers';

/** Tasks executed by the daily `/api/internal/maintenance` run (see server/api/maintenance.ts). */
export const MAINTENANCE_JOB_NAMES = [
  'aiCreditsReset',
  'aiCacheCleanup',
  'meetingReminders',
  'socialMediaReconcile',
  'lifecycleNudge',
  'dailyStats',
] as const;

export type MaintenanceJobName = (typeof MAINTENANCE_JOB_NAMES)[number];

export const getSystemHealth = async (_args: void, context: any) => {
  requirePlatformAdmin(context.user);

  const now = new Date();

  // Job health — check Logs table for recent errors
  const recentErrors = await context.entities.Logs.findMany({
    where: { level: 'job-error' },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: { id: true, message: true, createdAt: true, level: true },
  });

  // AI usage summary (current month)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const aiUsageThisMonth = await context.entities.DailyAiUsage.aggregate({
    where: { date: { gte: monthStart } },
    _sum: { count: true },
  });
  const totalAiCredits = aiUsageThisMonth._sum?.count ?? 0;

  const usersWithCredits = await context.entities.UserAiCredits.count({
    where: { creditsLeft: { gt: 0 } },
  });

  // Daily stats last 7 days
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const recentDailyStats = await context.entities.DailyStats.findMany({
    where: { date: { gte: sevenDaysAgo } },
    orderBy: { date: 'desc' },
    select: { date: true, userCount: true, paidUserCount: true, totalViews: true },
  });

  const jobs = await Promise.all(
    MAINTENANCE_JOB_NAMES.map(async (name) => {
      const [lastRun, lastErrorLog] = await Promise.all([
        context.entities.JobRun.findFirst({
          where: { name },
          orderBy: { startedAt: 'desc' },
          select: { startedAt: true, finishedAt: true, ok: true, error: true },
        }),
        context.entities.Logs.findFirst({
          where: {
            level: 'job-error',
            message: { contains: name, mode: 'insensitive' },
          },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true },
        }),
      ]);

      return {
        name,
        lastRunAt: lastRun?.startedAt ?? null,
        lastRunOk: lastRun?.ok ?? null,
        lastErrorAt: lastErrorLog?.createdAt ?? (lastRun?.ok === false ? lastRun.finishedAt : null),
      };
    }),
  );

  return {
    recentErrors,
    totalAiCreditsThisMonth: totalAiCredits,
    usersWithCredits,
    recentDailyStats,
    jobs,
  };
};
