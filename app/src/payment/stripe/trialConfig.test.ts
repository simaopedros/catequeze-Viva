import { describe, expect, it } from 'vitest';
import { SUBSCRIPTION_TRIAL_DAYS } from '../../shared/pricing';
import {
  getCheckoutTrialConfig,
  resolveStripeCheckoutTrialDays,
} from './trialConfig';

describe('resolveStripeCheckoutTrialDays', () => {
  const now = new Date('2026-03-10T12:00:00.000Z');

  it('returns 0 for credits purchases', () => {
    expect(
      resolveStripeCheckoutTrialDays({
        isCredits: true,
        user: {
          subscriptionStatus: 'trialing',
          createdAt: new Date('2026-03-08T12:00:00.000Z'),
        },
        now,
      }),
    ).toBe(0);
  });

  it('returns remaining product trial days mid-window (not a full second trial)', () => {
    // 5 days into a 7-day trial → 2 days left (ceil)
    expect(
      resolveStripeCheckoutTrialDays({
        user: {
          subscriptionStatus: 'trialing',
          subscriptionPlan: 'single',
          createdAt: new Date('2026-03-05T12:00:00.000Z'),
        },
        now,
      }),
    ).toBe(2);
  });

  it('returns full window when checkout is on signup day', () => {
    expect(
      resolveStripeCheckoutTrialDays({
        user: {
          subscriptionStatus: 'trialing',
          subscriptionPlan: 'single',
          createdAt: now,
        },
        now,
      }),
    ).toBe(SUBSCRIPTION_TRIAL_DAYS);
  });

  it('returns 0 when product trial has expired', () => {
    expect(
      resolveStripeCheckoutTrialDays({
        user: {
          subscriptionStatus: 'trialing',
          subscriptionPlan: 'single',
          createdAt: new Date('2026-02-01T12:00:00.000Z'),
        },
        now,
      }),
    ).toBe(0);
  });

  it('returns 0 when user was never on product trial', () => {
    expect(
      resolveStripeCheckoutTrialDays({
        user: {
          subscriptionStatus: null,
          subscriptionPlan: 'catechist_free',
          createdAt: new Date('2026-03-09T12:00:00.000Z'),
        },
        now,
      }),
    ).toBe(0);
  });

  it('uses institutional trial remainder when present', () => {
    expect(
      resolveStripeCheckoutTrialDays({
        user: {
          subscriptionStatus: null,
          createdAt: new Date('2026-01-01T12:00:00.000Z'),
        },
        institutionalBilling: {
          plan: 'UNLIMITED',
          status: 'TRIAL',
          trialEndsAt: new Date('2026-03-13T12:00:00.000Z'),
        },
        now,
      }),
    ).toBe(3);
  });
});

describe('getCheckoutTrialConfig', () => {
  it('enables a no-card trial only when remaining days > 0', () => {
    expect(
      getCheckoutTrialConfig('subscription', { plan_id: 'single' }, 7),
    ).toEqual({
      payment_method_collection: 'if_required',
      subscription_data: {
        metadata: { plan_id: 'single' },
        trial_period_days: 7,
        trial_settings: {
          end_behavior: {
            missing_payment_method: 'cancel',
          },
        },
      },
    });
  });

  it('passes remaining days (not a fixed full window)', () => {
    expect(
      getCheckoutTrialConfig('subscription', { plan_id: 'single' }, 2),
    ).toMatchObject({
      payment_method_collection: 'if_required',
      subscription_data: {
        trial_period_days: 2,
      },
    });
  });

  it('omits Stripe trial when remaining days are 0', () => {
    expect(
      getCheckoutTrialConfig('subscription', { plan_id: 'single' }, 0),
    ).toEqual({
      subscription_data: {
        metadata: { plan_id: 'single' },
      },
    });
  });

  it('does not add trial config to one-time payments', () => {
    expect(getCheckoutTrialConfig('payment', undefined, 7)).toEqual({});
  });
});
