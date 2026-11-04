export type CheckoutConfiguration = {
  primary: boolean;
  cutoffISO: string;
  urls: Record<string, string>;
};

const LIVE_STRIPE_STATUSES = ['active', 'trialing', 'past_due', 'cancel_at_period_end'];
const HOTMART_SALES_PLANS = new Set(['single', 'unlimited', 'diocese']);

export type CheckoutUser = {
  email?: string | null;
  paymentProcessorUserId?: string | null;
  stripeSubscriptionId?: string | null;
  subscriptionStatus?: string | null;
} | null | undefined;

/** Parish aliases share the Paróquia offer. Diocese keeps its own URL. */
export function canonicalHotmartPlan(plan: string): string {
  const value = plan.trim().toLowerCase();
  if (value === 'parish' || value === 'paroquia' || value === 'paróquia') return 'unlimited';
  if (value === 'catequista' || value === 'catechist') return 'single';
  if (value === 'diocese' || value === 'diócese') return 'diocese';
  return value;
}

export function isHotmartSalesPlan(plan: string): boolean {
  return HOTMART_SALES_PLANS.has(canonicalHotmartPlan(plan));
}

export function isLiveStripeSubscriber(user: CheckoutUser): boolean {
  if (!user?.stripeSubscriptionId && !user?.paymentProcessorUserId) return false;
  return LIVE_STRIPE_STATUSES.includes((user?.subscriptionStatus || '').toLowerCase());
}

/**
 * When the Hotmart flag is on, new sales of these plans do not fall through to Stripe.
 * Existing live Stripe subscribers stay on Stripe.
 */
export function hotmartBlocksStripeCheckout(config: CheckoutConfiguration | null | undefined, plan: string, user: CheckoutUser): boolean {
  return Boolean(config?.primary && isHotmartSalesPlan(plan) && !isLiveStripeSubscriber(user));
}

/** Public checkout URLs only. Preserve campaign parameters supplied by the owner. */
export function hotmartCheckoutUrl(
  config: CheckoutConfiguration | null | undefined,
  plan: string,
  interval: string = 'monthly',
  user?: CheckoutUser,
): string | null {
  if (!config?.primary) return null;
  if (isLiveStripeSubscriber(user)) return null;
  const raw = config.urls[`${canonicalHotmartPlan(plan)}_${interval}`];
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') return null;
    url.searchParams.set('sck', 'catechis');
    if (user?.email) url.searchParams.set('email', user.email);
    return url.toString();
  } catch {
    return null;
  }
}
