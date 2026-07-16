/**
 * Deterministic unit tests for the unified team invite permission matrix.
 */
import { describe, it, expect } from 'vitest';
import {
  getAssignableRoles,
  canViewTeamArea,
  canInviteTeamRoles,
  normalizeInviteEmail,
  resolveClassAssignmentRole,
  ROLE_ASSIGNMENT_HIERARCHY,
} from '../shared/teamInvitePolicy';
import { isFamilyPortalRole, familyPortalUrl, staffPortalUrl } from '../shared/portal';

describe('getAssignableRoles matrix', () => {
  it('coordinator keeps full hierarchy below them', () => {
    const roles = getAssignableRoles('PARISH_COORDINATOR', false);
    expect(roles).toContain('LEAD_CATECHIST');
    expect(roles).toContain('ASSISTANT_CATECHIST');
    expect(roles).toContain('GUARDIAN');
    expect(roles).not.toContain('PARISH_COORDINATOR');
  });

  it('lead catechist may invite catechist, assistant, guardian, catechumen', () => {
    const roles = getAssignableRoles('LEAD_CATECHIST', false);
    expect(roles).toEqual([
      'LEAD_CATECHIST',
      'ASSISTANT_CATECHIST',
      'GUARDIAN',
      'CATECHUMEN',
    ]);
  });

  it('assistant cannot invite team roles', () => {
    const roles = getAssignableRoles('ASSISTANT_CATECHIST', false);
    expect(roles).toEqual(['GUARDIAN', 'CATECHUMEN']);
    expect(canInviteTeamRoles('ASSISTANT_CATECHIST')).toBe(false);
  });

  it('personal workspace owner may invite catechist and assistant (trial/single)', () => {
    const roles = getAssignableRoles('PERSONAL_OWNER', false);
    expect(roles).toContain('LEAD_CATECHIST');
    expect(roles).toContain('ASSISTANT_CATECHIST');
    expect(roles).toContain('GUARDIAN');
    expect(canInviteTeamRoles('PERSONAL_OWNER')).toBe(true);
  });

  it('user without inviter role has empty assignable list', () => {
    expect(getAssignableRoles('GUARDIAN', false)).toEqual([]);
    expect(getAssignableRoles(null, false)).toEqual([]);
  });

  it('platform admin uses SUPER_ADMIN assignable set', () => {
    const roles = getAssignableRoles('GUARDIAN', true);
    expect(roles).toEqual(ROLE_ASSIGNMENT_HIERARCHY.SUPER_ADMIN);
  });
});

describe('canViewTeamArea', () => {
  it('allows coordinators and catechists', () => {
    expect(canViewTeamArea('PARISH_COORDINATOR', false)).toBe(true);
    expect(canViewTeamArea('LEAD_CATECHIST', false)).toBe(true);
    expect(canViewTeamArea('ASSISTANT_CATECHIST', false)).toBe(true);
  });

  it('denies family roles without admin', () => {
    expect(canViewTeamArea('GUARDIAN', false)).toBe(false);
    expect(canViewTeamArea('CATECHUMEN', false)).toBe(false);
  });
});

describe('normalizeInviteEmail', () => {
  it('trims and lowercases', () => {
    expect(normalizeInviteEmail('  Foo.Bar@Example.COM ')).toBe(
      'foo.bar@example.com',
    );
  });
});

describe('resolveClassAssignmentRole', () => {
  it('lead catechist joins class as ASSISTANT collaborator', () => {
    expect(
      resolveClassAssignmentRole({ parishRole: 'LEAD_CATECHIST' }),
    ).toBe('ASSISTANT');
  });

  it('assistant always gets ASSISTANT assignment', () => {
    expect(
      resolveClassAssignmentRole({
        parishRole: 'ASSISTANT_CATECHIST',
        explicit: 'LEAD',
      }),
    ).toBe('ASSISTANT');
  });

  it('never promotes invited LEAD_CATECHIST to class LEAD via invite', () => {
    expect(
      resolveClassAssignmentRole({
        parishRole: 'LEAD_CATECHIST',
        explicit: 'LEAD',
      }),
    ).toBe('ASSISTANT');
  });
});

describe('invite portal destination', () => {
  it('family roles use family portal host', () => {
    expect(isFamilyPortalRole('GUARDIAN')).toBe(true);
    expect(familyPortalUrl('/convite/abc')).toContain('familia.');
  });

  it('team roles use staff portal host', () => {
    expect(isFamilyPortalRole('LEAD_CATECHIST')).toBe(false);
    expect(staffPortalUrl('/convite/abc')).toContain('catechis.app');
    expect(staffPortalUrl('/convite/abc')).not.toContain('familia.');
  });
});
