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

  it('returns 0 even mid product-trial — Assinar must not start a Stripe trial', () => {
    expect(
      resolveStripeCheckoutTrialDays({
        user: {
          subscriptionStatus: 'trialing',
          subscriptionPlan: 'single',
          createdAt: new Date('2026-03-05T12:00:00.000Z'),
        },
        now,
      }),
    ).toBe(0);
  });

  it('returns 0 on signup day (in-app trial is enough)', () => {
    expect(
      resolveStripeCheckoutTrialDays({
        user: {
          subscriptionStatus: 'trialing',
          subscriptionPlan: 'single',
          createdAt: now,
        },
        now,
      }),
    ).toBe(0);
    expect(SUBSCRIPTION_TRIAL_DAYS).toBe(7);
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

  it('returns 0 even when an institutional trial remainder exists', () => {
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
    ).toBe(0);
  });
});

describe('getCheckoutTrialConfig', () => {
  it('never sets trial_period_days even if leftover days are passed', () => {
    const config = getCheckoutTrialConfig('subscription', { plan_id: 'single' }, 7);
    expect(config.payment_method_collection).toBe('always');
    expect(config.subscription_data?.trial_period_days).toBeUndefined();
    expect(config.subscription_data?.trial_settings).toBeUndefined();
    expect(config.subscription_data?.metadata).toEqual({ plan_id: 'single' });
    expect(JSON.stringify(config)).not.toMatch(/trial_period_days/);
  });

  it('ignores a remaining-days argument', () => {
    const config = getCheckoutTrialConfig('subscription', { plan_id: 'single' }, 2);
    expect(config.payment_method_collection).toBe('always');
    expect(config.subscription_data?.trial_period_days).toBeUndefined();
  });

  it('collects a card and omits Stripe trial when days are 0', () => {
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
