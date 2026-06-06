/**
 * Unit tests for shared AI credit constants and plan limits.
 */
import { describe, it, expect } from 'vitest';
import { AI_CREDITS, planHasAiAccess, getMonthlyAllowance, getDailyLimit } from '../shared/aiCredits';
import { PLAN_LIMITS, getPlanLimits, planName, isBillingActive, getEffectiveBillingPlan } from '../shared/planLimits';

describe('AI Credits', () => {
  describe('planHasAiAccess', () => {
    it('returns true for AI plans', () => {
      expect(planHasAiAccess('catechist_pro')).toBe(true);
      expect(planHasAiAccess('catechist_ai')).toBe(true);
      expect(planHasAiAccess('PARISH')).toBe(true);
      expect(planHasAiAccess('DIOCESE')).toBe(true);
    });

    it('returns false for free plan', () => {
      expect(planHasAiAccess('catechist_free')).toBe(false);
      expect(planHasAiAccess(null)).toBe(false);
      expect(planHasAiAccess(undefined)).toBe(false);
    });
  });

  describe('getMonthlyAllowance', () => {
    it('returns correct allowances', () => {
      expect(getMonthlyAllowance('catechist_pro')).toBe(2);
      expect(getMonthlyAllowance('catechist_ai')).toBe(15);
      expect(getMonthlyAllowance('parish')).toBe(50);
      expect(getMonthlyAllowance('diocese')).toBe(50); // upgraded from 30
    });

    it('returns 0 for unknown/null plans', () => {
      expect(getMonthlyAllowance(null)).toBe(0);
      expect(getMonthlyAllowance('unknown')).toBe(0);
    });
  });

  describe('getDailyLimit', () => {
    it('returns correct daily limits', () => {
      expect(getDailyLimit('catechist_free')).toBe(3);
      expect(getDailyLimit('catechist_pro')).toBe(2);
      expect(getDailyLimit('catechist_ai')).toBe(10);
      expect(getDailyLimit('parish')).toBe(20);
      expect(getDailyLimit('diocese')).toBe(20);
    });
  });

  describe('AI_CREDITS constants', () => {
    it('defines correct credit costs', () => {
      expect(AI_CREDITS.COST.generateMeeting).toBe(1);
      expect(AI_CREDITS.COST.generateAnnualPlanning).toBe(3);
      expect(AI_CREDITS.COST.generateActivity).toBe(1);
      expect(AI_CREDITS.COST.chatMessage).toBe(0);
    });

    it('has FREE_TRIAL_CREDITS set to 3', () => {
      expect(AI_CREDITS.FREE_TRIAL_CREDITS).toBe(3);
    });
  });
});

describe('Plan Limits', () => {
  describe('getPlanLimits', () => {
    it('returns free plan limits', () => {
      const limits = getPlanLimits('catechist_free');
      expect(limits.maxClasses).toBe(2);
      expect(limits.maxCatechumens).toBe(30);
      expect(limits.maxParishes).toBe(1);
    });

    it('returns unlimited for paid plans', () => {
      for (const plan of ['catechist_pro', 'catechist_ai', 'parish', 'diocese']) {
        const limits = getPlanLimits(plan);
        expect(limits.maxClasses).toBeNull();
        expect(limits.maxCatechumens).toBeNull();
      }
    });

    it('falls back to free for unknown plans', () => {
      const limits = getPlanLimits(null);
      expect(limits.maxClasses).toBe(2);
    });
  });

  describe('isBillingActive', () => {
    it('returns true for ACTIVE status', () => {
      expect(isBillingActive({ plan: 'parish', status: 'ACTIVE' })).toBe(true);
    });

    it('returns true for TRIAL with future end date', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);
      expect(isBillingActive({ plan: 'parish', status: 'TRIAL', trialEndsAt: futureDate.toISOString() })).toBe(true);
    });

    it('returns false for expired TRIAL', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);
      expect(isBillingActive({ plan: 'parish', status: 'TRIAL', trialEndsAt: pastDate.toISOString() })).toBe(false);
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
      expect(getEffectiveBillingPlan({ plan: 'PARISH', status: 'CANCELED', trialEndsAt: null })).toBe('CATECHIST_FREE');
    });
  });

  describe('planName', () => {
    it('returns display names', () => {
      expect(planName('catechist_free')).toBe('Catequista Grátis');
      expect(planName('catechist_pro')).toBe('Catequista Pro');
      expect(planName('catechist_ai')).toBe('Catequista IA');
      expect(planName('parish')).toBe('Paróquia');
      expect(planName('diocese')).toBe('Diocese');
    });
  });
});
