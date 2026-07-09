import Stripe from 'stripe';
import { SUBSCRIPTION_TRIAL_DAYS } from '../../shared/pricing';

export function getCheckoutTrialConfig(
  mode: Stripe.Checkout.Session.Mode,
  metadata?: Stripe.MetadataParam,
): Pick<
  Stripe.Checkout.SessionCreateParams,
  'payment_method_collection' | 'subscription_data'
> {
  if (mode !== 'subscription') {
    return {};
  }

  const subscriptionData: Stripe.Checkout.SessionCreateParams.SubscriptionData = {
    trial_period_days: SUBSCRIPTION_TRIAL_DAYS,
    trial_settings: {
      end_behavior: {
        missing_payment_method: 'cancel',
      },
    },
  };

  if (metadata && Object.keys(metadata).length > 0) {
    subscriptionData.metadata = metadata;
  }

  return {
    payment_method_collection: 'if_required',
    subscription_data: subscriptionData,
  };
}
