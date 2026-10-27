import { describe, expect, it, vi } from 'vitest';
import {
  countPayingForPlan,
  countTrialForPlan,
  getAccountStatusCounts,
  planSlugAliases,
  uniquePayersFromParts,
} from '../server/billing/accountStatusCounts';

function mockContext(counts: Record<string, number>) {
  const userCount = vi.fn(async ({ where }: any) => {
    if (where?.subscriptionPlan?.in) {
      if (where.subscriptionStatus === 'active') return counts.planPayingUsers ?? 0;
      if (where.subscriptionStatus === 'trialing') return counts.planTrialUsers ?? 0;
    }
    if (where?.subscriptionStatus === 'active' && where?.stripeSubscriptionId?.not === null) {
      return counts.payingUsers ?? 0;
    }
    if (where?.subscriptionStatus === 'active' && where?.stripeSubscriptionId === null) {
      return counts.manualActiveUsers ?? 0;
    }
    if (where?.subscriptionStatus === 'trialing' && where?.trialEndsAt?.gte && where?.trialEndsAt?.lte) {
      return counts.trialsExpiringUsers ?? 0;
    }
    if (where?.subscriptionStatus === 'trialing' && where?.trialEndsAt?.gte) {
      return counts.trialUsers ?? 0;
    }
    if (where?.subscriptionStatus === 'trialing' && where?.trialEndsAt?.lt) {
      return counts.expiredTrialUsers ?? 0;
    }
    if (where?.subscriptionStatus === 'past_due') {
      return counts.pastDueUsers ?? 0;
    }
    throw new Error(`Unexpected User.count where: ${JSON.stringify(where)}`);
  });

  const tenantCount = vi.fn(async ({ where }: any) => {
    // Double-counted: ACTIVE paying tenant whose parish owner is a paying user
    if (where?.parish?.owner?.stripeSubscriptionId?.not === null) {
      if (where?.plan?.in) return counts.planDoubleCountedTenants ?? 0;
      return counts.tenantsOwnedByPayingUsers ?? 0;
    }
    if (where?.status === 'ACTIVE' && where?.plan?.notIn) {
      return counts.payingTenants ?? 0;
    }
    if (where?.status === 'ACTIVE' && where?.plan?.in) {
      return counts.planPayingTenants ?? 0;
    }
    if (where?.status === 'TRIAL' && where?.trialEndsAt?.gte && where?.trialEndsAt?.lte) {
      return counts.trialsExpiringTenants ?? 0;
    }
    if (where?.status === 'TRIAL' && where?.plan?.in && where?.trialEndsAt?.gte) {
      return counts.planTrialTenants ?? 0;
    }
    if (where?.status === 'TRIAL' && where?.trialEndsAt?.gte) {
      return counts.trialTenants ?? 0;
    }
    if (where?.status === 'TRIAL' && where?.trialEndsAt?.lt) {
      return counts.expiredTrialTenants ?? 0;
    }
    if (where?.status === 'PAST_DUE') {
      return counts.pastDueTenants ?? 0;
    }
    throw new Error(`Unexpected TenantBilling.count where: ${JSON.stringify(where)}`);
  });

  return {
    entities: {
      User: { count: userCount },
      TenantBilling: { count: tenantCount },
    },
    userCount,
    tenantCount,
  };
}

describe('planSlugAliases', () => {
  it('normalizes SINGLE and single to the same alias set', () => {
    expect(planSlugAliases('SINGLE').sort()).toEqual(['SINGLE', 'single'].sort());
    expect(planSlugAliases('single').sort()).toEqual(['single', 'SINGLE'].sort());
  });
});

describe('uniquePayersFromParts', () => {
  it('subtracts tenants owned by already-counted paying users', () => {
    // 3 paying users + 2 tenants, 1 of which is a solo catechist personal space
    expect(uniquePayersFromParts(3, 2, 1)).toBe(4);
  });

  it('does not go below zero', () => {
    expect(uniquePayersFromParts(0, 1, 2)).toBe(0);
  });

  it('equals the naive sum when there is no overlap', () => {
    expect(uniquePayersFromParts(5, 3, 0)).toBe(8);
  });
});

