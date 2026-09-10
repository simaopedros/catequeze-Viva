/**
 * billing-enforcement.test.ts — Verify plan limits enforcement (simplified plans).
 */
import { describe, it, expect } from 'vitest';
import { prisma, PARISH_SAO_JOSE, PARISH_SANTA_MARIA } from './setup';
import { getPlanLimits } from '../shared/planLimits';

describe('Plan Limits Configuration (simplified plans)', () => {

  it('CATECHIST_FREE sentinel has zero limits (blocked)', () => {
    const limits = getPlanLimits('catechist_free');
    expect(limits.maxClasses).toBe(0);
    expect(limits.maxCatechumens).toBe(0);
    expect(limits.maxParishes).toBe(0);
    expect(limits.maxCatechists).toBe(0);
    expect(limits.maxGroups).toBe(0);
    expect(limits.canCreateGroups).toBe(false);
    expect(limits.canAccessCatechesis).toBe(false);
  });

  it('SINGLE has capped limits (3 classes, 150 catechumens total, 1 parish)', () => {
    const limits = getPlanLimits('single');
    expect(limits.maxClasses).toBe(3);
    expect(limits.maxCatechumens).toBe(150);
    expect(limits.maxParishes).toBe(1);
    expect(limits.maxCatechists).toBe(1);
    expect(limits.maxGroups).toBe(3);
    expect(limits.canCreateGroups).toBe(true);
    expect(limits.canAccessCatechesis).toBe(true);
  });

  it('UNLIMITED has null (unlimited) limits', () => {
    const limits = getPlanLimits('unlimited');
    expect(limits.maxClasses).toBeNull();
    expect(limits.maxCatechumens).toBeNull();
    expect(limits.maxCatechists).toBeNull();
    expect(limits.maxParishes).toBeNull();
    expect(limits.maxGroups).toBeNull();
    expect(limits.canCreateGroups).toBe(true);
    expect(limits.canAccessCatechesis).toBe(true);
  });

  it('legacy aliases resolve to their canonical plan limits', () => {
    // pro/ai/essential → single
    expect(getPlanLimits('catechist_pro').maxClasses).toBe(3);
    expect(getPlanLimits('parish_essential').maxCatechumens).toBe(150);
    // parish/complete/diocese → unlimited
    expect(getPlanLimits('parish_complete').maxClasses).toBeNull();
    expect(getPlanLimits('diocese').maxParishes).toBeNull();
    expect(getPlanLimits('parish').maxCatechumens).toBeNull();
  });

  it('unknown plan falls back to catechist_free (sentinel)', () => {
    const limits = getPlanLimits('nonexistent');
    expect(limits.maxClasses).toBe(0);
  });
});

const hasDb = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDb)('Parish Billing Records', () => {

  it('São José has an active institutional billing record', async () => {
    const billing = await prisma.tenantBilling.findUnique({
      where: { parishId: PARISH_SAO_JOSE },
    });
    expect(billing).toBeTruthy();
    expect(billing!.status).toBe('ACTIVE');
  });

  it('Santa Maria has catechist_free plan', async () => {
    const billing = await prisma.tenantBilling.findUnique({
      where: { parishId: PARISH_SANTA_MARIA },
    });
    expect(billing).toBeTruthy();
    expect(billing!.plan).toBe('catechist_free');
  });

});

describe.skipIf(!hasDb)('Class Limits — São José (paid plan)', () => {

  it('has multiple classes (no limit)', async () => {
    const classes = await prisma.catechesisClass.count({
      where: { parishId: PARISH_SAO_JOSE },
    });
    expect(classes).toBeGreaterThanOrEqual(2);
  });

});

