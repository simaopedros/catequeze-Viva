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
          subscriptionStatus: null,
          createdAt: new Date('2026-03-08T12:00:00.000Z'),
        },
        now,
      }),
    ).toBe(0);
  });

  it('returns 7 for a new user with no Stripe subscription', () => {
    expect(
      resolveStripeCheckoutTrialDays({
        user: {
          subscriptionStatus: null,
          subscriptionPlan: 'catechist_free',
          createdAt: now,
        },
        now,
      }),
    ).toBe(SUBSCRIPTION_TRIAL_DAYS);
  });

  it('returns remaining days for a grandfather in-app trial', () => {
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

  it('returns 0 when the in-app trial has expired', () => {
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

  it('returns remaining days for a grandfather in-app trial even after an abandoned Checkout', () => {
    expect(
      resolveStripeCheckoutTrialDays({
        user: {
          subscriptionStatus: 'trialing',
          subscriptionPlan: 'single',
          paymentProcessorUserId: 'cus_abandoned',
          createdAt: new Date('2026-03-05T12:00:00.000Z'),
        },
        now,
      }),
    ).toBe(2);
  });

  it('returns 0 when the user already used a Stripe trial', () => {
    expect(
      resolveStripeCheckoutTrialDays({
        user: {
          subscriptionStatus: 'trialing',
          subscriptionPlan: 'single',
          paymentProcessorUserId: 'cus_1',
          trialEndsAt: new Date('2026-03-15T12:00:00.000Z'),
          createdAt: now,
        },
        now,
      }),
    ).toBe(0);
  });

  it('returns 0 for a paid active subscription', () => {
    expect(
      resolveStripeCheckoutTrialDays({
        user: {
          subscriptionStatus: 'active',
          subscriptionPlan: 'single',
          paymentProcessorUserId: 'cus_1',
          createdAt: now,
        },
        now,
      }),
    ).toBe(0);
  });

  it('credits remaining institutional trial days only for grandfather accounts', () => {
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

    expect(
      resolveStripeCheckoutTrialDays({
        user: {
          subscriptionStatus: null,
          paymentProcessorUserId: 'cus_1',
          createdAt: new Date('2026-01-01T12:00:00.000Z'),
        },
        institutionalBilling: {
          plan: 'UNLIMITED',
          status: 'TRIAL',
          trialEndsAt: new Date('2026-03-13T12:00:00.000Z'),
        },
        now,
      }),
    ).toBe(0);
  });
});

describe('getCheckoutTrialConfig', () => {
  it('sets trial_period_days when days are granted', () => {
    const config = getCheckoutTrialConfig('subscription', { plan_id: 'single' }, 7);
    expect(config.payment_method_collection).toBe('always');
    expect(config.subscription_data?.trial_period_days).toBe(7);
    expect(config.subscription_data?.metadata).toEqual({ plan_id: 'single' });
  });

  it('omits trial_period_days when days are 0', () => {
    const config = getCheckoutTrialConfig('subscription', { plan_id: 'single' }, 0);
    expect(config.payment_method_collection).toBe('always');
    expect(config.subscription_data?.trial_period_days).toBeUndefined();
    expect(JSON.stringify(config)).not.toMatch(/trial_period_days/);
  });

  it('collects a card when days are 0', () => {
    expect(
      getCheckoutTrialConfig('subscription', { plan_id: 'single' }, 0),
    ).toEqual({
      payment_method_collection: 'always',
      subscription_data: {
        metadata: { plan_id: 'single' },
      },
    });
  });

  it('does not add trial config to one-time payments', () => {
    expect(getCheckoutTrialConfig('payment', undefined, 7)).toEqual({});
  });
});
