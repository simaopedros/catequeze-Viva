import Stripe from 'stripe';
import {
  SUBSCRIPTION_TRIAL_DAYS,
  getInstitutionalTrialDaysLeft,
  getProductTrialDaysLeft,
  isOnProductTrial,
  isProductTrialStatus,
  isSubscriptionActiveLike,
  type BillingInfo,
  UserSubscriptionFields,
} from '../../shared/pricing';

/**
 * Days of Stripe trial to grant at checkout.
 *
 * New commercial subscriptions get SUBSCRIPTION_TRIAL_DAYS. Users who already
 * consumed a Stripe trial (or a paid subscription) get 0. Grandfathered
 * in-app trials receive only remaining days so Assinar does not add a second
 * full week.
 *
 * Credits / one-time: always 0.
 */
export function resolveStripeCheckoutTrialDays(args: {
  isCredits?: boolean;
  user?: UserSubscriptionFields | null;
  institutionalBilling?: BillingInfo | null;
  now?: Date;
}): number {
  if (args.isCredits) return 0;

  const now = args.now ?? new Date();
  const user = args.user;

  if (isSubscriptionActiveLike(user?.subscriptionStatus)) return 0;

  if (hasConsumedStripeTrial(user)) return 0;

  // In-app grandfather: remaining window only — never a second full week.
  // A Stripe customer from an abandoned Checkout must not look like a used trial.
  if (isProductTrialStatus(user?.subscriptionStatus) && !user?.trialEndsAt) {
    if (isOnProductTrial(user, now)) {
      return clampTrialDays(getProductTrialDaysLeft(user, now) ?? 0);
    }
    return 0;
  }

  const instDays = getInstitutionalTrialDaysLeft(
    args.institutionalBilling,
    now,
  );
  if (instDays != null && instDays > 0) {
    if (user?.paymentProcessorUserId) return 0;
    return clampTrialDays(instDays);
  }

  return SUBSCRIPTION_TRIAL_DAYS;
}

function hasConsumedStripeTrial(
  user: UserSubscriptionFields | null | undefined,
): boolean {
  if (!user?.paymentProcessorUserId) return false;
  return Boolean(user.trialEndsAt);
}

function clampTrialDays(days: number): number {
  if (!Number.isFinite(days) || days <= 0) return 0;
  return Math.min(SUBSCRIPTION_TRIAL_DAYS, Math.ceil(days));
}

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
