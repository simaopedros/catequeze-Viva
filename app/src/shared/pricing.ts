/**
 * Entitlement helpers (subscription status, product trial, workspace plan)
 * plus re-exports of the product catalog from planCatalog.ts.
 *
 * Plan data (prices, limits, features, visibility) lives in
 * shared/planCatalog.ts (DEFAULT_PLANS) and, when PRICING_CATALOG_SOURCE=db,
 * in the PricingPlan tables.
 */

export {
  PRICING_VERSION,
  SUBSCRIPTION_TRIAL_DAYS,
  LAUNCH_CATEQUISTA_ONLY,
  PLAN_IDS,
  PLAN_ALIASES,
  PLAN_NAMES,
  LIMIT_LABELS,
  PLANS,
  DEFAULT_PLANS,
  DEFAULT_PLANS_BY_SLUG,
  DEFAULT_PLAN_LIST,
  DEFAULT_CATALOG_SNAPSHOT,
  SYSTEM_PLAN_SLUGS,
  KNOWN_PLAN_SLUGS,
  AI_CREDIT_PACK_IDS,
  AI_CREDIT_PACKS,
  AI_CREDITS,
  AI_CREDIT_COST,
  FREE_TRIAL_CREDITS,
  INSTITUTIONAL_PLANS,
  prismaPlanValues,
  PRISMA_FREE_PLANS,
  PRISMA_INSTITUTIONAL_PLANS,
  PRISMA_PAID_PARISH_PLANS,
  getAllPlanIds,
  getAvailablePlanIds,
  resolvePlanId,
  resolvePlanIdOrFree,
  getCatalogPlan,
  getPlanLimits,
  getSocialLimits,
  planCanPublishSocial,
  planName,
  localizedPlanField,
  planHasAiAccess,
  getMonthlyAllowance,
  getDailyLimit,
  getAiCreditScope,
  getInitialCredits,
  getPlanPriceCents,
  getActiveCatalogPrice,
  isInstitutionalPlan,
  isPersonalPlan,
  mapLegacyTenantPlan,
  catalogEffect,
  publicCatalogPlans,
  snapshotFromPlans,
  toPlanDefinition,
  formatPriceLabel,
  lookupKeyFor,
  slugFromLookupKey,
  type PlanId,
  type KnownPlanId,
  type LegacyPlanId,
  type PlanDefinition,
  type PlanLimits,
  type SocialLimits,
  type AiCreditScope,
  type CatalogPlan,
  type CatalogPrice,
  type CatalogBySlug,
  type PlanCatalogSnapshot,
  type PricingPlanKind,
  type PricingPlanLevel,
  type PricingInterval,
  type AiCreditPackId,
} from './planCatalog';

import {
  SUBSCRIPTION_TRIAL_DAYS,
  isInstitutionalPlan,
  isPersonalPlan,
  resolvePlanId,
  resolvePlanIdOrFree,
} from './planCatalog';
import type { PlanId } from './planCatalog';

const ACTIVE_LIKE_STATUSES = new Set(['active', 'cancel_at_period_end', 'past_due']);

/** Default plan granted during the no-card product trial. */
export const PRODUCT_TRIAL_PLAN_ID: PlanId = 'single';

export type UserSubscriptionFields = {
  subscriptionStatus?: string | null;
  subscriptionPlan?: string | null;
  createdAt?: Date | string | null;
};

export function isSubscriptionActiveLike(status: string | null | undefined): boolean {
  if (!status) return false;
  return ACTIVE_LIKE_STATUSES.has(status.toLowerCase());
}

export function isProductTrialStatus(status: string | null | undefined): boolean {
  return (status || '').toLowerCase() === 'trialing';
}

export function isProductTrialWindowOpen(
  createdAt: Date | string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!createdAt) return false;
  const start = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
  if (Number.isNaN(start.getTime())) return false;
  const endMs = start.getTime() + SUBSCRIPTION_TRIAL_DAYS * 24 * 60 * 60 * 1000;
  return endMs >= now.getTime();
}

export function getPersonalPlanId(
  user: UserSubscriptionFields | null | undefined,
): string {
  const status = (user?.subscriptionStatus || '').toLowerCase();

  if (isProductTrialStatus(status) && isProductTrialWindowOpen(user?.createdAt)) {
    const trialPlan = (user?.subscriptionPlan || PRODUCT_TRIAL_PLAN_ID).toLowerCase();
    const resolvedTrial = resolvePlanId(trialPlan);
    if (
      resolvedTrial &&
      resolvedTrial !== 'catechist_free' &&
      isPersonalPlan(resolvedTrial)
    ) {
      return resolvedTrial;
    }
    return PRODUCT_TRIAL_PLAN_ID;
  }

  const active = isSubscriptionActiveLike(user?.subscriptionStatus);
  const plan = (active ? user?.subscriptionPlan : null)?.toLowerCase() || '';
  const resolved = resolvePlanId(plan);
  if (resolved && isPersonalPlan(resolved) && resolved !== 'catechist_free') {
    return resolved;
  }
  if (resolved && isPersonalPlan(resolved)) {
    return resolved;
  }
  return 'catechist_free';
}

export function hasPersonalAccess(
  user: UserSubscriptionFields | null | undefined,
): boolean {
  return getPersonalPlanId(user) !== 'catechist_free';
}

