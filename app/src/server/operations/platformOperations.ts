/**
 * Platform operations — cross-tenant queries for the admin Command Center.
 * All operations require platform admin (isAdmin).
 */
import { HttpError } from 'wasp/server';
import { requirePlatformAdmin } from '../auth/helpers';
import { formatServerDate, resolveUserLocale } from '../i18n/serverLocale';

// ─── Plan pricing (BRL/month) for MRR estimation ──────────────────────────

const PLAN_PRICES: Record<string, number> = {
  CATECHIST_FREE: 0,
  CATECHIST_PRO: 29.90,
  CATECHIST_AI: 49.90,
  PARISH: 99.90,
  DIOCESE: 199.90,
};

function planPrice(plan: string | null | undefined): number {
  return PLAN_PRICES[plan?.toUpperCase() || 'CATECHIST_FREE'] || 0;
}

// ─── Overview KPIs ─────────────────────────────────────────────────────────

export const getPlatformOverview = async (_args: void, context: any) => {
  requirePlatformAdmin(context.user);

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    newUsers7d,
    newUsers30d,
    totalParishes,
    activeParishes,
    archivedParishes,
    totalClasses,
    totalCatechumens,
    payingTenants,
    activeSubscriptions,
    trialsExpiring,
    activeBillings,
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

  // MRR estimation
  const mrr = activeBillings.reduce((sum: number, b: { plan: string }) => sum + planPrice(b.plan), 0);

  return {
    totalUsers,
    newUsers7d,
    newUsers30d,
    totalParishes,
    activeParishes,
    archivedParishes,
    totalClasses,
    totalCatechumens,
    payingTenants,
    activeSubscriptions,
    trialsExpiring,
    mrr: Math.round(mrr * 100) / 100,
  };
};

// ─── Growth data ────────────────────────────────────────────────────────────

export const getPlatformGrowth = async (_args: void, context: any) => {
  requirePlatformAdmin(context.user);

  const now = new Date();
  const days = 30;
  const labels: string[] = [];
  const users: number[] = [];
  const parishes: number[] = [];

  const userLocale = resolveUserLocale(context.user);

  for (let i = days - 1; i >= 0; i--) {
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    labels.push(formatServerDate(dayStart, userLocale, { day: '2-digit', month: '2-digit' }));

    const [userCount, parishCount] = await Promise.all([
      context.entities.User.count({ where: { createdAt: { lt: dayEnd } } }),
      context.entities.Parish.count({ where: { createdAt: { lt: dayEnd } } }),
    ]);
    users.push(userCount);
    parishes.push(parishCount);
  }

  return { labels, users, parishes };
};

// ─── Alerts ─────────────────────────────────────────────────────────────────

export const getPlatformAlerts = async (_args: void, context: any) => {
  requirePlatformAdmin(context.user);

  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const alerts: { type: 'warning' | 'info' | 'error'; message: string }[] = [];

  // Trials expiring
  const trialsExpiring = await context.entities.TenantBilling.count({
    where: { status: 'TRIAL', trialEndsAt: { gte: now, lte: sevenDaysFromNow } },
  });
  if (trialsExpiring > 0) {
    alerts.push({ type: 'warning', message: `${trialsExpiring} trial(s) expiram nos próximos 7 dias.` });
  }

  // Inactive parishes
  const archivedParishes = await context.entities.Parish.count({ where: { active: false } });
  if (archivedParishes > 0) {
    alerts.push({ type: 'info', message: `${archivedParishes} paróquia(s) arquivada(s).` });
  }

  // Inactive parishes with active members (orphaned data)
  const emptyParishes = await context.entities.Parish.count({
    where: { active: false, memberships: { some: { status: 'ACTIVE' } } },
  });
  if (emptyParishes > 0) {
    alerts.push({ type: 'warning', message: `${emptyParishes} paróquia(s) arquivada(s) com membros ativos.` });
  }

  // No new users in 30 days
  const newUsers = await context.entities.User.count({
    where: { createdAt: { gte: thirtyDaysAgo } },
  });
  if (newUsers === 0) {
    alerts.push({ type: 'warning', message: 'Nenhum novo utilizador nos últimos 30 dias.' });
  }

  return alerts;
};
