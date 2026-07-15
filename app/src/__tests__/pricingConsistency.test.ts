/**
 * pricingConsistency.test.ts — Guard CI: ensures plan IDs in the
 * single source of truth (pricing.ts) are consistent with all external
 * layers (payment plans, billing enforcement, cascade types).
 *
 * Covers the simplified 2-plan structure (single + unlimited) plus the
 * catechist_free sentinel and legacy alias resolution.
 *
 * Run in CI to prevent drift.
 */
import { describe, it, expect } from 'vitest';
import {
  PLANS,
  PLAN_IDS,
  PLAN_ALIASES,
  PRICING_VERSION,
  getAllPlanIds,
  resolvePlanId,
  INSTITUTIONAL_PLANS as PRICING_INSTITUTIONAL_PLANS,
  getPlanPriceCents,
  type PlanId,
} from '../shared/pricing';
import { PaymentPlanId } from '../payment/plans';
import { paymentProcessorPlanIds } from '../payment/paymentProcessorPlans';

// ─── Plan ID integrity ───────────────────────────────────────────────────

describe('pricing.ts — Plan ID integrity', () => {
  it('PLAN_IDS has no duplicates', () => {
    const unique = new Set(PLAN_IDS);
    expect(unique.size).toBe(PLAN_IDS.length);
  });

  it('PLAN_IDS is the simplified 3-entry set', () => {
    expect([...PLAN_IDS]).toEqual(['catechist_free', 'single', 'unlimited']);
  });

  it('getAllPlanIds() returns same as PLAN_IDS', () => {
    expect(getAllPlanIds()).toEqual(PLAN_IDS);
  });

  it('PRICING_VERSION is 3', () => {
    expect(PRICING_VERSION).toBe(3);
  });
});

// ─── Plan consistency with PaymentPlanId enum ────────────────────────────

describe('Plan IDs ↔ PaymentPlanId consistency', () => {
  it('every paid pricing PlanId exists in PaymentPlanId enum', () => {
    for (const planId of PLAN_IDS) {
      if (planId === 'catechist_free') continue;
      const paymentPlanId = mapPlanIdToPaymentPlanId(planId);
      expect(
        Object.values(PaymentPlanId).includes(paymentPlanId),
        `PlanId "${planId}" not found in PaymentPlanId enum`,
      ).toBe(true);
    }
  });

  it('every paid pricing PlanId has a paymentProcessorPlanId key', () => {
    for (const planId of PLAN_IDS) {
      if (planId === 'catechist_free') continue;
      const paymentPlanId = mapPlanIdToPaymentPlanId(planId);
      expect(
        paymentPlanId in paymentProcessorPlanIds,
        `paymentProcessorPlanIds missing key for ${paymentPlanId}`,
      ).toBe(true);
    }
  });

  it('monthly prices > 0 for paid plans (BRL cents)', () => {
    for (const planId of PLAN_IDS) {
      if (planId === 'catechist_free') {
        expect(getPlanPriceCents(planId, 'monthly')).toBe(0);
      } else {
        expect(getPlanPriceCents(planId, 'monthly')).toBeGreaterThan(0);
      }
    }
  });

  it('single is R$ 29 monthly / R$ 290 annual', () => {
    expect(getPlanPriceCents('single', 'monthly')).toBe(2900);
    expect(getPlanPriceCents('single', 'annual')).toBe(29000);
  });

  it('unlimited is R$ 99 monthly / R$ 990 annual', () => {
    expect(getPlanPriceCents('unlimited', 'monthly')).toBe(9900);
    expect(getPlanPriceCents('unlimited', 'annual')).toBe(99000);
  });

  it('highlight plan is unlimited', () => {
    const highlighted = PLAN_IDS.filter((id) => PLANS[id].highlight);
    expect(highlighted).toEqual(['unlimited']);
  });
});

// ─── Alias integrity ─────────────────────────────────────────────────────

