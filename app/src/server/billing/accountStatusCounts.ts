/**
 * Single source of truth for platform admin subscription / trial aggregate counts.
 */
import { PRISMA_FREE_PLANS } from '../../shared/pricing';

export type AccountStatusCounts = {
  payingTenants: number;
  payingUsers: number;
  manualActiveUsers: number;
  trialUsers: number;
  trialTenants: number;
  expiredTrialUsers: number;
  expiredTrialTenants: number;
  pastDue: number;
  trialsExpiring7d: number;
};

/** Lower/upper/as-is aliases so SINGLE and single match the same plan. */
export function planSlugAliases(slug: string): string[] {
  const lower = slug.toLowerCase();
  const upper = slug.toUpperCase();
  return [...new Set([slug, lower, upper])];
}

export async function getAccountStatusCounts(
  context: { entities: any },
  now: Date = new Date(),
): Promise<AccountStatusCounts> {
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [
    payingTenants,
    payingUsers,
    manualActiveUsers,
    trialUsers,
    trialTenants,
    expiredTrialUsers,
    expiredTrialTenants,
    pastDueUsers,
    pastDueTenants,
    trialsExpiringUsers,
    trialsExpiringTenants,
  ] = await Promise.all([
    context.entities.TenantBilling.count({
      where: {
        status: 'ACTIVE',
        plan: { notIn: [...PRISMA_FREE_PLANS] },
      },
    }),
    context.entities.User.count({
      where: {
        subscriptionStatus: 'active',
        stripeSubscriptionId: { not: null },
      },
    }),
    context.entities.User.count({
      where: {
        subscriptionStatus: 'active',
        stripeSubscriptionId: null,
      },
    }),
    context.entities.User.count({
      where: {
        subscriptionStatus: 'trialing',
        trialEndsAt: { gte: now },
      },
    }),
    context.entities.TenantBilling.count({
      where: {
        status: 'TRIAL',
        trialEndsAt: { gte: now },
      },
    }),
    context.entities.User.count({
      where: {
        subscriptionStatus: 'trialing',
        trialEndsAt: { lt: now },
      },
    }),
    context.entities.TenantBilling.count({
      where: {
        status: 'TRIAL',
        trialEndsAt: { lt: now },
      },
    }),
    context.entities.User.count({
      where: { subscriptionStatus: 'past_due' },
    }),
    context.entities.TenantBilling.count({
      where: { status: 'PAST_DUE' },
    }),
    context.entities.User.count({
      where: {
        subscriptionStatus: 'trialing',
        trialEndsAt: { gte: now, lte: sevenDaysFromNow },
      },
    }),
    context.entities.TenantBilling.count({
      where: {
        status: 'TRIAL',
        trialEndsAt: { gte: now, lte: sevenDaysFromNow },
      },
    }),
  ]);

  return {
    payingTenants,
    payingUsers,
    manualActiveUsers,
    trialUsers,
    trialTenants,
    expiredTrialUsers,
    expiredTrialTenants,
    pastDue: pastDueUsers + pastDueTenants,
    trialsExpiring7d: trialsExpiringUsers + trialsExpiringTenants,
  };
}

/** Paying subscribers for a given plan slug (case-insensitive aliases). */
export async function countPayingForPlan(context: { entities: any }, slug: string) {
  const aliases = planSlugAliases(slug);
  const [users, tenants] = await Promise.all([
    context.entities.User.count({
      where: {
        subscriptionPlan: { in: aliases },
        subscriptionStatus: 'active',
        stripeSubscriptionId: { not: null },
      },
    }),
    context.entities.TenantBilling.count({
      where: {
        plan: { in: aliases },
        status: 'ACTIVE',
      },
    }),
  ]);
  return { users, tenants, total: users + tenants };
}

/** Active (non-expired) trials for a given plan slug (case-insensitive aliases). */
export async function countTrialForPlan(
  context: { entities: any },
  slug: string,
  now: Date = new Date(),
) {
  const aliases = planSlugAliases(slug);
  const [users, tenants] = await Promise.all([
    context.entities.User.count({
      where: {
        subscriptionPlan: { in: aliases },
        subscriptionStatus: 'trialing',
        trialEndsAt: { gte: now },
      },
    }),
    context.entities.TenantBilling.count({
      where: {
        plan: { in: aliases },
        status: 'TRIAL',
        trialEndsAt: { gte: now },
      },
    }),
  ]);
  return { users, tenants, total: users + tenants };
}
