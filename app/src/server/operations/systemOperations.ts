/**
 * System health operations — job monitoring and AI usage overview.
 */
import { requirePlatformAdmin } from '../auth/helpers';

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
    _sum: { creditsUsed: true },
  });
  const totalAiCredits = aiUsageThisMonth._sum?.creditsUsed ?? 0;

  // Total users with AI credits
  const usersWithCredits = await context.entities.User.count({
    where: { credits: { gt: 0 } },
  });

  // Daily stats last 7 days
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const recentDailyStats = await context.entities.DailyStats.findMany({
    where: { date: { gte: sevenDaysAgo } },
    orderBy: { date: 'desc' },
    select: { date: true, userCount: true, paidUserCount: true, totalViews: true },
  });

  return {
    recentErrors,
    totalAiCreditsThisMonth: totalAiCredits,
    usersWithCredits,
    recentDailyStats,
  };
};
