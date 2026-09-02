import { describe, expect, it } from 'vitest';
import {
  getPlanLimits,
  getWorkspaceEffectivePlan,
  resolvePlanId,
  resolvePlanIdOrFree,
  isOnProductTrial,
  DEFAULT_PLANS_BY_SLUG,
  LAUNCH_CATEQUISTA_ONLY,
} from '../shared/pricing';
import { catalogReconcileHasBlockers, type CatalogReconcileReport } from '../server/scripts/reconcile-billing';

describe('compatibility regression', () => {
  it('resolves historical User.subscriptionPlan values', () => {
    expect(resolvePlanId('catechist_pro')).toBe('single');
    expect(resolvePlanId('PARISH_COMPLETE')).toBe('unlimited');
    expect(resolvePlanId('single')).toBe('single');
    expect(resolvePlanId('unlimited')).toBe('unlimited');
    expect(resolvePlanId('catechist_free')).toBe('catechist_free');
    expect(resolvePlanIdOrFree('trialing')).toBe('catechist_free');
  });

  it('preserves plan limits for historical aliases', () => {
    expect(getPlanLimits('catechist_pro').maxClasses).toBe(3);
    expect(getPlanLimits('parish_complete').maxClasses).toBeNull();
    expect(getPlanLimits('single').maxCatechumens).toBe(150);
    expect(getPlanLimits('unlimited').maxParishes).toBeNull();
  });

  it('product trial still grants single', () => {
    const createdAt = new Date();
    expect(
      isOnProductTrial({ subscriptionStatus: 'trialing', subscriptionPlan: 'single', createdAt }),
    ).toBe(true);
    const workspace = getWorkspaceEffectivePlan({
      user: { subscriptionStatus: 'trialing', subscriptionPlan: 'single', createdAt },
      parishType: 'PERSONAL',
    });
    expect(workspace.plan).toBe('single');
    expect(workspace.source).toBe('trial');
  });

  it('static catalog matches launch flags', () => {
    expect(LAUNCH_CATEQUISTA_ONLY).toBe(true);
    expect(DEFAULT_PLANS_BY_SLUG.unlimited.isPublic).toBe(false);
    expect(DEFAULT_PLANS_BY_SLUG.single.prices.find((p) => p.interval === 'monthly')?.unitAmountCents).toBe(990);
  });

  it('catalog reconcile blockers helper', () => {
    const clean: CatalogReconcileReport = { divergences: [], unresolvedUsers: [], unresolvedParishes: [] };
    expect(catalogReconcileHasBlockers(clean)).toBe(false);
    expect(catalogReconcileHasBlockers({ ...clean, divergences: ['x'] })).toBe(true);
  });

  it('parses --catalog CLI mode', async () => {
    const { parseReconcileCliArgs } = await import('../server/scripts/reconcile-billing');
    expect(parseReconcileCliArgs(['--catalog']).catalog).toBe(true);
    expect(parseReconcileCliArgs(['--apply']).apply).toBe(true);
    expect(parseReconcileCliArgs([]).catalog).toBe(false);
  });
});