export function isOnProductTrial(
  user: UserSubscriptionFields | null | undefined,
  now: Date = new Date(),
): boolean {
  return (
    isProductTrialStatus(user?.subscriptionStatus) &&
    isProductTrialWindowOpen(user?.createdAt, now)
  );
}

export function getProductTrialEndsAt(
  createdAt: Date | string | null | undefined,
): Date | null {
  if (!createdAt) return null;
  const start = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
  if (Number.isNaN(start.getTime())) return null;
  return new Date(start.getTime() + SUBSCRIPTION_TRIAL_DAYS * 24 * 60 * 60 * 1000);
}

export function getProductTrialDaysLeft(
  user: UserSubscriptionFields | null | undefined,
  now: Date = new Date(),
): number | null {
  if (!isOnProductTrial(user, now)) return null;
  const endsAt = getProductTrialEndsAt(user?.createdAt);
  if (!endsAt) return null;
  return Math.max(0, Math.ceil((endsAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
}

export interface BillingInfo {
  plan: string;
  status: string;
  trialEndsAt?: string | null | Date;
}

export function isBillingActive(
  billing: BillingInfo | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!billing) return false;
  if (billing.status === 'ACTIVE' || billing.status === 'PAST_DUE') return true;
  if (billing.status === 'TRIAL' && billing.trialEndsAt) {
    const trialEnd = typeof billing.trialEndsAt === 'string'
      ? new Date(billing.trialEndsAt)
      : billing.trialEndsAt;
    return trialEnd >= now;
  }
  return false;
}

export function isOnInstitutionalTrial(
  billing: BillingInfo | null | undefined,
  now: Date = new Date(),
): boolean {
  return Boolean(
    billing && billing.status === 'TRIAL' && isBillingActive(billing, now),
  );
}

export function getInstitutionalTrialDaysLeft(
  billing: BillingInfo | null | undefined,
  now: Date = new Date(),
): number | null {
  if (!isOnInstitutionalTrial(billing, now) || !billing?.trialEndsAt) return null;
  const endsAt =
    typeof billing.trialEndsAt === 'string'
      ? new Date(billing.trialEndsAt)
      : billing.trialEndsAt;
  if (Number.isNaN(endsAt.getTime())) return null;
  return Math.max(0, Math.ceil((endsAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
}

export function getEffectiveBillingPlan(billing: BillingInfo | null | undefined): string {
  if (!billing) return 'CATECHIST_FREE';
  if (!isBillingActive(billing)) return 'CATECHIST_FREE';
  const resolved = resolvePlanId(billing.plan);
  if (!resolved || resolved === 'catechist_free') {
    if (billing.status === 'TRIAL') return PRODUCT_TRIAL_PLAN_ID.toUpperCase();
    return 'CATECHIST_FREE';
  }
  return resolved.toUpperCase();
}

export function hasInstitutionalAccess(billing: BillingInfo | null | undefined): boolean {
  return getInstitutionalPlanId(billing) != null;
}

export function getInstitutionalPlanId(billing: BillingInfo | null | undefined): PlanId | null {
  if (!isBillingActive(billing)) return null;
  const effective = getEffectiveBillingPlan(billing);
  const resolved = resolvePlanId(effective);
  if (resolved && resolved !== 'catechist_free') {
    return resolved;
  }
  return null;
}

export interface WorkspaceEffectivePlan {
  plan: PlanId;
  source: 'personal' | 'institutional' | 'trial' | 'free';
  billingInfo?: BillingInfo | null;
}

export function getWorkspaceEffectivePlan(opts: {
  user: UserSubscriptionFields | null | undefined;
  parishType?: string | null;
  billing?: BillingInfo | null;
  dioceseBilling?: BillingInfo | null;
}): WorkspaceEffectivePlan {
  const { user, parishType, billing, dioceseBilling } = opts;
  const isPersonal = !parishType || parishType === 'PERSONAL';

  if (isPersonal) {
    const plan = resolvePlanIdOrFree(getPersonalPlanId(user));
    const status = (user?.subscriptionStatus || '').toLowerCase();
    if (plan !== 'catechist_free' && isProductTrialStatus(status)) {
      return { plan, source: 'trial' };
    }
    return {
      plan,
      source: plan === 'catechist_free' ? 'free' : 'personal',
    };
  }

  if (billing && isBillingActive(billing)) {
    const plan = getInstitutionalPlanId(billing);
    if (plan) {
      if (billing.status === 'TRIAL') {
        return { plan, source: 'trial', billingInfo: billing };
      }
      return { plan, source: 'institutional', billingInfo: billing };
    }
  }

  if (dioceseBilling && isBillingActive(dioceseBilling)) {
    const umbrella = getInstitutionalPlanId(dioceseBilling);
    if (umbrella && isInstitutionalPlan(umbrella)) {
      return {
        plan: umbrella,
        source: 'institutional',
        billingInfo: dioceseBilling,
      };
    }
  }

  if (billing && billing.status === 'TRIAL' && billing.trialEndsAt) {
    const trialEnd = typeof billing.trialEndsAt === 'string'
      ? new Date(billing.trialEndsAt)
      : billing.trialEndsAt;
    if (trialEnd >= new Date()) {
      const resolved = resolvePlanId(billing.plan);
      const trialPlan =
        resolved && resolved !== 'catechist_free' ? resolved : PRODUCT_TRIAL_PLAN_ID;
      return { plan: trialPlan, source: 'trial', billingInfo: billing };
    }
  }

  return { plan: 'catechist_free', source: 'free' };
}
