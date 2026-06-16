/**
 * pricingConsistency.test.ts — Guard CI: ensures plan IDs in the
 * single source of truth (pricing.ts) are consistent with all external
 * layers (payment plans, billing enforcement, cascade types).
 *
 * Run in CI to prevent drift.
 */
import { describe, it, expect } from 'vitest';
import {
  PLANS,
  PLAN_IDS,
  PLAN_ALIASES,
  PRICING_VERSION,
  PRICING_EFFECTIVE_FROM,
  getAllPlanIds,
  resolvePlanId,
  INSTITUTIONAL_PLANS as PRICING_INSTITUTIONAL_PLANS,
  getPlanPriceCents,
  type PlanId,
} from '../shared/pricing';
import { PaymentPlanId, paymentPlans } from '../payment/plans';
import { paymentProcessorPlanIds } from '../payment/paymentProcessorPlans';

// ─── Plan ID integrity ───────────────────────────────────────────────────

describe('pricing.ts — Plan ID integrity', () => {
  it('PLAN_IDS has no duplicates', () => {
    const unique = new Set(PLAN_IDS);
    expect(unique.size).toBe(PLAN_IDS.length);
  });

  it('getAllPlanIds() returns same as PLAN_IDS', () => {
    expect(getAllPlanIds()).toEqual(PLAN_IDS);
  });

  it('PRICING_VERSION is 2', () => {
    expect(PRICING_VERSION).toBe(2);
  });

  it('PRICING_EFFECTIVE_FROM is a Date', () => {
    expect(PRICING_EFFECTIVE_FROM).toBeInstanceOf(Date);
  });
});

// ─── Plan consistency with PaymentPlanId enum ────────────────────────────

