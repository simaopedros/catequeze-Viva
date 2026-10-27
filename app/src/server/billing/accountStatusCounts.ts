/**
 * Single source of truth for platform admin subscription / trial aggregate counts.
 */
import { PRISMA_FREE_PLANS } from '../../shared/pricing';

/** User rows that count as Stripe-paid subscribers. */
export const PAYING_USER_WHERE = {
  subscriptionStatus: 'active',
  stripeSubscriptionId: { not: null },
} as const;

/** TenantBilling rows that count as paid tenants (non-free ACTIVE). */
export const PAYING_TENANT_WHERE = {
  status: 'ACTIVE',
  plan: { notIn: [...PRISMA_FREE_PLANS] },
} as const;

/**
 * TenantBilling rows whose parish owner is already a paying User — same person
 * (e.g. solo catechist with personal-space TenantBilling ACTIVE).
 */
export const DOUBLE_COUNTED_TENANT_WHERE = {
  ...PAYING_TENANT_WHERE,
  parish: {
    owner: { ...PAYING_USER_WHERE },
  },
} as const;

export type AccountStatusCounts = {
  payingTenants: number;
  payingUsers: number;
  /** Paying users + paying tenants minus tenants owned by an already-counted paying user. */
  uniquePayers: number;
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

/** Deduped payer total: never count a tenant whose owner is already a paying user. */
export function uniquePayersFromParts(
  payingUsers: number,
  payingTenants: number,
  tenantsOwnedByPayingUsers: number,
): number {
  return Math.max(0, payingUsers + payingTenants - tenantsOwnedByPayingUsers);
}

export async function getAccountStatusCounts(
  context: { entities: any },
  now: Date = new Date(),
): Promise<AccountStatusCounts> {
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [
    payingTenants,
    payingUsers,
    tenantsOwnedByPayingUsers,
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
      where: { ...PAYING_TENANT_WHERE },
    }),
    context.entities.User.count({
      where: { ...PAYING_USER_WHERE },
    }),
    context.entities.TenantBilling.count({
      where: { ...DOUBLE_COUNTED_TENANT_WHERE },
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
    uniquePayers: uniquePayersFromParts(
      payingUsers,
      payingTenants,
      tenantsOwnedByPayingUsers,
    ),
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
  const [users, tenants, tenantsOwnedByPayingUsers] = await Promise.all([
    context.entities.User.count({
      where: {
        subscriptionPlan: { in: aliases },
        ...PAYING_USER_WHERE,
      },
    }),
    context.entities.TenantBilling.count({
      where: {
        plan: { in: aliases },
        status: 'ACTIVE',
      },
    }),
    context.entities.TenantBilling.count({
      where: {
        plan: { in: aliases },
        status: 'ACTIVE',
        parish: {
          owner: {
            subscriptionPlan: { in: aliases },
            ...PAYING_USER_WHERE,
          },
        },
      },
    }),
  ]);
  const uniquePayers = uniquePayersFromParts(users, tenants, tenantsOwnedByPayingUsers);
  return { users, tenants, total: uniquePayers, uniquePayers };
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
