/**
 * multi-role-membership.test.ts — staff + family roles same parish.
 * Ensures LEAD_CATECHIST + GUARDIAN still resolves staff for effective role.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('wasp/server', () => {
  class HttpError extends Error {
    statusCode: number;
    constructor(statusCode: number, message?: string) {
      super(message ?? String(statusCode));
      this.statusCode = statusCode;
      this.name = 'HttpError';
    }
  }
  return { HttpError, prisma: {} };
});

vi.mock('@prisma/client', () => ({
  PrismaClient: class {},
  MembershipStatus: { ACTIVE: 'ACTIVE', INVITED: 'INVITED', SUSPENDED: 'SUSPENDED', INACTIVE: 'INACTIVE' },
}));

vi.mock('../server/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import {
  getEffectiveParishRole,
  getUserParishRoles,
  pickHighestPrivilegeRole,
  privilegeRank,
} from '../server/auth/helpers';

const PARISH = 'parish-1';
const USER = 'user-mixed';

describe('pickHighestPrivilegeRole', () => {
  it('prefers LEAD_CATECHIST over GUARDIAN', () => {
    expect(pickHighestPrivilegeRole(['GUARDIAN', 'LEAD_CATECHIST'])).toBe('LEAD_CATECHIST');
    expect(pickHighestPrivilegeRole(['CATECHUMEN', 'PARISH_COORDINATOR'])).toBe('PARISH_COORDINATOR');
  });

  it('ranks staff higher than family numerically', () => {
    expect(privilegeRank('LEAD_CATECHIST')).toBeLessThan(privilegeRank('GUARDIAN'));
    expect(privilegeRank('GUARDIAN')).toBeLessThan(privilegeRank('CATECHUMEN'));
  });
});

describe('getEffectiveParishRole multi-role', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns LEAD_CATECHIST when user also has GUARDIAN on same parish', async () => {
    const entities = {
      Parish: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      Membership: {
        findMany: vi.fn().mockResolvedValue([
          { role: 'GUARDIAN' },
          { role: 'LEAD_CATECHIST' },
        ]),
      },
    };
    const role = await getEffectiveParishRole(
      { user: { id: USER }, entities },
      PARISH,
    );
    expect(role).toBe('LEAD_CATECHIST');
    expect(entities.Membership.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: USER,
          parishId: PARISH,
          status: 'ACTIVE',
        }),
      }),
    );
  });
});

describe('getUserParishRoles multi-role', () => {
  it('collapses to highest privilege per parish', async () => {
    const entities = {
      Parish: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      Membership: {
        findMany: vi.fn().mockResolvedValue([
          { parishId: PARISH, role: 'GUARDIAN' },
          { parishId: PARISH, role: 'LEAD_CATECHIST' },
          { parishId: 'p2', role: 'CATECHUMEN' },
        ]),
      },
    };
    const roles = await getUserParishRoles({ user: { id: USER }, entities });
    expect(roles).toEqual(
      expect.arrayContaining([
        { parishId: PARISH, role: 'LEAD_CATECHIST' },
        { parishId: 'p2', role: 'CATECHUMEN' },
      ]),
    );
    expect(roles.find((r) => r.parishId === PARISH)?.role).toBe('LEAD_CATECHIST');
  });
});
