/**
 * billing-enforcement.test.ts — Verify plan limits enforcement (v2).
 */
import { describe, it, expect } from 'vitest';
import { prisma, PARISH_SAO_JOSE, PARISH_SANTA_MARIA } from './setup';
import { getPlanLimits } from '../shared/planLimits';

describe('Plan Limits Configuration (v2)', () => {

  it('CATECHIST_FREE has limits', () => {
    const limits = getPlanLimits('catechist_free');
    expect(limits.maxClasses).toBe(1);
    expect(limits.maxCatechumens).toBe(15);
    expect(limits.maxParishes).toBe(1);
    expect(limits.maxCatechists).toBe(1);
  });

  it('PARISH_COMPLETE has no limits (except maxParishes=1 per license)', () => {
    const limits = getPlanLimits('parish_complete');
    expect(limits.maxClasses).toBeNull();
    expect(limits.maxCatechumens).toBeNull();
    expect(limits.maxParishes).toBe(1); // one parish per license
  });

  it('PARISH_ESSENTIAL has capped limits', () => {
    const limits = getPlanLimits('parish_essential');
    expect(limits.maxCatechumens).toBe(200);
    expect(limits.maxCatechists).toBe(5);
    expect(limits.maxParishes).toBe(1);
  });

  it('CATECHIST_PRO has capped limits (3 classes, 150 catechumens)', () => {
    const limits = getPlanLimits('catechist_pro');
    expect(limits.maxClasses).toBe(3);
    expect(limits.maxCatechumens).toBe(150);
  });

  it('DIOCESE has maxParishes=10', () => {
    const limits = getPlanLimits('diocese');
    expect(limits.maxClasses).toBeNull();
    expect(limits.maxParishes).toBe(10);
  });

  it('legacy "parish" resolves to parish_complete (unlimited)', () => {
    const limits = getPlanLimits('parish');
    expect(limits.maxCatechumens).toBeNull();
  });

  it('unknown plan falls back to catechist_free', () => {
    const limits = getPlanLimits('nonexistent');
    expect(limits.maxClasses).toBe(1);
  });
});

describe('Parish Billing Records', () => {

  it('São José has PARISH plan active (legacy)', async () => {
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
    expect(classes).toBe(1);
  });

  it('has fewer catechumens than max limit (15)', async () => {
    const count = await prisma.catechumenProfile.count({
      where: { parishId: PARISH_SANTA_MARIA },
    });
    expect(count).toBeLessThan(15);
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