describe('PLAN_ALIASES integrity', () => {
  it('aliases resolve to valid PlanIds', () => {
    for (const [alias, target] of Object.entries(PLAN_ALIASES)) {
      expect(PLAN_IDS.includes(target as PlanId), `Alias "${alias}" targets invalid PlanId "${target}"`).toBe(true);
    }
  });

  it('aliases are NOT vendable PlanIds', () => {
    for (const alias of Object.keys(PLAN_ALIASES)) {
      expect(
        (PLAN_IDS as readonly string[]).includes(alias),
        `Alias "${alias}" should NOT be in PLAN_IDS`,
      ).toBe(false);
    }
  });

  it('resolvePlanId maps pro/ai/essential legacy → single', () => {
    expect(resolvePlanId('catechist_pro')).toBe('single');
    expect(resolvePlanId('catechist_ai')).toBe('single');
    expect(resolvePlanId('parish_essential')).toBe('single');
  });

  it('resolvePlanId maps parish/diocese legacy → unlimited', () => {
    expect(resolvePlanId('parish')).toBe('unlimited');
    expect(resolvePlanId('parish_complete')).toBe('unlimited');
    expect(resolvePlanId('diocese')).toBe('unlimited');
  });

  it('resolvePlanId is case-insensitive for aliases', () => {
    expect(resolvePlanId('PARISH')).toBe('unlimited');
    expect(resolvePlanId('DIOCESE')).toBe('unlimited');
  });

  it('resolvePlanId handles active plans', () => {
    expect(resolvePlanId('catechist_free')).toBe('catechist_free');
    expect(resolvePlanId('single')).toBe('single');
    expect(resolvePlanId('unlimited')).toBe('unlimited');
  });

  it('resolvePlanId returns null for unknown', () => {
    expect(resolvePlanId('nonexistent')).toBeNull();
  });
});

// ─── Institutional plan consistency ──────────────────────────────────────

describe('Institutional plans consistency', () => {
  it('all institutional pricing plans are in INSTITUTIONAL_PLANS', () => {
    const institutionalPlanIds = PLAN_IDS.filter(
      (id) => PLANS[id].level === 'institutional',
    );
    expect(institutionalPlanIds).toEqual(['unlimited']);
    for (const planId of institutionalPlanIds) {
      const found = (PRICING_INSTITUTIONAL_PLANS as readonly string[]).some(
        (ip) => ip.toLowerCase() === planId.toLowerCase(),
      );
      expect(found, `Institutional plan "${planId}" missing from INSTITUTIONAL_PLANS`).toBe(true);
    }
  });

  it('personal plans are NOT in INSTITUTIONAL_PLANS', () => {
    const personalPlanIds = PLAN_IDS.filter(
      (id) => PLANS[id].level === 'personal',
    );
    for (const planId of personalPlanIds) {
      const found = (PRICING_INSTITUTIONAL_PLANS as readonly string[]).some(
        (ip) => ip.toLowerCase() === planId.toLowerCase(),
      );
      expect(found, `Personal plan "${planId}" should NOT be in INSTITUTIONAL_PLANS`).toBe(false);
    }
  });
});

// ─── AI scope ────────────────────────────────────────────────────────────

describe('AI scope', () => {
  it('all plans have user scope', () => {
    for (const planId of PLAN_IDS) {
      expect(
        PLANS[planId].ai.scope,
        `Plan "${planId}" should have scope "user"`,
      ).toBe('user');
    }
  });

  it('sentinel (catechist_free) grants zero AI access', () => {
    expect(PLANS.catechist_free.ai.monthlyCredits).toBe(0);
    expect(PLANS.catechist_free.limits.maxClasses).toBe(0);
    expect(PLANS.catechist_free.limits.maxCatechumens).toBe(0);
  });
});

// ─── Entitlement helpers ──────────────────────────────────────────────────

import {
  isSubscriptionActiveLike,
  hasPersonalAccess,
  getPersonalPlanId,
  hasInstitutionalAccess,
  getInstitutionalPlanId,
  isBillingActive,
  getWorkspaceEffectivePlan,
} from '../shared/pricing';

