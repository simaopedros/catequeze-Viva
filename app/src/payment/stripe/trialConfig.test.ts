import { describe, expect, it } from 'vitest';
import { SUBSCRIPTION_TRIAL_DAYS } from '../../shared/pricing';
import { getCheckoutTrialConfig } from './trialConfig';

describe('getCheckoutTrialConfig', () => {
  it('enables a no-card trial for subscription checkout and preserves metadata', () => {
    expect(getCheckoutTrialConfig('subscription', { plan_id: 'single' })).toEqual({
      payment_method_collection: 'if_required',
      subscription_data: {
        metadata: { plan_id: 'single' },
        trial_period_days: SUBSCRIPTION_TRIAL_DAYS,
        trial_settings: {
          end_behavior: {
            missing_payment_method: 'cancel',
          },
        },
      },
    });
  });

  it('does not add trial config to one-time payments', () => {
    expect(getCheckoutTrialConfig('payment')).toEqual({});
  });
});
