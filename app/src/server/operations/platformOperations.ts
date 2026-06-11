/**
 * Platform operations — cross-tenant queries for the admin Command Center.
 * All operations require platform admin (isAdmin).
 */
import { HttpError } from 'wasp/server';
import { requirePlatformAdmin } from '../auth/helpers';
import { formatServerDate, resolveUserLocale } from '../i18n/serverLocale';
import { PLANS } from '../../shared/pricing';

const PLAN_PRICES: Record<string, number> = {
  CATECHIST_FREE: 0,
  CATECHIST_PRO: PLANS.catechist_pro.prices.monthlyCents / 100,
  CATECHIST_AI: PLANS.catechist_ai.prices.monthlyCents / 100,
  PARISH_ESSENTIAL: PLANS.parish_essential.prices.monthlyCents / 100,
  PARISH: PLANS.parish_complete.prices.monthlyCents / 100,
  DIOCESE: PLANS.diocese.prices.monthlyCents / 100,
};

function planPrice(plan: string | null | undefined): number {
  return PLAN_PRICES[plan?.toUpperCase() || 'CATECHIST_FREE'] || 0;
}

export const getPlatformOverview = async (_args: void, context: any) => {
  requirePlatformAdmin(context.user);

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [
    totalUsers, newUsers7d, newUsers30d, totalParishes, activeParishes,
    archivedParishes, totalClasses, totalCatechumens, payingTenants,
    activeSubscriptions, trialsExpiring, activeBillings,
  ] = await Promise.all([
    context.entities.User.count(),
    context.entities.User.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    context.entities.User.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    context.entities.Parish.count(),
    context.entities.Parish.count({ where: { active: true } }),
    context.entities.Parish.count({ where: { active: false } }),
    context.entities.CatechesisClass.count({ where: { status: 'ACTIVE' } }),
    context.entities.ClassEnrollment.count({ where: { status: 'ENROLLED' } }),
    context.entities.TenantBilling.count({ where: { status: 'ACTIVE', plan: { not: 'CATECHIST_FREE' } } }),
    context.entities.User.count({ where: { subscriptionStatus: 'active' } }),
    context.entities.TenantBilling.count({
      where: { status: 'TRIAL', trialEndsAt: { gte: now, lte: sevenDaysFromNow } },
    }),
    context.entities.TenantBilling.findMany({
      where: { status: 'ACTIVE', plan: { not: 'CATECHIST_FREE' } },
      select: { plan: true },
    }),
  ]);

  const mrr = activeBillings.reduce((sum: number, b: { plan: string }) => sum + planPrice(b.plan), 0);

  return {
    totalUsers, newUsers7d, newUsers30d, totalParishes, activeParishes,
    archivedParishes, totalClasses, totalCatechumens, payingTenants,
    activeSubscriptions, trialsExpiring, mrr: Math.round(mrr * 100) / 100,
  };
};

export const getPlatformGrowth = async (_args: void, context: any) => {
  requirePlatformAdmin(context.user);

  const now = new Date();
  const days = 30;

  // Compute day boundaries
  const dayStarts: Date[] = [];
  for (let i = days - 1; i >= 0; i--) {
    dayStarts.push(new Date(now.getFullYear(), now.getMonth(), now.getDate() - i));
  }

  // Fetch all users and parishes created in the 30-day window in 2 queries
  const thirtyDaysAgo = dayStarts[0];
  const dayEnd = new Date(dayStarts[dayStarts.length - 1]);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const [usersInWindow, parishesInWindow, totalUsersNow, totalParishesNow] = await Promise.all([
    context.entities.User.count({ where: { createdAt: { gt: thirtyDaysAgo, lt: dayEnd } } }),
    context.entities.Parish.count({ where: { createdAt: { gt: thirtyDaysAgo, lt: dayEnd } } }),
    context.entities.User.count(),
    context.entities.Parish.count(),
  ]);

  // Compute cumulative counts client-side
  // Since we can't get cumulative-per-day from a single Prisma query,
  // we approximate: starting from (totalNow - totalInWindow) as base,
  // spread the growth evenly across days.
  // This is a lightweight approximation — exact daily precision would need raw SQL.
  const baseUsers = totalUsersNow - usersInWindow;
  const baseParishes = totalParishesNow - parishesInWindow;

  const userLocale = resolveUserLocale(context.user);
  const labels: string[] = [];
  const users: number[] = [];
  const parishes: number[] = [];

  const userStep = days > 1 ? usersInWindow / (days - 1) : 0;
  const parishStep = days > 1 ? parishesInWindow / (days - 1) : 0;

  for (let i = 0; i < days; i++) {
    labels.push(formatServerDate(dayStarts[i], userLocale, { day: '2-digit', month: '2-digit' }));
    users.push(Math.round(baseUsers + userStep * i));
    parishes.push(Math.round(baseParishes + parishStep * i));
  }

  return { labels, users, parishes };
};

export const getPlatformAlerts = async (_args: void, context: any) => {
  requirePlatformAdmin(context.user);

  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const alerts: { type: 'warning' | 'info' | 'error'; message: string }[] = [];

  const trialsExpiring = await context.entities.TenantBilling.count({
    where: { status: 'TRIAL', trialEndsAt: { gte: now, lte: sevenDaysFromNow } },
  });
  if (trialsExpiring > 0) {
    alerts.push({ type: 'warning', message: `${trialsExpiring} trial(s) expiram nos próximos 7 dias.` });
  }

  const archivedParishes = await context.entities.Parish.count({ where: { active: false } });
  if (archivedParishes > 0) {
    alerts.push({ type: 'info', message: `${archivedParishes} paróquia(s) arquivada(s).` });
  }

  const emptyParishes = await context.entities.Parish.count({
    where: { active: false, memberships: { some: { status: 'ACTIVE' } } },
  });
  if (emptyParishes > 0) {
    alerts.push({ type: 'warning', message: `${emptyParishes} paróquia(s) arquivada(s) com membros ativos.` });
  }

  const newUsers = await context.entities.User.count({
    where: { createdAt: { gte: thirtyDaysAgo } },
  });
  if (newUsers === 0) {
    alerts.push({ type: 'warning', message: 'Nenhum novo utilizador nos últimos 30 dias.' });
  }

  return alerts;
};
