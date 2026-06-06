/**
 * billing-enforcement.test.ts — Verify plan limits enforcement.
 */
import { describe, it, expect } from 'vitest';
import { prisma, PARISH_SAO_JOSE, PARISH_SANTA_MARIA } from './setup';
import { getPlanLimits } from '../shared/planLimits';

describe('Plan Limits Configuration', () => {

  it('CATECHIST_FREE has limits', () => {
    const limits = getPlanLimits('catechist_free');
    expect(limits.maxClasses).toBe(2);
    expect(limits.maxCatechumens).toBe(30);
    expect(limits.maxParishes).toBe(1);
  });

  it('PARISH has no limits', () => {
    const limits = getPlanLimits('parish');
    expect(limits.maxClasses).toBeNull();
    expect(limits.maxCatechumens).toBeNull();
    expect(limits.maxParishes).toBeNull();
  });

  it('CATECHIST_PRO has no limits', () => {
    const limits = getPlanLimits('catechist_pro');
    expect(limits.maxClasses).toBeNull();
  });

  it('DIOCESE has no limits', () => {
    const limits = getPlanLimits('diocese');
    expect(limits.maxClasses).toBeNull();
  });

  it('unknown plan falls back to catechist_free', () => {
    const limits = getPlanLimits('nonexistent');
    expect(limits.maxClasses).toBe(2);
  });
});

describe('Parish Billing Records', () => {

  it('São José has PARISH plan active', async () => {
    const billing = await prisma.tenantBilling.findUnique({
      where: { parishId: PARISH_SAO_JOSE },
    });
    expect(billing).toBeTruthy();
    expect(billing!.plan).toBe('PARISH');
    expect(billing!.status).toBe('ACTIVE');
  });

  it('Santa Maria has CATECHIST_FREE plan', async () => {
    const billing = await prisma.tenantBilling.findUnique({
      where: { parishId: PARISH_SANTA_MARIA },
    });
    expect(billing).toBeTruthy();
    expect(billing!.plan).toBe('CATECHIST_FREE');
  });

});

describe('Class Limits — Santa Maria (free plan)', () => {
  
  it('has exactly 1 class in Santa Maria', async () => {
    const classes = await prisma.catechesisClass.count({
      where: { parishId: PARISH_SANTA_MARIA },
    });
    // Free plan allows max 1 class
    expect(classes).toBe(1);
  });

  it('has fewer catechumens than max limit (20)', async () => {
    const count = await prisma.catechumenProfile.count({
      where: { parishId: PARISH_SANTA_MARIA },
    });
    expect(count).toBeLessThan(20);
  });

});

describe('Class Limits — São José (paid plan)', () => {

  it('has multiple classes (no limit)', async () => {
    const classes = await prisma.catechesisClass.count({
      where: { parishId: PARISH_SAO_JOSE },
    });
    expect(classes).toBeGreaterThanOrEqual(2);
  });

});
