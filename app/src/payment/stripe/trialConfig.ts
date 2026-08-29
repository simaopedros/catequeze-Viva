import Stripe from 'stripe';
import type { BillingInfo, UserSubscriptionFields } from '../../shared/pricing';

/**
 * Days of Stripe trial to grant at checkout.
 *
 * Assinar must never start a second Stripe trial. The 7-day no-card product
 * trial is granted in-app on signup; Checkout collects a payment method and
 * starts the paid Plano Único immediately.
 *
 * Credits / one-time: also 0.
 */
export function resolveStripeCheckoutTrialDays(_args: {
  isCredits?: boolean;
  user?: UserSubscriptionFields | null;
  institutionalBilling?: BillingInfo | null;
  now?: Date;
}): number {
  return 0;
}

export function getCheckoutTrialConfig(
  mode: Stripe.Checkout.Session.Mode,
  metadata?: Stripe.MetadataParam,
  /** Ignored — Assinar never sets Stripe trial_period_days. */
  _trialPeriodDays: number = 0,
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

  // Never set trial_period_days / trial_settings. Always collect a card.
  if (Object.keys(subscriptionData).length > 0) {
    return {
      payment_method_collection: 'always',
      subscription_data: subscriptionData,
    };
  }
  return { payment_method_collection: 'always' };
}
