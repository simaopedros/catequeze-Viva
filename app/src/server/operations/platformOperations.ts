/**
 * Platform operations — cross-tenant queries for the admin Command Center.
 * All operations require platform admin (isAdmin).
 */
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

const FUNNEL_EVENTS = [
  'landing_viewed',
  'pricing_viewed',
  'plan_selected',
  'signup_started',
  'signup_completed',
  'checkout_started',
  'purchase_completed',
  'activation_completed',
  'invite_sent',
  'invite_accepted',
  'share_clicked',
] as const;

type FunnelEventName = (typeof FUNNEL_EVENTS)[number];

type FunnelCounts = Record<FunnelEventName, number>;

function planPrice(plan: string | null | undefined): number {
  return PLAN_PRICES[plan?.toUpperCase() || 'CATECHIST_FREE'] || 0;
}

function createEmptyFunnelCounts(): FunnelCounts {
  return {
    landing_viewed: 0,
    pricing_viewed: 0,
    plan_selected: 0,
    signup_started: 0,
    signup_completed: 0,
    checkout_started: 0,
    purchase_completed: 0,
    activation_completed: 0,
    invite_sent: 0,
    invite_accepted: 0,
    share_clicked: 0,
  };
}

function isFunnelEventName(value: string): value is FunnelEventName {
  return (FUNNEL_EVENTS as readonly string[]).includes(value);
}

function rate(numerator: number, denominator: number): number | null {
  if (!denominator) return null;
  return Math.round((numerator / denominator) * 1000) / 10;
}

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

export const getPlatformGrowth = async (_args: void, context: any) => {
  requirePlatformAdmin(context.user);

  const now = new Date();
  const days = 30;

  const dayStarts: Date[] = [];
  for (let i = days - 1; i >= 0; i--) {
    dayStarts.push(new Date(now.getFullYear(), now.getMonth(), now.getDate() - i));
  }

  const thirtyDaysAgo = dayStarts[0];
  const dayEnd = new Date(dayStarts[dayStarts.length - 1]);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const [usersInWindow, parishesInWindow, totalUsersNow, totalParishesNow] = await Promise.all([
    context.entities.User.count({ where: { createdAt: { gt: thirtyDaysAgo, lt: dayEnd } } }),
    context.entities.Parish.count({ where: { createdAt: { gt: thirtyDaysAgo, lt: dayEnd } } }),
    context.entities.User.count(),
    context.entities.Parish.count(),
  ]);

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

export const getPricingFunnel = async (_args: void, context: any) => {
  requirePlatformAdmin(context.user);

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [events30d, recentPurchases] = await Promise.all([
    context.entities.PricingEvent.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: {
        event: true,
        toPlan: true,
        processor: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    context.entities.PricingEvent.findMany({
      where: { event: 'purchase_completed' },
      select: {
        createdAt: true,
        toPlan: true,
        processor: true,
        userId: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);

  const counts30d = createEmptyFunnelCounts();
  const counts7d = createEmptyFunnelCounts();
  const planCounts = new Map<string, number>();
  const processorCounts = new Map<string, number>();

  for (const event of events30d) {
    if (!isFunnelEventName(event.event)) continue;

    counts30d[event.event as FunnelEventName] += 1;
    if (event.createdAt >= sevenDaysAgo) {
      counts7d[event.event as FunnelEventName] += 1;
    }

    if (event.event === 'purchase_completed') {
      const planKey = event.toPlan || 'unknown';
      const processorKey = event.processor || 'unknown';
      planCounts.set(planKey, (planCounts.get(planKey) || 0) + 1);
      processorCounts.set(processorKey, (processorCounts.get(processorKey) || 0) + 1);
    }
  }

  const topPlans = Array.from(planCounts.entries())
    .map(([plan, count]) => ({ plan, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const topProcessors = Array.from(processorCounts.entries())
    .map(([processor, count]) => ({ processor, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    windowDays: 30,
    counts7d,
    counts30d,
    conversion30d: {
      landingToPricing: rate(counts30d.pricing_viewed, counts30d.landing_viewed),
      pricingToPlan: rate(counts30d.plan_selected, counts30d.pricing_viewed),
      planToSignup: rate(counts30d.signup_started, counts30d.plan_selected),
      signupToCheckout: rate(counts30d.checkout_started, counts30d.signup_completed),
      checkoutToPurchase: rate(counts30d.purchase_completed, counts30d.checkout_started),
      purchaseToActivation: rate(counts30d.activation_completed, counts30d.purchase_completed),
      inviteAcceptance: rate(counts30d.invite_accepted, counts30d.invite_sent),
    },
    topPlans,
    topProcessors,
    recentPurchases,
  };
};