/**
 * portal-dashboard.test.ts — PR9: guardian/catechumen portal dashboard DTOs
 * use resolvePortalScope and never expose parish-wide pastoral stats.
 * No NODE_ENV gate — always runs in CI.
 *
 * Run: npx vitest run src/__tests__/portal-dashboard.test.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

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

import {
  getGuardianPortalDashboard,
  getCatechumenPortalDashboard,
  getPortalDependentDetail,
  getPortalMyJourney,
} from '../server/operations/portalDashboardOperations';

const guardianUser = { id: 'user-g1', isAdmin: false };
const catechumenUser = { id: 'user-c1', isAdmin: false };
const strangerUser = { id: 'user-x', isAdmin: false };

const depId = 'cat-1';
const dep2Id = 'cat-2';
const classId = 'class-1';
const householdId = 'hh-1';
const parishId = 'parish-1';

function makeContext(user: any, entityOverrides: Record<string, any> = {}) {
  const memberships = entityOverrides.memberships || [
    {
      id: 'mem-g',
      parishId,
      role: 'GUARDIAN',
      status: 'ACTIVE',
    },
  ];

  const entities: Record<string, any> = {
    Membership: {
      findMany: vi.fn(async () => memberships),
    },
    Parish: {
      findMany: vi.fn(async () => [{ id: parishId, active: true }]),
    },
    GuardianProfile: {
      findMany: vi.fn(async () => [
        {
          id: 'gp-1',
          userId: user.id,
          householdId,
          createdAt: new Date('2020-01-01'),
        },
      ]),
      findFirst: vi.fn(async () => ({
        id: 'gp-1',
        userId: user.id,
        householdId,
        createdAt: new Date('2020-01-01'),
      })),
    },
    CatechumenProfile: {
      findMany: vi.fn(async ({ where }: any) => {
        if (where?.id?.in) {
          return where.id.in.map((id: string) => ({
            id,
            firstName: id === depId ? 'Ana' : 'Bruno',
            lastName: 'Silva',
            birthDate: new Date('2012-05-01'),
            email: null,
            enrollments: [
              {
                classId,
                class: { id: classId, name: 'Crisma A', dayOfWeek: 3, startTime: '19:00' },
              },
            ],
          }));
        }
        if (where?.householdId) {
          return [
            { id: depId },
            { id: dep2Id },
          ];
        }
        return [{ id: depId }, { id: dep2Id }];
      }),
      findFirst: vi.fn(async () => ({
        id: depId,
        householdId,
        birthDate: new Date('2008-01-01'),
      })),
      findUnique: vi.fn(async ({ where }: any) => {
        if (where.id === depId || where.id === dep2Id) {
          return {
            id: where.id,
            firstName: 'Ana',
            lastName: 'Silva',
            birthDate: new Date('2012-05-01'),
            email: null,
            enrollments: [
              {
                classId,
                class: { id: classId, name: 'Crisma A', dayOfWeek: 3, startTime: '19:00' },
              },
            ],
          };
        }
        return null;
      }),
    },
    ClassEnrollment: {
      findMany: vi.fn(async () => [{ classId }]),
    },
    Meeting: {
      findMany: vi.fn(async () => [
        {
          id: 'meet-1',
          title: 'Encontro 1',
          theme: null,
          date: new Date(Date.now() + 86400000),
          status: 'NOT_STARTED',
          classId,
          class: { id: classId, name: 'Crisma A' },
        },
      ]),
    },
    Document: {
      findMany: vi.fn(async () => [
        {
          id: 'doc-1',
          type: 'BIRTH_CERTIFICATE',
          verifiedAt: null,
          catechumenProfileId: depId,
          catechumenProfile: { firstName: 'Ana', lastName: 'Silva' },
        },
      ]),
      count: vi.fn(async () => 1),
    },
    AttendanceRecord: {
      findMany: vi.fn(async () => []),
    },
    SacramentalJourney: {
      findMany: vi.fn(async () => [
        {
          id: 'j-1',
          catechumenProfileId: depId,
          catechumenProfile: { firstName: 'Ana', lastName: 'Silva' },
          template: { name: 'Crisma' },
          milestones: [
            { status: 'COMPLETED', templateMilestone: { required: true } },
            { status: 'PENDING', templateMilestone: { required: true } },
          ],
        },
      ]),
    },
    ConsentRecord: {
      findMany: vi.fn(async () => [
        { type: 'IMAGE_USAGE', granted: true },
        { type: 'COMMUNICATION', granted: false },
      ]),
    },
    MinorPortalConsent: {
      findMany: vi.fn(async () => []),
    },
    ConversationParticipant: {
      findMany: vi.fn(async () => []),
    },
    Message: {
      count: vi.fn(async () => 0),
    },
    ...entityOverrides.entities,
  };

  // resolveGuardianProfileForUser uses entities.GuardianProfile
  return { user, entities };
}

describe('getGuardianPortalDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 without user', async () => {
    await expect(getGuardianPortalDashboard({}, { user: null, entities: {} })).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it('returns minimal guardian DTO with dependents and next meeting', async () => {
    const ctx = makeContext(guardianUser);
    const dto = await getGuardianPortalDashboard({ parishId }, ctx);

    expect(dto.role).toBe('GUARDIAN');
    expect(dto.dependents.length).toBeGreaterThanOrEqual(1);
    expect(dto.nextMeeting?.id).toBe('meet-1');
    expect(dto.pendingDocumentCount).toBe(1);
    expect(dto.sacramentalProgress[0]?.pendingRequired).toBe(1);
    expect(dto.consents.householdConsentsGranted).toBe(1);
    // No pastoral parish-wide fields
    expect((dto as any).activeCatechumens).toBeUndefined();
    expect((dto as any).activeClasses).toBeUndefined();
    expect((dto as any).reviewQueue).toBeUndefined();
  });

  it('403 when selecting dependent outside scope', async () => {
    const ctx = makeContext(guardianUser);
    await expect(
      getGuardianPortalDashboard({ parishId, dependentId: 'other-cat' }, ctx),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('403 for pure staff (no family membership)', async () => {
    const ctx = makeContext(strangerUser, {
      memberships: [
        { id: 'm1', parishId, role: 'LEAD_CATECHIST', status: 'ACTIVE' },
      ],
    });
    await expect(getGuardianPortalDashboard({ parishId }, ctx)).rejects.toMatchObject({
      statusCode: 403,
    });
  });
});

describe('getCatechumenPortalDashboard', () => {
  it('returns catechumen DTO for own profile', async () => {
    const ctx = makeContext(catechumenUser, {
      memberships: [
        { id: 'mem-c', parishId, role: 'CATECHUMEN', status: 'ACTIVE' },
      ],
    });
    const dto = await getCatechumenPortalDashboard({ parishId }, ctx);
    expect(dto.role).toBe('CATECHUMEN');
    expect(dto.profile?.id).toBe(depId);
    expect(dto.nextMeeting?.id).toBe('meet-1');
    expect((dto as any).activeCatechumens).toBeUndefined();
  });

  it('403 when caller is guardian-only asking catechumen dashboard', async () => {
    const ctx = makeContext(guardianUser);
    // Guardian membership only — preferRole CATECHUMEN may still pick guardian if no catechumen mem
    // requirePortalScope with preferRole CATECHUMEN: if only GUARDIAN membership, selected stays GUARDIAN
    await expect(getCatechumenPortalDashboard({ parishId }, ctx)).rejects.toMatchObject({
      statusCode: 403,
    });
  });
});

describe('getPortalDependentDetail', () => {
  it('returns detail for in-scope dependent', async () => {
    const ctx = makeContext(guardianUser);
    // dependentCatechumenIds from household findMany
    ctx.entities.CatechumenProfile.findMany = vi.fn(async ({ where }: any) => {
      if (where?.householdId) return [{ id: depId }, { id: dep2Id }];
      if (where?.id?.in) {
        return where.id.in.map((id: string) => ({
          id,
          firstName: 'Ana',
          lastName: 'Silva',
          birthDate: null,
          enrollments: [],
        }));
      }
      return [];
    });
    const detail = await getPortalDependentDetail({ id: depId, parishId }, ctx);
    expect(detail.id).toBe(depId);
    expect(detail.firstName).toBe('Ana');
  });

  it('403 for out-of-scope id', async () => {
    const ctx = makeContext(guardianUser);
    await expect(
      getPortalDependentDetail({ id: 'not-mine', parishId }, ctx),
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});

describe('getPortalMyJourney', () => {
  it('returns journey aggregate for guardian', async () => {
    const ctx = makeContext(guardianUser);
    const data = await getPortalMyJourney({ parishId }, ctx);
    expect(data.role).toBe('GUARDIAN');
    expect(data.sacramentalProgress.length).toBeGreaterThanOrEqual(1);
    expect(data.upcomingMeetings[0]?.id).toBe('meet-1');
  });
});