describe('isSubscriptionActiveLike', () => {
  it('active counts as active-like', () => {
    expect(isSubscriptionActiveLike('active')).toBe(true);
  });

  it('cancel_at_period_end counts as active-like', () => {
    expect(isSubscriptionActiveLike('cancel_at_period_end')).toBe(true);
  });

  it('past_due counts as active-like', () => {
    expect(isSubscriptionActiveLike('past_due')).toBe(true);
  });

  it('deleted does NOT count as active-like', () => {
    expect(isSubscriptionActiveLike('deleted')).toBe(false);
  });

  it('null/undefined does NOT count as active-like', () => {
    expect(isSubscriptionActiveLike(null)).toBe(false);
    expect(isSubscriptionActiveLike(undefined)).toBe(false);
  });

  it('case-insensitive', () => {
    expect(isSubscriptionActiveLike('ACTIVE')).toBe(true);
    expect(isSubscriptionActiveLike('PAST_DUE')).toBe(true);
  });
});

describe('getPersonalPlanId', () => {
  const recentSignup = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
  const oldSignup = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

  it('returns single for active personal sub', () => {
    expect(getPersonalPlanId({ subscriptionStatus: 'active', subscriptionPlan: 'single' })).toBe('single');
  });

  it('returns single for cancel_at_period_end', () => {
    expect(getPersonalPlanId({ subscriptionStatus: 'cancel_at_period_end', subscriptionPlan: 'single' })).toBe('single');
  });

  it('returns single for past_due', () => {
    expect(getPersonalPlanId({ subscriptionStatus: 'past_due', subscriptionPlan: 'single' })).toBe('single');
  });

  it('returns single during product trial (trialing within window)', () => {
    expect(
      getPersonalPlanId({
        subscriptionStatus: 'trialing',
        subscriptionPlan: 'single',
        createdAt: recentSignup,
      }),
    ).toBe('single');
  });

  it('defaults product trial plan to single when plan is free sentinel', () => {
    expect(
      getPersonalPlanId({
        subscriptionStatus: 'trialing',
        subscriptionPlan: 'catechist_free',
        createdAt: recentSignup,
      }),
    ).toBe('single');
  });

  it('returns catechist_free when product trial window expired', () => {
    expect(
      getPersonalPlanId({
        subscriptionStatus: 'trialing',
        subscriptionPlan: 'single',
        createdAt: oldSignup,
      }),
    ).toBe('catechist_free');
  });

  it('returns catechist_free for deleted status', () => {
    expect(getPersonalPlanId({ subscriptionStatus: 'deleted', subscriptionPlan: 'single' })).toBe('catechist_free');
  });

  it('returns catechist_free for null status', () => {
    expect(getPersonalPlanId({ subscriptionStatus: null, subscriptionPlan: 'single' })).toBe('catechist_free');
  });

  it('returns catechist_free for institutional (unlimited) plan on user', () => {
    expect(getPersonalPlanId({ subscriptionStatus: 'active', subscriptionPlan: 'unlimited' })).toBe('catechist_free');
  });

  it('returns catechist_free for legacy institutional aliases on user', () => {
    expect(getPersonalPlanId({ subscriptionStatus: 'active', subscriptionPlan: 'parish_complete' })).toBe('catechist_free');
    expect(getPersonalPlanId({ subscriptionStatus: 'active', subscriptionPlan: 'diocese' })).toBe('catechist_free');
  });
});

describe('hasPersonalAccess', () => {
  it('true for active single user', () => {
    expect(hasPersonalAccess({ subscriptionStatus: 'active', subscriptionPlan: 'single' })).toBe(true);
  });

  it('false for free user', () => {
    expect(hasPersonalAccess({ subscriptionStatus: null, subscriptionPlan: null })).toBe(false);
  });

  it('false for deleted user', () => {
    expect(hasPersonalAccess({ subscriptionStatus: 'deleted', subscriptionPlan: 'single' })).toBe(false);
  });

  it('false for institutional plan on user', () => {
    expect(hasPersonalAccess({ subscriptionStatus: 'active', subscriptionPlan: 'unlimited' })).toBe(false);
  });
});

