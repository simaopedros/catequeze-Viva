/**
 * Inviter role resolution for family-portal invites on all pastoral plans.
 */
import { describe, it, expect } from 'vitest';
import {
  pickBestInviterRole,
  ALLOWED_INVITER_ROLES,
} from '../shared/inviterRoles';
import {
  getInstitutionalPlanId,
  hasInstitutionalAccess,
  getWorkspaceEffectivePlan,
} from '../shared/pricing';

describe('pickBestInviterRole', () => {
  it('prefers LEAD_CATECHIST over GUARDIAN when both memberships exist', () => {
    expect(pickBestInviterRole(['GUARDIAN', 'LEAD_CATECHIST'])).toBe(
      'LEAD_CATECHIST',
    );
  });

  it('prefers PARISH_COORDINATOR over catechist and family roles', () => {
    expect(
      pickBestInviterRole([
        'CATECHUMEN',
        'ASSISTANT_CATECHIST',
        'PARISH_COORDINATOR',
      ]),
    ).toBe('PARISH_COORDINATOR');
  });

  it('returns PERSONAL_OWNER for personal workspace owners', () => {
    expect(pickBestInviterRole(['PERSONAL_OWNER'])).toBe('PERSONAL_OWNER');
  });

  it('returns null for pure family roles (cannot invite as staff)', () => {
    expect(pickBestInviterRole(['GUARDIAN', 'CATECHUMEN'])).toBeNull();
  });

  it('lists all roles that may invite family portal members', () => {
    expect(ALLOWED_INVITER_ROLES).toContain('LEAD_CATECHIST');
    expect(ALLOWED_INVITER_ROLES).toContain('PERSONAL_OWNER');
    expect(ALLOWED_INVITER_ROLES).toContain('PARISH_COORDINATOR');
  });
});

describe('family invites plan access (all accounts, not only unlimited)', () => {
  it('Single TenantBilling grants institutional workspace access', () => {
    expect(hasInstitutionalAccess({ plan: 'SINGLE', status: 'ACTIVE' })).toBe(
      true,
    );
    expect(getInstitutionalPlanId({ plan: 'SINGLE', status: 'ACTIVE' })).toBe(
      'single',
    );
  });

  it('Unlimited TenantBilling still grants access', () => {
    expect(
      hasInstitutionalAccess({ plan: 'UNLIMITED', status: 'ACTIVE' }),
    ).toBe(true);
  });

  it('product trial on parish grants single entitlements for pastoral tools', () => {
    const future = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const plan = getWorkspaceEffectivePlan({
      user: null,
      parishType: 'PARISH',
      billing: {
        plan: 'SINGLE',
        status: 'TRIAL',
        trialEndsAt: future,
      },
    });
    expect(plan.plan).toBe('single');
    expect(plan.source).toBe('trial');
  });

  it('personal Single workspace is not free', () => {
    const plan = getWorkspaceEffectivePlan({
      user: { subscriptionStatus: 'active', subscriptionPlan: 'single' },
      parishType: 'PERSONAL',
    });
    expect(plan.plan).toBe('single');
    expect(plan.source).toBe('personal');
  });
});
