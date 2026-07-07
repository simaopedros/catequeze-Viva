import Stripe from 'stripe';
import { SUBSCRIPTION_TRIAL_DAYS } from '../../shared/pricing';

export function getCheckoutTrialConfig(
  mode: Stripe.Checkout.Session.Mode,
): Pick<
  Stripe.Checkout.SessionCreateParams,
  'payment_method_collection' | 'subscription_data'
> {
  if (mode !== 'subscription') {
    return {};
  }

  return {
    payment_method_collection: 'if_required',
    subscription_data: {
      trial_period_days: SUBSCRIPTION_TRIAL_DAYS,
      trial_settings: {
        end_behavior: {
          missing_payment_method: 'cancel',
        },
      },
    },
  };
}
