export type CheckoutConfiguration = {
  primary: boolean;
  cutoffISO: string;
  urls: Record<string, string>;
};

/** Public checkout URLs only. Preserve campaign parameters supplied by the owner. */
export function hotmartCheckoutUrl(
  config: CheckoutConfiguration | null | undefined,
  plan: string,
  interval: string = 'monthly',
  user?: { email?: string | null; paymentProcessorUserId?: string | null; stripeSubscriptionId?: string | null; subscriptionStatus?: string | null } | null,
): string | null {
  if (!config?.primary) return null;
  if ((user?.stripeSubscriptionId || user?.paymentProcessorUserId) && ['active', 'trialing', 'past_due', 'cancel_at_period_end'].includes((user.subscriptionStatus || '').toLowerCase())) return null;
  const raw = config.urls[`${plan}_${interval}`];
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
