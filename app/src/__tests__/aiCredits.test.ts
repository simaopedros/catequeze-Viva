/**
 * Unit tests for AI credit constants and plan limits (pricing v2).
 */
import { describe, it, expect } from 'vitest';
import { AI_CREDITS, planHasAiAccess, getMonthlyAllowance, getDailyLimit } from '../shared/aiCredits';
import { PLAN_LIMITS, getPlanLimits, planName, isBillingActive, getEffectiveBillingPlan } from '../shared/planLimits';

describe('AI Credits (v2)', () => {
  describe('planHasAiAccess', () => {
    it('returns true for AI plans', () => {
      expect(planHasAiAccess('catechist_pro')).toBe(true);
      expect(planHasAiAccess('catechist_ai')).toBe(true);
      expect(planHasAiAccess('PARISH')).toBe(true);
      expect(planHasAiAccess('parish_essential')).toBe(true);
      expect(planHasAiAccess('parish_complete')).toBe(true);
      expect(planHasAiAccess('DIOCESE')).toBe(true);
    });

    it('returns true for free plan (10 initial credits)', () => {
      expect(planHasAiAccess('catechist_free')).toBe(true); // v2: 10 initial credits
      expect(planHasAiAccess(null)).toBe(false);
      expect(planHasAiAccess(undefined)).toBe(false);
    });
  });

  describe('getMonthlyAllowance', () => {
    it('returns correct allowances (v2)', () => {
      expect(getMonthlyAllowance('catechist_pro')).toBe(5);   // v2: 5/mo
      expect(getMonthlyAllowance('catechist_ai')).toBe(20);    // v2: 20/mo
      expect(getMonthlyAllowance('parish_essential')).toBe(30); // v2: 30/mo
      expect(getMonthlyAllowance('parish_complete')).toBe(50);  // v2: 50/mo
      expect(getMonthlyAllowance('diocese')).toBe(50);          // per parish
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
      expect(getDailyLimit('parish_essential')).toBe(20);
      expect(getDailyLimit('parish_complete')).toBe(20);
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

describe('Plan Limits (v2)', () => {
  describe('getPlanLimits', () => {
    it('returns free plan limits', () => {
      const limits = getPlanLimits('catechist_free');
      expect(limits.maxClasses).toBe(1);
      expect(limits.maxCatechumens).toBe(15);
      expect(limits.maxParishes).toBe(1);
      expect(limits.maxCatechists).toBe(1);
    });

    it('returns limited for catechist_pro, unlimited for catechist_ai', () => {
      const proLimits = getPlanLimits('catechist_pro');
      expect(proLimits.maxClasses).toBe(3);
      expect(proLimits.maxCatechumens).toBe(150);

      const aiLimits = getPlanLimits('catechist_ai');
      expect(aiLimits.maxClasses).toBeNull();
      expect(aiLimits.maxCatechumens).toBeNull();
    });

    it('returns limits for parish_essential', () => {
      const limits = getPlanLimits('parish_essential');
      expect(limits.maxCatechumens).toBe(200);
      expect(limits.maxCatechists).toBe(5);
      expect(limits.maxParishes).toBe(1);
    });

    it('returns unlimited for parish_complete', () => {
      const limits = getPlanLimits('parish_complete');
      expect(limits.maxClasses).toBeNull();
      expect(limits.maxCatechumens).toBeNull();
      expect(limits.maxCatechists).toBeNull();
    });

    it('returns diocese limits (10 parishes)', () => {
      const limits = getPlanLimits('diocese');
      expect(limits.maxParishes).toBe(10);
    });

    it('resolves legacy "parish" to parish_complete', () => {
      const limits = getPlanLimits('parish');
      expect(limits.maxCatechumens).toBeNull(); // complete = unlimited
    });

    it('falls back to free for unknown plans', () => {
      const limits = getPlanLimits(null);
      expect(limits.maxClasses).toBe(1);
    });
  });

  describe('isBillingActive', () => {
    it('returns true for ACTIVE status', () => {
      expect(isBillingActive({ plan: 'parish_complete', status: 'ACTIVE' })).toBe(true);
    });

    it('returns true for TRIAL with future end date', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);
      expect(isBillingActive({ plan: 'parish_essential', status: 'TRIAL', trialEndsAt: futureDate.toISOString() })).toBe(true);
    });

    it('returns false for expired TRIAL', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);
      expect(isBillingActive({ plan: 'parish_essential', status: 'TRIAL', trialEndsAt: pastDate.toISOString() })).toBe(false);
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
      expect(getEffectiveBillingPlan({ plan: 'PARISH_COMPLETE', status: 'CANCELED', trialEndsAt: null })).toBe('CATECHIST_FREE');
    });
  });

  describe('planName', () => {
    it('returns display names (v2)', () => {
      expect(planName('catechist_free')).toBe('Catequista Grátis');
      expect(planName('catechist_pro')).toBe('Catequista Pro');
      expect(planName('catechist_ai')).toBe('Catequista IA');
      expect(planName('parish_essential')).toBe('Paróquia Essencial');
      expect(planName('parish_complete')).toBe('Paróquia Completa');
      expect(planName('diocese')).toBe('Diocese');
      expect(planName('parish')).toBe('Paróquia Completa'); // legacy alias
    });
  });
});
