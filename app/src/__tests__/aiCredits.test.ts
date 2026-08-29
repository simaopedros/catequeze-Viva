/**
 * Unit tests for AI credit constants and plan limits (simplified 2-plan structure).
 */
import { describe, it, expect } from 'vitest';
import { AI_CREDITS, planHasAiAccess, getMonthlyAllowance, getDailyLimit } from '../shared/aiCredits';
import { PLAN_LIMITS, getPlanLimits, planName, isBillingActive, getEffectiveBillingPlan } from '../shared/planLimits';

describe('AI Credits (simplified plans)', () => {
  describe('planHasAiAccess', () => {
    it('returns false for all plans during launch phase (AI disabled)', () => {
      // During launch phase, AI is disabled for all plans
      expect(planHasAiAccess('single')).toBe(false);
      expect(planHasAiAccess('unlimited')).toBe(false);
      expect(planHasAiAccess('catechist_pro')).toBe(false);
      expect(planHasAiAccess('catechist_ai')).toBe(false);
      expect(planHasAiAccess('parish_essential')).toBe(false);
      expect(planHasAiAccess('parish_complete')).toBe(false);
      expect(planHasAiAccess('diocese')).toBe(false);
      expect(planHasAiAccess('PARISH')).toBe(false);
    });

    it('returns false for the free sentinel and empty values', () => {
      expect(planHasAiAccess('catechist_free')).toBe(false);
      expect(planHasAiAccess(null)).toBe(false);
      expect(planHasAiAccess(undefined)).toBe(false);
    });
  });

  describe('getMonthlyAllowance', () => {
    it('returns 0 for all plans during launch phase (AI disabled)', () => {
      // During launch phase, AI credits are set to 0 for all plans
      expect(getMonthlyAllowance('single')).toBe(0);
      expect(getMonthlyAllowance('unlimited')).toBe(0);
    });

    it('resolves legacy aliases to 0 (AI disabled)', () => {
      expect(getMonthlyAllowance('catechist_pro')).toBe(0);
      expect(getMonthlyAllowance('catechist_ai')).toBe(0);
      expect(getMonthlyAllowance('parish_essential')).toBe(0);
      expect(getMonthlyAllowance('parish_complete')).toBe(0);
      expect(getMonthlyAllowance('diocese')).toBe(0);
    });

    it('returns 0 for unknown/null/sentinel plans', () => {
      expect(getMonthlyAllowance(null)).toBe(0);
      expect(getMonthlyAllowance('unknown')).toBe(0);
      expect(getMonthlyAllowance('catechist_free')).toBe(0);
    });
  });

  describe('getDailyLimit', () => {
    it('returns 0 for all plans during launch phase (AI disabled)', () => {
      // During launch phase, daily limits are set to 0
      expect(getDailyLimit('single')).toBe(0);
      expect(getDailyLimit('unlimited')).toBe(0);
    });

    it('resolves legacy aliases to 0 (AI disabled)', () => {
      expect(getDailyLimit('catechist_pro')).toBe(0);
      expect(getDailyLimit('parish_complete')).toBe(0);
      expect(getDailyLimit('diocese')).toBe(0);
    });

    it('returns 0 for the sentinel', () => {
      expect(getDailyLimit('catechist_free')).toBe(0);
    });
  });

  describe('AI_CREDITS constants', () => {
    it('defines correct credit costs', () => {
      expect(AI_CREDITS.COST.generateMeeting).toBe(1);
      expect(AI_CREDITS.COST.generateAnnualPlanning).toBe(3);
      expect(AI_CREDITS.COST.generateActivity).toBe(1);
      expect(AI_CREDITS.COST.chatMessage).toBe(0);
    });

    it('has FREE_TRIAL_CREDITS set to 0 (no free trial)', () => {
      expect(AI_CREDITS.FREE_TRIAL_CREDITS).toBe(0);
    });
  });
});

