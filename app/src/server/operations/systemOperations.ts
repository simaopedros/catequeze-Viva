/**
 * System health operations — job monitoring and AI usage overview.
 */
import { requirePlatformAdmin } from '../auth/helpers';
import {
  DEFAULT_ERROR_WINDOW_DAYS,
  groupErrorsByMessage,
  latestJobRunByName,
  MAX_RAW_ERRORS,
  resolveErrorWindowDays,
} from './systemHealthHelpers';

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

export type GetSystemHealthArgs = {
  /** Error lookback window in days (default 7, max 90). */
  days?: number;
};

export const getSystemHealth = async (
  args: GetSystemHealthArgs | void,
  context: any,
) => {
  requirePlatformAdmin(context.user);

  const now = new Date();
  const days = resolveErrorWindowDays(args?.days ?? DEFAULT_ERROR_WINDOW_DAYS);
  const errorSince = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // One parallel round: no N+1, select only needed fields, bounded takes.
  const [rawErrors, aiUsageThisMonth, usersWithCredits, recentDailyStats, recentJobRuns] =
    await Promise.all([
      context.entities.Logs.findMany({
        where: {
          level: 'job-error',
          createdAt: { gte: errorSince },
        },
        orderBy: { createdAt: 'desc' },
        take: MAX_RAW_ERRORS,
        select: { id: true, message: true, createdAt: true },
      }),
      context.entities.DailyAiUsage.aggregate({
        where: { date: { gte: monthStart } },
        _sum: { count: true },
      }),
      context.entities.UserAiCredits.count({
        where: { creditsLeft: { gt: 0 } },
      }),
      context.entities.DailyStats.findMany({
        where: { date: { gte: sevenDaysAgo } },
        orderBy: { date: 'desc' },
        take: 14,
        select: {
          date: true,
          userCount: true,
          paidUserCount: true,
          totalViews: true,
        },
      }),
      context.entities.JobRun.findMany({
        where: { name: { in: [...MAINTENANCE_JOB_NAMES] } },
        orderBy: { startedAt: 'desc' },
        // Enough rows to cover latest success/failure per known task.
        take: MAINTENANCE_JOB_NAMES.length * 4,
        select: {
          name: true,
          startedAt: true,
          finishedAt: true,
          ok: true,
          error: true,
        },
      }),
    ]);

  const recentErrors = groupErrorsByMessage(rawErrors);
  const lastByName = latestJobRunByName(recentJobRuns, MAINTENANCE_JOB_NAMES);

  const jobs = MAINTENANCE_JOB_NAMES.map((name) => {
    const lastRun = lastByName.get(name);
    return {
      name,
      lastRunAt: lastRun?.startedAt ?? null,
      lastRunOk: lastRun?.ok ?? null,
      lastErrorAt:
        lastRun?.ok === false ? (lastRun.finishedAt ?? lastRun.startedAt) : null,
      lastError: lastRun?.ok === false ? lastRun.error ?? null : null,
    };
  });

  return {
    days,
    recentErrors,
    totalAiCreditsThisMonth: aiUsageThisMonth._sum?.count ?? 0,
    usersWithCredits,
    recentDailyStats,
    jobs,
  };
};
