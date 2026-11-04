/** Account cohorts, independent of the current date. Missing dates stay legacy. */
const DEFAULT_CUTOFF = '2026-11-05T00:00:00-03:00';
const override = typeof process !== 'undefined'
  ? process.env.NEW_PRICING_ACCOUNT_CUTOFF_ISO
  : undefined;

// Fail closed on invalid configuration rather than silently changing cohorts.
if (override && Number.isNaN(Date.parse(override))) {
  throw new Error('NEW_PRICING_ACCOUNT_CUTOFF_ISO must be an ISO date');
}
export const NEW_PRICING_ACCOUNT_CUTOFF = override || DEFAULT_CUTOFF;

export function isNewPricingAccount(
  createdAt: Date | string | null | undefined,
  cutoffISO: string = NEW_PRICING_ACCOUNT_CUTOFF,
): boolean {
  if (!createdAt) return false;
  return new Date(createdAt).getTime() >= new Date(cutoffISO).getTime();
}

export function requiresNewAccountSubscription(
  user: { createdAt?: Date | string | null; subscriptionStatus?: string | null } | null | undefined,
  cutoffISO: string = NEW_PRICING_ACCOUNT_CUTOFF,
): boolean {
  return isNewPricingAccount(user?.createdAt, cutoffISO) &&
    !['active', 'past_due', 'cancel_at_period_end', 'trialing'].includes(
      (user?.subscriptionStatus || '').toLowerCase(),
    );
}
