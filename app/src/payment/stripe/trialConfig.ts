import Stripe from 'stripe';
export { resolveStripeCheckoutTrialDays } from '../../shared/checkoutTrialDays';

export function getCheckoutTrialConfig(
  mode: Stripe.Checkout.Session.Mode,
  metadata?: Stripe.MetadataParam,
  trialPeriodDays: number = 0,
): Pick<
  Stripe.Checkout.SessionCreateParams,
  'payment_method_collection' | 'subscription_data'
> {
  if (mode !== 'subscription') {
    return {};
  }

  const subscriptionData: Stripe.Checkout.SessionCreateParams.SubscriptionData =
    {};

  if (metadata && Object.keys(metadata).length > 0) {
    subscriptionData.metadata = metadata;
  }

  if (trialPeriodDays > 0) {
    subscriptionData.trial_period_days = trialPeriodDays;
  }

  if (Object.keys(subscriptionData).length > 0) {
    return {
      payment_method_collection: 'always',
      subscription_data: subscriptionData,
    };
  }
  return { payment_method_collection: 'always' };
}