describe('getAccountStatusCounts', () => {
  it('aggregates paying, trial, expired, past due and 7d trials', async () => {
    const ctx = mockContext({
      payingTenants: 2,
      payingUsers: 3,
      tenantsOwnedByPayingUsers: 1,
      manualActiveUsers: 1,
      trialUsers: 4,
      trialTenants: 5,
      expiredTrialUsers: 6,
      expiredTrialTenants: 7,
      pastDueUsers: 8,
      pastDueTenants: 9,
      trialsExpiringUsers: 10,
      trialsExpiringTenants: 11,
    });

    const now = new Date('2026-10-27T12:00:00.000Z');
    const result = await getAccountStatusCounts(ctx, now);

    expect(result).toEqual({
      payingTenants: 2,
      payingUsers: 3,
      uniquePayers: 4, // 3 + 2 - 1
      manualActiveUsers: 1,
      trialUsers: 4,
      trialTenants: 5,
      expiredTrialUsers: 6,
      expiredTrialTenants: 7,
      pastDue: 17,
      trialsExpiring7d: 21,
    });
  });

  it('queries paying users with stripeSubscriptionId and manual without it', async () => {
    const ctx = mockContext({
      payingTenants: 0,
      payingUsers: 5,
      tenantsOwnedByPayingUsers: 0,
      manualActiveUsers: 2,
      trialUsers: 0,
      trialTenants: 0,
      expiredTrialUsers: 0,
      expiredTrialTenants: 0,
      pastDueUsers: 0,
      pastDueTenants: 0,
      trialsExpiringUsers: 0,
      trialsExpiringTenants: 0,
    });

    const result = await getAccountStatusCounts(ctx);
    expect(result.payingUsers).toBe(5);
    expect(result.uniquePayers).toBe(5);
    expect(result.manualActiveUsers).toBe(2);

    expect(
      ctx.userCount.mock.calls.some(
        ([args]: any[]) => args.where?.stripeSubscriptionId?.not === null,
      ),
    ).toBe(true);
    expect(
      ctx.userCount.mock.calls.some(
        ([args]: any[]) => args.where?.stripeSubscriptionId === null,
      ),
    ).toBe(true);
  });

  it('dedupes solo catechist with personal-space TenantBilling ACTIVE', async () => {
    // 1 paying user + 1 personal TenantBilling owned by that user → 1 unique payer
    const ctx = mockContext({
      payingTenants: 1,
      payingUsers: 1,
      tenantsOwnedByPayingUsers: 1,
      manualActiveUsers: 0,
      trialUsers: 0,
      trialTenants: 0,
      expiredTrialUsers: 0,
      expiredTrialTenants: 0,
      pastDueUsers: 0,
      pastDueTenants: 0,
      trialsExpiringUsers: 0,
      trialsExpiringTenants: 0,
    });

    const result = await getAccountStatusCounts(ctx);
    expect(result.payingUsers + result.payingTenants).toBe(2); // naive sum double-counts
    expect(result.uniquePayers).toBe(1);

    expect(
      ctx.tenantCount.mock.calls.some(
        ([args]: any[]) => args.where?.parish?.owner?.stripeSubscriptionId?.not === null,
      ),
    ).toBe(true);
  });
});

describe('countPayingForPlan / countTrialForPlan', () => {
  it('matches plan slugs case-insensitively and dedupes uniquePayers', async () => {
    const ctx = mockContext({
      planPayingUsers: 2,
      planPayingTenants: 3,
      planDoubleCountedTenants: 1,
      planTrialUsers: 4,
      planTrialTenants: 1,
    });

    const paying = await countPayingForPlan(ctx, 'SINGLE');
    expect(paying).toEqual({ users: 2, tenants: 3, total: 4, uniquePayers: 4 });

    const payingArgs = ctx.userCount.mock.calls[0][0];
    expect(payingArgs.where.subscriptionPlan.in).toEqual(
      expect.arrayContaining(['SINGLE', 'single']),
    );

    const trial = await countTrialForPlan(ctx, 'single', new Date('2026-10-27T12:00:00.000Z'));
    expect(trial).toEqual({ users: 4, tenants: 1, total: 5 });
  });
});
