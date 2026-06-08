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
