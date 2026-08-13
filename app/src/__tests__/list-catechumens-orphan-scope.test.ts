/**
 * Coordinator listCatechumens must not return unscoped orphans
 * ({ parishId: null, householdId: null }) from other tenants.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('wasp/server', () => {
  class HttpError extends Error {
    statusCode: number;
    constructor(statusCode: number, message?: string) {
      super(message);
      this.statusCode = statusCode;
    }
  }
  return { HttpError, prisma: {} };
});

vi.mock('../server/operations/sharedScope', () => ({
  requireWorkspaceAccess: vi.fn(),
  isCoordinatorOrAbove: (role: string) =>
    ['PARISH_COORDINATOR', 'DIOCESE_ADMIN', 'SUPER_ADMIN', 'PERSONAL_OWNER'].includes(role),
  isCatechist: (role: string) =>
    ['LEAD_CATECHIST', 'ASSISTANT_CATECHIST'].includes(role),
}));

import { requireWorkspaceAccess } from '../server/operations/sharedScope';
import { listCatechumens } from '../server/operations/catechumenOperations';

const PARISH_P = 'parish-p-00000000';

const scopedProfile = {
  id: 'cat-scoped-p',
  firstName: 'Ana',
  lastName: 'Silva',
  parishId: PARISH_P,
  householdId: 'hh-p',
  household: { id: 'hh-p', name: 'Família Silva', parishId: PARISH_P },
  enrollments: [],
};

const orphanProfile = {
  id: 'cat-orphan-unscoped',
  firstName: 'Orfao',
  lastName: 'Livre',
  parishId: null,
  householdId: null,
  household: null,
  enrollments: [],
};

const catalog = [scopedProfile, orphanProfile];

function isUnscopedOrphanClause(clause: any): boolean {
  const and = clause?.AND;
  if (!Array.isArray(and)) return false;
  return (
    and.some((c) => c && Object.prototype.hasOwnProperty.call(c, 'parishId') && c.parishId === null) &&
    and.some((c) => c && Object.prototype.hasOwnProperty.call(c, 'householdId') && c.householdId === null)
  );
}

function profileMatchesWhere(profile: any, where: any): boolean {
  if (!where || Object.keys(where).length === 0) return true;
  if (Array.isArray(where.AND)) {
    return where.AND.every((part: any) => profileMatchesWhere(profile, part));
  }
  if (Array.isArray(where.OR)) {
    return where.OR.some((clause: any) => {
      if (isUnscopedOrphanClause(clause)) {
        return profile.parishId == null && profile.householdId == null;
      }
      if (clause?.parishId && profile.parishId === clause.parishId) return true;
      if (clause?.household?.parishId && profile.household?.parishId === clause.household.parishId) {
        return true;
      }
      const classParishId = clause?.enrollments?.some?.class?.parishId;
      if (classParishId) {
        return (profile.enrollments || []).some(
          (e: any) => e.class?.parishId === classParishId,
        );
      }
      return false;
    });
  }
  return false;
}

function coordinatorAccess(workspaceId: string) {
  return {
    workspaceId,
    role: 'PARISH_COORDINATOR',
    isPlatformAdmin: false,
    isCoordinatorOrAbove: true,
    isCatechist: false,
    canManageParish: true,
    allowedClassIds: 'ALL',
    membershipId: 'mem-coord-p',
  };
}

describe('listCatechumens orphan tenant scope', () => {
  beforeEach(() => {
    vi.mocked(requireWorkspaceAccess).mockReset();
  });

  it('does not include unscoped orphans in a coordinator parish listing', async () => {
    vi.mocked(requireWorkspaceAccess).mockResolvedValue(coordinatorAccess(PARISH_P) as any);

    const findMany = vi.fn(async ({ where }: { where: any }) =>
      catalog.filter((row) => profileMatchesWhere(row, where)),
    );

    const rows = await listCatechumens(
      { workspaceId: PARISH_P },
      {
        user: { id: 'user-coord-p', isAdmin: false },
        entities: { CatechumenProfile: { findMany } },
      },
    );

    expect(requireWorkspaceAccess).toHaveBeenCalledWith(expect.anything(), PARISH_P);
    expect(findMany).toHaveBeenCalledTimes(1);
    const where = findMany.mock.calls[0][0].where;
    const or = where.OR ?? where.AND?.[0]?.OR;
    expect(or).toEqual(
      expect.arrayContaining([
        { enrollments: { some: { class: { parishId: PARISH_P } } } },
        { household: { parishId: PARISH_P } },
        { parishId: PARISH_P },
      ]),
    );
    expect(or?.some(isUnscopedOrphanClause)).toBe(false);
    expect(rows.map((r: any) => r.id)).toEqual(['cat-scoped-p']);
    expect(rows.some((r: any) => r.parishId == null && r.householdId == null)).toBe(false);
  });

  it('platform admin without workspaceId still lists unscoped profiles', async () => {
    const findMany = vi.fn(async ({ where }: { where: any }) =>
      catalog.filter((row) => profileMatchesWhere(row, where)),
    );

    const rows = await listCatechumens(undefined, {
      user: { id: 'user-admin', isAdmin: true },
      entities: { CatechumenProfile: { findMany } },
    });

    expect(requireWorkspaceAccess).not.toHaveBeenCalled();
    expect(findMany).toHaveBeenCalledTimes(1);
    expect(findMany.mock.calls[0][0].where).toEqual({});
    expect(rows.map((r: any) => r.id)).toEqual(['cat-scoped-p', 'cat-orphan-unscoped']);
  });
});
