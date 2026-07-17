import Stripe from 'stripe';
import {
  getInstitutionalTrialDaysLeft,
  getProductTrialDaysLeft,
  SUBSCRIPTION_TRIAL_DAYS,
  type BillingInfo,
  type UserSubscriptionFields,
} from '../../shared/pricing';

/**
 * Days of Stripe trial to grant at checkout.
 *
 * Aligns with the no-card product trial window (and institutional TenantBilling
 * TRIAL when present): only the **remaining** free days, never a second full
 * SUBSCRIPTION_TRIAL_DAYS block after the product trial has ended.
 *
 * - Credits / one-time: always 0
 * - On product or institutional trial: ceil(days left), capped at SUBSCRIPTION_TRIAL_DAYS
 * - After trial expired or never on trial: 0 (charge from first period)
 */
export function resolveStripeCheckoutTrialDays(args: {
  isCredits?: boolean;
  user?: UserSubscriptionFields | null;
  institutionalBilling?: BillingInfo | null;
  now?: Date;
}): number {
  if (args.isCredits) return 0;
  const now = args.now ?? new Date();
  const productLeft = getProductTrialDaysLeft(args.user, now);
  const institutionalLeft = getInstitutionalTrialDaysLeft(
    args.institutionalBilling,
    now,
  );
  const remaining = Math.max(productLeft ?? 0, institutionalLeft ?? 0);
  // remaining already uses ceil whole days; keep integer in [0, SUBSCRIPTION_TRIAL_DAYS]
  return Math.min(SUBSCRIPTION_TRIAL_DAYS, Math.max(0, remaining));
}

export function getCheckoutTrialConfig(
  mode: Stripe.Checkout.Session.Mode,
  metadata?: Stripe.MetadataParam,
  /** Remaining free days; 0 or omit = no Stripe trial (immediate bill after PM). */
  trialPeriodDays: number = 0,
): Pick<
  Stripe.Checkout.SessionCreateParams,
  'payment_method_collection' | 'subscription_data'
> {
  if (mode !== 'subscription') {
    return {};
  }

  const days = Math.min(
    SUBSCRIPTION_TRIAL_DAYS,
    Math.max(0, Math.floor(trialPeriodDays)),
  );

  const subscriptionData: Stripe.Checkout.SessionCreateParams.SubscriptionData =
    {};

  if (metadata && Object.keys(metadata).length > 0) {
    subscriptionData.metadata = metadata;
  }

  // Stripe rejects trial_period_days: 0 — only set when there is remaining trial.
  if (days > 0) {
    subscriptionData.trial_period_days = days;
    subscriptionData.trial_settings = {
      end_behavior: {
        missing_payment_method: 'cancel',
      },
    };
    return {
      payment_method_collection: 'if_required',
      subscription_data: subscriptionData,
    };
  }

  // No free days left: require a payment method and start billing immediately.
  if (Object.keys(subscriptionData).length > 0) {
    return { subscription_data: subscriptionData };
  }
  return {};
}