describe('isBillingActive', () => {
  it('ACTIVE is active', () => {
    expect(isBillingActive({ plan: 'UNLIMITED', status: 'ACTIVE' })).toBe(true);
  });

  it('PAST_DUE is active (grace period)', () => {
    expect(isBillingActive({ plan: 'UNLIMITED', status: 'PAST_DUE' })).toBe(true);
  });

  it('TRIAL within period is active', () => {
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    expect(isBillingActive({ plan: 'CATECHIST_FREE', status: 'TRIAL', trialEndsAt: future })).toBe(true);
  });

  it('TRIAL expired is NOT active', () => {
    const past = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    expect(isBillingActive({ plan: 'CATECHIST_FREE', status: 'TRIAL', trialEndsAt: past })).toBe(false);
  });

  it('TRIAL without trialEndsAt is NOT active', () => {
    expect(isBillingActive({ plan: 'CATECHIST_FREE', status: 'TRIAL' })).toBe(false);
  });

  it('CANCELED is NOT active', () => {
    expect(isBillingActive({ plan: 'UNLIMITED', status: 'CANCELED' })).toBe(false);
  });

  it('null is NOT active', () => {
    expect(isBillingActive(null)).toBe(false);
  });
});

describe('hasInstitutionalAccess', () => {
  it('true for ACTIVE unlimited', () => {
    expect(hasInstitutionalAccess({ plan: 'UNLIMITED', status: 'ACTIVE' })).toBe(true);
  });

  it('true for legacy PARISH_COMPLETE alias (resolves to unlimited)', () => {
    expect(hasInstitutionalAccess({ plan: 'PARISH_COMPLETE', status: 'ACTIVE' })).toBe(true);
  });

  it('true for legacy DIOCESE alias', () => {
    expect(hasInstitutionalAccess({ plan: 'DIOCESE', status: 'ACTIVE' })).toBe(true);
  });

  it('false for CATECHIST_FREE', () => {
    expect(hasInstitutionalAccess({ plan: 'CATECHIST_FREE', status: 'ACTIVE' })).toBe(false);
  });

  it('true for ACTIVE SINGLE (parish TenantBilling / product trial entitlements)', () => {
    expect(hasInstitutionalAccess({ plan: 'SINGLE', status: 'ACTIVE' })).toBe(true);
  });

  it('true for TRIAL with free sentinel (maps to Single)', () => {
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    expect(
      hasInstitutionalAccess({
        plan: 'CATECHIST_FREE',
        status: 'TRIAL',
        trialEndsAt: future,
      }),
    ).toBe(true);
  });

  it('false for CANCELED', () => {
    expect(hasInstitutionalAccess({ plan: 'UNLIMITED', status: 'CANCELED' })).toBe(false);
  });
});

describe('getInstitutionalPlanId', () => {
  it('returns unlimited', () => {
    expect(getInstitutionalPlanId({ plan: 'UNLIMITED', status: 'ACTIVE' })).toBe('unlimited');
  });

  it('returns single for parish Single entitlements', () => {
    expect(getInstitutionalPlanId({ plan: 'SINGLE', status: 'ACTIVE' })).toBe('single');
  });

  it('returns unlimited for legacy DIOCESE', () => {
    expect(getInstitutionalPlanId({ plan: 'DIOCESE', status: 'ACTIVE' })).toBe('unlimited');
  });

  it('returns null for CATECHIST_FREE when not on trial', () => {
    expect(getInstitutionalPlanId({ plan: 'CATECHIST_FREE', status: 'ACTIVE' })).toBeNull();
  });

  it('returns single for TRIAL free sentinel', () => {
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    expect(
      getInstitutionalPlanId({
        plan: 'CATECHIST_FREE',
        status: 'TRIAL',
        trialEndsAt: future,
      }),
    ).toBe('single');
  });

  it('returns null for CANCELED', () => {
    expect(getInstitutionalPlanId({ plan: 'UNLIMITED', status: 'CANCELED' })).toBeNull();
  });

  it('resolves legacy PARISH alias to unlimited', () => {
    const result = getInstitutionalPlanId({ plan: 'PARISH', status: 'ACTIVE' });
    expect(result).toBe('unlimited');
  });
});

