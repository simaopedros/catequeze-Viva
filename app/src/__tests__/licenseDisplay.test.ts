import { describe, expect, it } from 'vitest';
import {
  deriveLicenseStatus,
  resolveLicensePlanSlug,
} from '../server/billing/licenseDisplay';

describe('resolveLicensePlanSlug', () => {
  it('prefers non-free TenantBilling plan over owner plan', () => {
    expect(
      resolveLicensePlanSlug({ billingPlan: 'single', ownerPlan: 'unlimited' }),
    ).toBe('single');
  });

  it('falls back to owner subscriptionPlan when billing is missing or free', () => {
    expect(
      resolveLicensePlanSlug({ billingPlan: null, ownerPlan: 'SINGLE' }),
    ).toBe('SINGLE');
    expect(
      resolveLicensePlanSlug({
        billingPlan: 'catechist_free',
        ownerPlan: 'single',
      }),
    ).toBe('single');
  });

  it('returns free plan when that is all that exists', () => {
    expect(
      resolveLicensePlanSlug({
        billingPlan: 'catechist_free',
        ownerPlan: null,
      }),
    ).toBe('catechist_free');
  });
});

describe('deriveLicenseStatus', () => {
  const now = new Date('2026-10-27T12:00:00.000Z');

  it('marks Stripe active owner as paying', () => {
    expect(
      deriveLicenseStatus(
        {
          ownerSubscriptionStatus: 'active',
          ownerStripeSubscriptionId: 'sub_123',
          billingStatus: null,
        },
        now,
      ),
    ).toBe('paying');
  });

  it('marks active without stripe as manual (liberado manualmente)', () => {
    expect(
      deriveLicenseStatus(
        {
          ownerSubscriptionStatus: 'active',
          ownerStripeSubscriptionId: null,
          billingStatus: 'ACTIVE',
        },
        now,
      ),
    ).toBe('manual');
  });

  it('marks ACTIVE tenant without owner stripe as manual', () => {
    expect(
      deriveLicenseStatus(
        {
          ownerSubscriptionStatus: null,
          ownerStripeSubscriptionId: null,
          billingStatus: 'ACTIVE',
        },
        now,
      ),
    ).toBe('manual');
  });

  it('derives trialing and trial_expired from trialEndsAt', () => {
    expect(
      deriveLicenseStatus(
        {
          ownerSubscriptionStatus: 'trialing',
          ownerTrialEndsAt: '2026-11-01T00:00:00.000Z',
        },
        now,
      ),
    ).toBe('trialing');
    expect(
      deriveLicenseStatus(
        {
          billingStatus: 'TRIAL',
          billingTrialEndsAt: '2026-10-01T00:00:00.000Z',
        },
        now,
      ),
    ).toBe('trial_expired');
  });

  it('maps past_due and canceled', () => {
    expect(
      deriveLicenseStatus(
        {
          ownerSubscriptionStatus: 'past_due',
          ownerStripeSubscriptionId: 'sub_x',
        },
        now,
      ),
    ).toBe('past_due');
    expect(
      deriveLicenseStatus({ billingStatus: 'CANCELED' }, now),
    ).toBe('canceled');
  });
});
