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
      if (where.subscriptionStatus?.in) return counts.planPayingUsers ?? 0;
      if (where.subscriptionStatus === 'trialing') return counts.planTrialUsers ?? 0;
    }
    if (
      where?.subscriptionStatus?.in &&
      where?.stripeSubscriptionId?.not === null
    ) {
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
    // Manual courtesy tenants (OR clause)
    if (where?.OR) {
      return counts.manualActiveTenants ?? 0;
    }
    // Paying / double-counted: ACTIVE non-free with parish.owner stripe payer
    if (where?.parish?.owner?.stripeSubscriptionId?.not === null) {
      if (where?.plan?.in && where?.parish?.owner?.subscriptionPlan?.in) {
        return counts.planDoubleCountedTenants ?? 0;
      }
      if (where?.plan?.in) return counts.planPayingTenants ?? 0;
      return counts.payingTenants ?? counts.tenantsOwnedByPayingUsers ?? 0;
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
  it('aggregates paying, trial, expired, past due, manual tenants and 7d trials', async () => {
    const ctx = mockContext({
      payingTenants: 1,
      payingUsers: 3,
      tenantsOwnedByPayingUsers: 1,
      manualActiveUsers: 2,
      manualActiveTenants: 1,
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
      payingTenants: 1,
      payingUsers: 3,
      uniquePayers: 3, // 3 + 1 - 1
      manualActiveUsers: 2,
      manualActiveTenants: 1,
      trialUsers: 4,
      trialTenants: 5,
      expiredTrialUsers: 6,
      expiredTrialTenants: 7,
      pastDue: 17,
      trialsExpiring7d: 21,
    });
  });

  it('prod scenario: 1 stripe payer + manual courtesy tenant → uniquePayers 1', async () => {
    // Real Stripe payer (user); courtesy user owns PERSONAL TenantBilling ACTIVE single
    // → tenant is manual, not paying.
    const ctx = mockContext({
      payingTenants: 0,
      payingUsers: 1,
      tenantsOwnedByPayingUsers: 0,
      manualActiveUsers: 2,
      manualActiveTenants: 1,
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
    expect(result.uniquePayers).toBe(1);
    expect(result.payingUsers).toBe(1);
    expect(result.payingTenants).toBe(0);
    expect(result.manualActiveUsers).toBe(2);
    expect(result.manualActiveTenants).toBe(1);

    expect(
      ctx.tenantCount.mock.calls.some(
        ([args]: any[]) => args.where?.parish?.owner?.stripeSubscriptionId?.not === null,
      ),
    ).toBe(true);
    expect(
      ctx.tenantCount.mock.calls.some(([args]: any[]) => Array.isArray(args.where?.OR)),
    ).toBe(true);
  });

  it('queries paying users with stripeSubscriptionId and status in active/past_due', async () => {
    const ctx = mockContext({
      payingTenants: 0,
      payingUsers: 5,
      tenantsOwnedByPayingUsers: 0,
      manualActiveUsers: 2,
      manualActiveTenants: 0,
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

    const payingCall = ctx.userCount.mock.calls.find(
      ([args]: any[]) => args.where?.stripeSubscriptionId?.not === null,
    );
    expect(payingCall?.[0].where.subscriptionStatus.in).toEqual(
      expect.arrayContaining(['active', 'past_due']),
    );
  });
});

describe('countPayingForPlan / countTrialForPlan', () => {
  it('only counts tenants whose owner is a Stripe payer and dedupes uniquePayers', async () => {
    const ctx = mockContext({
      planPayingUsers: 1,
      planPayingTenants: 0, // courtesy ACTIVE tenant must not count
      planDoubleCountedTenants: 0,
      planTrialUsers: 4,
      planTrialTenants: 1,
    });

    const paying = await countPayingForPlan(ctx, 'SINGLE');
    expect(paying).toEqual({ users: 1, tenants: 0, total: 1, uniquePayers: 1 });

    const payingArgs = ctx.userCount.mock.calls[0][0];
    expect(payingArgs.where.subscriptionPlan.in).toEqual(
      expect.arrayContaining(['SINGLE', 'single']),
    );
    expect(payingArgs.where.subscriptionStatus.in).toEqual(
      expect.arrayContaining(['active', 'past_due']),
    );

    const trial = await countTrialForPlan(ctx, 'single', new Date('2026-10-27T12:00:00.000Z'));
    expect(trial).toEqual({ users: 4, tenants: 1, total: 5 });
  });
});