describe('Plan IDs ↔ PaymentPlanId consistency', () => {
  it('every paid pricing PlanId exists in PaymentPlanId enum', () => {
    for (const planId of PLAN_IDS) {
      if (planId === 'catechist_free') continue;
      // Map pricing PlanId to PaymentPlanId enum value
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

  it('monthly prices > 0 for paid plans', () => {
    for (const planId of PLAN_IDS) {
      if (planId === 'catechist_free') {
        expect(getPlanPriceCents(planId, 'monthly')).toBe(0);
      } else {
        expect(getPlanPriceCents(planId, 'monthly')).toBeGreaterThan(0);
      }
    }
  });

  it('highlight plans exist', () => {
    const highlighted = PLAN_IDS.filter((id) => PLANS[id].highlight);
    expect(highlighted.length).toBeGreaterThanOrEqual(1);
    // catechist_ai and parish_complete should be highlighted
    expect(highlighted).toContain('catechist_ai');
    expect(highlighted).toContain('parish_complete');
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

  it('resolvePlanId handles aliases', () => {
    expect(resolvePlanId('parish')).toBe('parish_complete');
    expect(resolvePlanId('PARISH')).toBe('parish_complete');
  });

  it('resolvePlanId handles active plans', () => {
    expect(resolvePlanId('catechist_free')).toBe('catechist_free');
    expect(resolvePlanId('diocese')).toBe('diocese');
    expect(resolvePlanId('parish_complete')).toBe('parish_complete');
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

// ─── Diocese AI scope ────────────────────────────────────────────────────

describe('Diocese AI scope', () => {
  it('diocese has per_parish scope', () => {
    expect(PLANS.diocese.ai.scope).toBe('per_parish');
  });

  it('diocese monthly credits are 50', () => {
    expect(PLANS.diocese.ai.monthlyCredits).toBe(50);
  });

  it('diocese max parishes is 10', () => {
    expect(PLANS.diocese.limits.maxParishes).toBe(10);
  });

  it('non-diocese plans have user scope', () => {
    for (const planId of PLAN_IDS) {
      if (planId === 'diocese') continue;
      expect(
        PLANS[planId].ai.scope,
        `Plan "${planId}" should have scope "user"`,
      ).toBe('user');
    }
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
  type BillingInfo,
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
    expect(isSubscriptionActiveLike('Cancel_At_Period_End')).toBe(true);
    expect(isSubscriptionActiveLike('PAST_DUE')).toBe(true);
  });
});

describe('getPersonalPlanId', () => {
  it('returns catechist_pro for active personal sub', () => {
    expect(getPersonalPlanId({ subscriptionStatus: 'active', subscriptionPlan: 'catechist_pro' })).toBe('catechist_pro');
  });

  it('returns catechist_pro for cancel_at_period_end', () => {
    expect(getPersonalPlanId({ subscriptionStatus: 'cancel_at_period_end', subscriptionPlan: 'catechist_pro' })).toBe('catechist_pro');
  });

  it('returns catechist_pro for past_due', () => {
    expect(getPersonalPlanId({ subscriptionStatus: 'past_due', subscriptionPlan: 'catechist_pro' })).toBe('catechist_pro');
  });

  it('returns catechist_pro for ACTIVE (uppercase)', () => {
    expect(getPersonalPlanId({ subscriptionStatus: 'ACTIVE', subscriptionPlan: 'catechist_pro' })).toBe('catechist_pro');
  });

  it('returns catechist_free for deleted status', () => {
    expect(getPersonalPlanId({ subscriptionStatus: 'deleted', subscriptionPlan: 'catechist_ai' })).toBe('catechist_free');
  });

  it('returns catechist_free for null status', () => {
    expect(getPersonalPlanId({ subscriptionStatus: null, subscriptionPlan: 'catechist_pro' })).toBe('catechist_free');
  });

  it('returns catechist_free for institutional plan on user', () => {
    // Institutional plans on User.subscriptionPlan do NOT grant personal access
    expect(getPersonalPlanId({ subscriptionStatus: 'active', subscriptionPlan: 'parish_complete' })).toBe('catechist_free');
    expect(getPersonalPlanId({ subscriptionStatus: 'active', subscriptionPlan: 'diocese' })).toBe('catechist_free');
  });

  it('returns catechist_free for legacy parish alias', () => {
    // 'parish' alias should NOT grant personal access (it's institutional)
    expect(getPersonalPlanId({ subscriptionStatus: 'active', subscriptionPlan: 'parish' })).toBe('catechist_free');
  });
});

describe('hasPersonalAccess', () => {
  it('true for active pro user', () => {
    expect(hasPersonalAccess({ subscriptionStatus: 'active', subscriptionPlan: 'catechist_pro' })).toBe(true);
  });

  it('true for cancel_at_period_end pro user', () => {
    expect(hasPersonalAccess({ subscriptionStatus: 'cancel_at_period_end', subscriptionPlan: 'catechist_pro' })).toBe(true);
  });

  it('false for free user', () => {
    expect(hasPersonalAccess({ subscriptionStatus: null, subscriptionPlan: null })).toBe(false);
  });

  it('false for deleted user', () => {
    expect(hasPersonalAccess({ subscriptionStatus: 'deleted', subscriptionPlan: 'catechist_ai' })).toBe(false);
  });

  it('false for institutional plan on user', () => {
    expect(hasPersonalAccess({ subscriptionStatus: 'active', subscriptionPlan: 'parish_complete' })).toBe(false);
  });
});

describe('isBillingActive', () => {
  it('ACTIVE is active', () => {
    expect(isBillingActive({ plan: 'PARISH_COMPLETE', status: 'ACTIVE' })).toBe(true);
  });

  it('PAST_DUE is active (grace period)', () => {
    expect(isBillingActive({ plan: 'PARISH_COMPLETE', status: 'PAST_DUE' })).toBe(true);
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
    expect(isBillingActive({ plan: 'PARISH_COMPLETE', status: 'CANCELED' })).toBe(false);
  });

  it('null is NOT active', () => {
    expect(isBillingActive(null)).toBe(false);
  });
});

describe('hasInstitutionalAccess', () => {
  it('true for ACTIVE parish_complete', () => {
    expect(hasInstitutionalAccess({ plan: 'PARISH_COMPLETE', status: 'ACTIVE' })).toBe(true);
  });

  it('true for PAST_DUE', () => {
    expect(hasInstitutionalAccess({ plan: 'PARISH_ESSENTIAL', status: 'PAST_DUE' })).toBe(true);
  });

  it('false for CATECHIST_FREE', () => {
    expect(hasInstitutionalAccess({ plan: 'CATECHIST_FREE', status: 'ACTIVE' })).toBe(false);
  });

  it('false for CANCELED', () => {
    expect(hasInstitutionalAccess({ plan: 'PARISH_COMPLETE', status: 'CANCELED' })).toBe(false);
  });
});

describe('getInstitutionalPlanId', () => {
  it('returns parish_complete', () => {
    expect(getInstitutionalPlanId({ plan: 'PARISH_COMPLETE', status: 'ACTIVE' })).toBe('parish_complete');
  });

  it('returns diocese', () => {
    expect(getInstitutionalPlanId({ plan: 'DIOCESE', status: 'ACTIVE' })).toBe('diocese');
  });

  it('returns null for CATECHIST_FREE', () => {
    expect(getInstitutionalPlanId({ plan: 'CATECHIST_FREE', status: 'ACTIVE' })).toBeNull();
  });

  it('returns null for CANCELED', () => {
    expect(getInstitutionalPlanId({ plan: 'PARISH_COMPLETE', status: 'CANCELED' })).toBeNull();
  });

  it('resolves legacy PARISH alias', () => {
    const result = getInstitutionalPlanId({ plan: 'PARISH', status: 'ACTIVE' });
    expect(result).toBe('parish_complete');
  });
});

describe('getWorkspaceEffectivePlan', () => {
  it('personal workspace with pro sub returns personal', () => {
    const result = getWorkspaceEffectivePlan({
      user: { subscriptionStatus: 'active', subscriptionPlan: 'catechist_pro' },
      parishType: 'PERSONAL',
    });
    expect(result.plan).toBe('catechist_pro');
    expect(result.source).toBe('personal');
  });

  it('personal workspace without subscription returns free', () => {
    const result = getWorkspaceEffectivePlan({
      user: { subscriptionStatus: null, subscriptionPlan: null },
      parishType: 'PERSONAL',
    });
    expect(result.plan).toBe('catechist_free');
    expect(result.source).toBe('free');
  });

  it('institutional workspace with diocese umbrella returns diocese', () => {
    const result = getWorkspaceEffectivePlan({
      user: { subscriptionStatus: null, subscriptionPlan: null },
      parishType: 'PARISH',
      dioceseBilling: { plan: 'DIOCESE', status: 'ACTIVE' },
    });
    expect(result.plan).toBe('diocese');
    expect(result.source).toBe('diocese_umbrella');
  });

  it('institutional workspace with own billing returns parish plan', () => {
    const result = getWorkspaceEffectivePlan({
      user: { subscriptionStatus: null, subscriptionPlan: null },
      parishType: 'PARISH',
      billing: { plan: 'PARISH_COMPLETE', status: 'ACTIVE' },
    });
    expect(result.plan).toBe('parish_complete');
    expect(result.source).toBe('institutional');
  });

  it('institutional workspace with active trial returns trial source', () => {
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const result = getWorkspaceEffectivePlan({
      user: { subscriptionStatus: null, subscriptionPlan: null },
      parishType: 'PARISH',
      billing: { plan: 'CATECHIST_FREE', status: 'TRIAL', trialEndsAt: future },
    });
    expect(result.plan).toBe('catechist_free');
    expect(result.source).toBe('trial');
  });

  it('institutional workspace without any billing returns free', () => {
    const result = getWorkspaceEffectivePlan({
      user: { subscriptionStatus: null, subscriptionPlan: null },
      parishType: 'PARISH',
    });
    expect(result.plan).toBe('catechist_free');
    expect(result.source).toBe('free');
  });

  it('cancel_at_period_end user has personal access', () => {
    const result = getWorkspaceEffectivePlan({
      user: { subscriptionStatus: 'cancel_at_period_end', subscriptionPlan: 'catechist_ai' },
      parishType: 'PERSONAL',
    });
    expect(result.plan).toBe('catechist_ai');
    expect(result.source).toBe('personal');
  });

  it('past_due billing still grants institutional access', () => {
    const result = getWorkspaceEffectivePlan({
      user: null,
      parishType: 'PARISH',
      billing: { plan: 'PARISH_COMPLETE', status: 'PAST_DUE' },
    });
    expect(result.plan).toBe('parish_complete');
    expect(result.source).toBe('institutional');
  });

  it('parish own billing takes priority over diocese umbrella', () => {
    const result = getWorkspaceEffectivePlan({
      user: null,
      parishType: 'PARISH',
      billing: { plan: 'PARISH_ESSENTIAL', status: 'ACTIVE' },
      dioceseBilling: { plan: 'DIOCESE', status: 'ACTIVE' },
    });
    expect(result.plan).toBe('parish_essential');
    expect(result.source).toBe('institutional');
  });

  it('diocese umbrella when parish has no billing', () => {
    const result = getWorkspaceEffectivePlan({
      user: null,
      parishType: 'PARISH',
      dioceseBilling: { plan: 'DIOCESE', status: 'ACTIVE' },
    });
    expect(result.plan).toBe('diocese');
    expect(result.source).toBe('diocese_umbrella');
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

  it('past_due user retains personal access', () => {
    const result = getWorkspaceEffectivePlan({
      user: { subscriptionStatus: 'past_due', subscriptionPlan: 'catechist_pro' },
      parishType: 'PERSONAL',
    });
    expect(result.plan).toBe('catechist_pro');
    expect(result.source).toBe('personal');
  });

  it('cancel_at_period_end institutional billing still active', () => {
    // TenantBilling doesn't have cancel_at_period_end — this is a User concept.
    // But if billing is CANCELED, it should not grant access.
    const result = getWorkspaceEffectivePlan({
      user: null,
      parishType: 'PARISH',
      billing: { plan: 'PARISH_COMPLETE', status: 'CANCELED' },
    });
    expect(result.plan).toBe('catechist_free');
    expect(result.source).toBe('free');
  });

  it('workspace effective plan handles undefined billing gracefully', () => {
    const result = getWorkspaceEffectivePlan({
      user: null,
      parishType: 'PARISH',
      billing: undefined,
      dioceseBilling: undefined,
    });
    expect(result.plan).toBe('catechist_free');
    expect(result.source).toBe('free');
  });

  it('institutional plan on user does NOT grant institutional access via workspace helper', () => {
    const result = getWorkspaceEffectivePlan({
      user: { subscriptionStatus: 'active', subscriptionPlan: 'parish_complete' },
      parishType: 'PARISH',
    });
    // The workspace helper doesn't check the user's plan for institutional; it checks billing.
    // The owner umbrella is handled by billingEnforcement, not this pure function.
    expect(result.plan).toBe('catechist_free');
    expect(result.source).toBe('free');
  });
});

// ─── Helpers ─────────────────────────────────────────────────────────────

function mapPlanIdToPaymentPlanId(planId: PlanId): PaymentPlanId {
  const mapping: Record<PlanId, PaymentPlanId> = {
    catechist_free: PaymentPlanId.CatechistFree,
    catechist_pro: PaymentPlanId.CatechistPro,
    catechist_ai: PaymentPlanId.CatechistAi,
    parish_essential: PaymentPlanId.ParishEssential,
    parish_complete: PaymentPlanId.ParishComplete,
    diocese: PaymentPlanId.Diocese,
  };
  return mapping[planId];
}
