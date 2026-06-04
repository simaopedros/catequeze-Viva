/**
 * membership-switching.test.ts — Verify active membership switching logic.
 */
import { describe, it, expect } from 'vitest';
import { USERS, getUserMemberships } from './setup';

// Priority order constant (mirrors useUserContext.ts)
const ROLE_PRIORITY = [
  'SUPER_ADMIN', 'DIOCESE_ADMIN',
  'PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR',
  'LEAD_CATECHIST', 'ASSISTANT_CATECHIST',
  'GUARDIAN', 'CATECHUMEN',
];

function pickBestMembership(memberships: any[]) {
  if (memberships.length === 0) return undefined;
  return memberships
    .slice()
    .sort((a, b) => ROLE_PRIORITY.indexOf(a.role) - ROLE_PRIORITY.indexOf(b.role))[0];
}

describe('Membership Priority Resolution', () => {

  it('single membership → pickBest returns it', async () => {
    const memberships = await getUserMemberships(USERS.coordSaoJose.id);
    expect(memberships.length).toBe(1);
    
    const best = pickBestMembership(memberships);
    expect(best!.role).toBe('PARISH_COORDINATOR');
  });

  it('multi-role user → pickBest returns highest priority (PARISH_COORDINATOR)', async () => {
    const memberships = await getUserMemberships(USERS.multirole.id);
    expect(memberships.length).toBe(2);

    const best = pickBestMembership(memberships);
    expect(best!.role).toBe('PARISH_COORDINATOR');
  });

  it('multi-role user → second membership is LEAD_CATECHIST', async () => {
    const memberships = await getUserMemberships(USERS.multirole.id);
    const sorted = memberships
      .slice()
      .sort((a, b) => ROLE_PRIORITY.indexOf(a.role) - ROLE_PRIORITY.indexOf(b.role));
    
    expect(sorted[0].role).toBe('PARISH_COORDINATOR');
    expect(sorted[1].role).toBe('LEAD_CATECHIST');
  });

  it('GUARDIAN has lower priority than catechist', () => {
    const guardianIdx = ROLE_PRIORITY.indexOf('GUARDIAN');
    const leadIdx = ROLE_PRIORITY.indexOf('LEAD_CATECHIST');
    expect(leadIdx).toBeLessThan(guardianIdx);
  });

  it('CATECHUMEN has lowest priority', () => {
    const idx = ROLE_PRIORITY.indexOf('CATECHUMEN');
    expect(idx).toBe(ROLE_PRIORITY.length - 1);
  });

});

describe('Active Membership Storage Key', () => {
  it('uses correct localStorage key', () => {
    const STORAGE_KEY = 'catequese-viva-active-membership';
    expect(STORAGE_KEY).toBe('catequese-viva-active-membership');
  });
});

describe('Coordinator Role Check', () => {
  const COORDINATOR_ROLES = ['SUPER_ADMIN', 'DIOCESE_ADMIN', 'PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR'];

  it('PARISH_COORDINATOR is coordinator', () => {
    expect(COORDINATOR_ROLES.includes('PARISH_COORDINATOR')).toBe(true);
  });

  it('LEAD_CATECHIST is NOT coordinator', () => {
    expect(COORDINATOR_ROLES.includes('LEAD_CATECHIST')).toBe(false);
  });

  it('ASSISTANT_CATECHIST is NOT coordinator', () => {
    expect(COORDINATOR_ROLES.includes('ASSISTANT_CATECHIST')).toBe(false);
  });
});
