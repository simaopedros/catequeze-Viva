/**
 * Derive admin Licenças plan slug + display status from User and TenantBilling fields.
 */
import { PRISMA_FREE_PLANS } from '../../shared/pricing';

export type DerivedLicenseStatus =
  | 'paying'
  | 'trialing'
  | 'trial_expired'
  | 'manual'
  | 'past_due'
  | 'canceled';

const FREE_PLAN_SET = new Set(
  PRISMA_FREE_PLANS.map((p) => p.toLowerCase()),
);

function toDate(value: Date | string | null | undefined): Date | null {
  if (value == null) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isFreePlan(slug: string | null | undefined): boolean {
  if (!slug) return true;
  return FREE_PLAN_SET.has(slug.toLowerCase());
}

/** Prefer non-free TenantBilling.plan, else owner subscriptionPlan (case-preserving). */
export function resolveLicensePlanSlug(args: {
  billingPlan?: string | null;
  ownerPlan?: string | null;
}): string | null {
  const billing = args.billingPlan?.trim() || null;
  const owner = args.ownerPlan?.trim() || null;
  if (billing && !isFreePlan(billing)) return billing;
  if (owner && !isFreePlan(owner)) return owner;
  if (billing) return billing;
  if (owner) return owner;
  return null;
}

/**
 * Status labels expected in UI (pt-BR):
 * Pagante, Em teste, Teste vencido, Liberado manualmente, Inadimplente, Cancelado.
 */
export function deriveLicenseStatus(
  args: {
    ownerSubscriptionStatus?: string | null;
    ownerStripeSubscriptionId?: string | null;
    ownerTrialEndsAt?: Date | string | null;
    billingStatus?: string | null;
    billingTrialEndsAt?: Date | string | null;
  },
  now: Date = new Date(),
): DerivedLicenseStatus | null {
  const userStatus = (args.ownerSubscriptionStatus || '').toLowerCase();
  const billingStatus = (args.billingStatus || '').toUpperCase();
  const hasStripe = Boolean(args.ownerStripeSubscriptionId?.trim());
  const ownerTrialEnd = toDate(args.ownerTrialEndsAt);
  const billingTrialEnd = toDate(args.billingTrialEndsAt);

  if (userStatus === 'past_due' || billingStatus === 'PAST_DUE') {
    return 'past_due';
  }
  if (
    userStatus === 'canceled' ||
    userStatus === 'cancelled' ||
    userStatus === 'deleted' ||
    billingStatus === 'CANCELED'
  ) {
    return 'canceled';
  }

  if (
    hasStripe &&
    (userStatus === 'active' || userStatus === 'cancel_at_period_end')
  ) {
    return 'paying';
  }

  const onTrial = userStatus === 'trialing' || billingStatus === 'TRIAL';
  if (onTrial) {
    const end = ownerTrialEnd ?? billingTrialEnd;
    if (end && end.getTime() < now.getTime()) return 'trial_expired';
    return 'trialing';
  }

  if (userStatus === 'active' && !hasStripe) return 'manual';
  if (billingStatus === 'ACTIVE' && !hasStripe) return 'manual';
  if (billingStatus === 'ACTIVE' && hasStripe) return 'paying';

  return null;
}