describe('getWorkspaceEffectivePlan', () => {
  it('personal workspace with single sub returns personal', () => {
    const result = getWorkspaceEffectivePlan({
      user: { subscriptionStatus: 'active', subscriptionPlan: 'single' },
      parishType: 'PERSONAL',
    });
    expect(result.plan).toBe('single');
    expect(result.source).toBe('personal');
  });

  it('personal workspace without subscription returns free (blocked)', () => {
    const result = getWorkspaceEffectivePlan({
      user: { subscriptionStatus: null, subscriptionPlan: null },
      parishType: 'PERSONAL',
    });
    expect(result.plan).toBe('catechist_free');
    expect(result.source).toBe('free');
  });

  it('institutional workspace with own unlimited billing returns unlimited', () => {
    const result = getWorkspaceEffectivePlan({
      user: { subscriptionStatus: null, subscriptionPlan: null },
      parishType: 'PARISH',
      billing: { plan: 'UNLIMITED', status: 'ACTIVE' },
    });
    expect(result.plan).toBe('unlimited');
    expect(result.source).toBe('institutional');
  });

  it('institutional workspace with diocese umbrella (unlimited) returns unlimited', () => {
    const result = getWorkspaceEffectivePlan({
      user: { subscriptionStatus: null, subscriptionPlan: null },
      parishType: 'PARISH',
      dioceseBilling: { plan: 'UNLIMITED', status: 'ACTIVE' },
    });
    expect(result.plan).toBe('unlimited');
    expect(result.source).toBe('institutional');
  });

  it('institutional workspace with active trial returns single entitlements', () => {
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const result = getWorkspaceEffectivePlan({
      user: { subscriptionStatus: null, subscriptionPlan: null },
      parishType: 'PARISH',
      billing: { plan: 'CATECHIST_FREE', status: 'TRIAL', trialEndsAt: future },
    });
    expect(result.plan).toBe('single');
    expect(result.source).toBe('trial');
  });

  it('institutional workspace with ACTIVE single billing unlocks pastoral tools', () => {
    const result = getWorkspaceEffectivePlan({
      user: { subscriptionStatus: null, subscriptionPlan: null },
      parishType: 'PARISH',
      billing: { plan: 'SINGLE', status: 'ACTIVE' },
    });
    expect(result.plan).toBe('single');
    expect(result.source).toBe('institutional');
  });

  it('personal product trial returns single with trial source', () => {
    const recentSignup = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
    const result = getWorkspaceEffectivePlan({
      user: {
        subscriptionStatus: 'trialing',
        subscriptionPlan: 'single',
        createdAt: recentSignup,
      },
      parishType: 'PERSONAL',
    });
    expect(result.plan).toBe('single');
    expect(result.source).toBe('trial');
  });

  it('institutional workspace without any billing returns free (blocked)', () => {
    const result = getWorkspaceEffectivePlan({
      user: { subscriptionStatus: null, subscriptionPlan: null },
      parishType: 'PARISH',
    });
    expect(result.plan).toBe('catechist_free');
    expect(result.source).toBe('free');
  });

  it('cancel_at_period_end user has personal access', () => {
    const result = getWorkspaceEffectivePlan({
      user: { subscriptionStatus: 'cancel_at_period_end', subscriptionPlan: 'single' },
      parishType: 'PERSONAL',
    });
    expect(result.plan).toBe('single');
    expect(result.source).toBe('personal');
  });

  it('past_due billing still grants institutional access', () => {
    const result = getWorkspaceEffectivePlan({
      user: null,
      parishType: 'PARISH',
      billing: { plan: 'UNLIMITED', status: 'PAST_DUE' },
    });
    expect(result.plan).toBe('unlimited');
    expect(result.source).toBe('institutional');
  });

  it('expired trial returns free for institutional', () => {
    const past = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const result = getWorkspaceEffectivePlan({
      user: null,
      parishType: 'PARISH',
      billing: { plan: 'CATECHIST_FREE', status: 'TRIAL', trialEndsAt: past },
    });
    expect(result.plan).toBe('catechist_free');
    expect(result.source).toBe('free');
  });
});

// ─── Helpers ─────────────────────────────────────────────────────────────

function mapPlanIdToPaymentPlanId(planId: PlanId): PaymentPlanId {
  const mapping: Record<PlanId, PaymentPlanId> = {
    catechist_free: PaymentPlanId.CatechistFree,
    single: PaymentPlanId.Single,
    unlimited: PaymentPlanId.Unlimited,
  };
  return mapping[planId];
}