describe('Plan Limits (simplified plans)', () => {
  describe('getPlanLimits', () => {
    it('returns zero limits for the catechist_free sentinel (blocked)', () => {
      const limits = getPlanLimits('catechist_free');
      expect(limits.maxClasses).toBe(0);
      expect(limits.maxCatechumens).toBe(0);
      expect(limits.maxParishes).toBe(0);
      expect(limits.maxCatechists).toBe(0);
    });

    it('returns capped limits for single', () => {
      const limits = getPlanLimits('single');
      expect(limits.maxClasses).toBe(3);
      expect(limits.maxCatechumens).toBe(150);
      expect(limits.maxCatechists).toBe(1);
      expect(limits.maxParishes).toBe(1);
    });

    it('returns unlimited limits for unlimited', () => {
      const limits = getPlanLimits('unlimited');
      expect(limits.maxClasses).toBeNull();
      expect(limits.maxCatechumens).toBeNull();
      expect(limits.maxCatechists).toBeNull();
      expect(limits.maxParishes).toBeNull();
    });

    it('resolves legacy aliases', () => {
      // pro/ai/essential → single limits
      expect(getPlanLimits('catechist_pro').maxClasses).toBe(3);
      expect(getPlanLimits('parish_essential').maxCatechumens).toBe(150);
      // parish/complete/diocese → unlimited limits
      expect(getPlanLimits('parish_complete').maxClasses).toBeNull();
      expect(getPlanLimits('diocese').maxParishes).toBeNull();
      expect(getPlanLimits('parish').maxCatechumens).toBeNull();
    });

    it('falls back to sentinel (zero) for unknown plans', () => {
      const limits = getPlanLimits(null);
      expect(limits.maxClasses).toBe(0);
    });
  });

  describe('isBillingActive', () => {
    it('returns true for ACTIVE status', () => {
      expect(isBillingActive({ plan: 'unlimited', status: 'ACTIVE' })).toBe(true);
    });

    it('returns true for TRIAL with future end date', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);
      expect(isBillingActive({ plan: 'unlimited', status: 'TRIAL', trialEndsAt: futureDate.toISOString() })).toBe(true);
    });

    it('returns false for expired TRIAL', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);
      expect(isBillingActive({ plan: 'unlimited', status: 'TRIAL', trialEndsAt: pastDate.toISOString() })).toBe(false);
    });

    it('returns false for null billing', () => {
      expect(isBillingActive(null)).toBe(false);
    });
  });

  describe('getEffectiveBillingPlan', () => {
    it('falls back to free when billing is null', () => {
      expect(getEffectiveBillingPlan(null)).toBe('CATECHIST_FREE');
    });

    it('falls back to free for CANCELED', () => {
      expect(getEffectiveBillingPlan({ plan: 'UNLIMITED', status: 'CANCELED', trialEndsAt: null })).toBe('CATECHIST_FREE');
    });

    it('normalises legacy plan values to canonical', () => {
      expect(getEffectiveBillingPlan({ plan: 'PARISH_COMPLETE', status: 'ACTIVE' })).toBe('UNLIMITED');
      expect(getEffectiveBillingPlan({ plan: 'DIOCESE', status: 'ACTIVE' })).toBe('UNLIMITED');
    });
  });

  describe('planName', () => {
    it('returns display names for current plans', () => {
      expect(planName('single')).toBe('Plano Catequista');
      expect(planName('unlimited')).toBe('Plano Ilimitado');
      expect(planName('catechist_free')).toBe('Sem assinatura');
    });

    it('resolves legacy aliases to their canonical plan name', () => {
      expect(planName('catechist_pro')).toBe('Plano Catequista');
      expect(planName('parish_complete')).toBe('Plano Ilimitado');
      expect(planName('diocese')).toBe('Plano Ilimitado');
      expect(planName('parish')).toBe('Plano Ilimitado');
    });
  });
});
