/**
 * portal-authz-p0.test.ts — PR1 authorization matrix (unit, no NODE_ENV gate).
 *
 * Covers: listParishMembers, calendar writes, conversation contact allowlists.
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

vi.mock('../server/auth/helpers', () => {
  class HttpError extends Error {
    statusCode: number;
    constructor(statusCode: number, message?: string) {
      super(message ?? String(statusCode));
      this.statusCode = statusCode;
    }
  }
  return {
    requireAuth: (user: any) => {
      if (!user) throw new HttpError(401);
    },
    getDioceseParishIds: vi.fn(async () => [] as string[]),
    getEffectiveParishRole: vi.fn(async () => null),
    assertCanAccessParish: vi.fn(async () => 'GUARDIAN'),
    assertCanAccessClass: vi.fn(async () => undefined),
    writeAuditLog: vi.fn(async () => undefined),
  };
});

vi.mock('../server/i18n/serverLocale', () => ({
  resolveUserLocale: () => 'pt-BR',
}));

vi.mock('../server/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { assertCanListParishMembers, listParishMembers } from '../server/operations/memberOperations';
import {
  assertCanWriteCalendar,
  createLiturgicalEvent,
  deleteLiturgicalEvent,
} from '../server/operations/calendarOperations';
import {
  getContactsForConversation,
  createConversation,
} from '../server/operations/conversationOperations';
import { isCoordinatorOrAbove, isCatechist } from '../server/operations/sharedScope';
import {
  getDioceseParishIds,
  assertCanAccessParish,
  getEffectiveParishRole,
} from '../server/auth/helpers';

const PARISH = 'parish-1';
const USER = 'user-1';

function baseEntities(overrides: Record<string, any> = {}) {
  return {
    Membership: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
    },
    Parish: {
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn().mockResolvedValue({ id: PARISH, type: 'PARISH', ownerId: null }),
    },
    LiturgicalEvent: {
      findUnique: vi.fn(),
      create: vi.fn(async ({ data }: any) => ({ id: 'ev-1', ...data })),
      delete: vi.fn(async ({ where }: any) => ({ id: where.id })),
      findMany: vi.fn().mockResolvedValue([]),
    },
    GuardianProfile: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
    },
    CatechumenProfile: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
    },
    ClassEnrollment: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    ClassCatechist: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    User: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    Conversation: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn(async ({ data }: any) => ({ id: 'conv-1', ...data })),
    },
    ConversationParticipant: {},
    Message: {
      create: vi.fn().mockResolvedValue({}),
    },
    ...overrides,
  };
}

function ctx(user: any, entities: any) {
  return { user, entities };
}

describe('sharedScope role helpers', () => {
  it('classifies coordinator-or-above correctly', () => {
    expect(isCoordinatorOrAbove('PARISH_COORDINATOR')).toBe(true);
    expect(isCoordinatorOrAbove('COMMUNITY_COORDINATOR')).toBe(true);
    expect(isCoordinatorOrAbove('PERSONAL_OWNER')).toBe(true);
    expect(isCoordinatorOrAbove('LEAD_CATECHIST')).toBe(false);
    expect(isCoordinatorOrAbove('GUARDIAN')).toBe(false);
    expect(isCoordinatorOrAbove('CATECHUMEN')).toBe(false);
  });

  it('classifies catechist roles', () => {
    expect(isCatechist('LEAD_CATECHIST')).toBe(true);
    expect(isCatechist('ASSISTANT_CATECHIST')).toBe(true);
    expect(isCatechist('PARISH_COORDINATOR')).toBe(false);
  });
});

describe('listParishMembers authorization matrix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getDioceseParishIds as any).mockResolvedValue([]);
  });

  it('allows platform admin', async () => {
    const entities = baseEntities({
      Membership: {
        findMany: vi.fn().mockResolvedValue([{ id: 'm1' }]),
      },
    });
    const result = await listParishMembers(
      { parishId: PARISH },
      ctx({ id: USER, isAdmin: true }, entities),
    );
    expect(result).toEqual([{ id: 'm1' }]);
  });

  it('allows PERSONAL owner of parish', async () => {
    const entities = baseEntities({
      Parish: {
        findFirst: vi.fn().mockResolvedValue({ id: PARISH }),
        findUnique: vi.fn(),
      },
      Membership: {
        findMany: vi.fn().mockResolvedValue([{ id: 'm1' }]),
        findFirst: vi.fn(),
      },
    });
    await expect(
      assertCanListParishMembers(ctx({ id: USER, isAdmin: false }, entities), PARISH),
    ).resolves.toBeUndefined();
  });

  it('allows PARISH_COORDINATOR membership', async () => {
    const entities = baseEntities({
      Membership: {
        findMany: vi.fn().mockResolvedValue([{ role: 'PARISH_COORDINATOR' }]),
        findFirst: vi.fn().mockResolvedValue(null),
      },
    });
    await expect(
      assertCanListParishMembers(ctx({ id: USER, isAdmin: false }, entities), PARISH),
    ).resolves.toBeUndefined();
  });

  it('rejects LEAD_CATECHIST with 403', async () => {
    const entities = baseEntities({
      Membership: {
        findMany: vi.fn().mockResolvedValue([{ role: 'LEAD_CATECHIST' }]),
        findFirst: vi.fn().mockResolvedValue(null),
      },
    });
    await expect(
      assertCanListParishMembers(ctx({ id: USER, isAdmin: false }, entities), PARISH),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('rejects GUARDIAN with 403', async () => {
    const entities = baseEntities({
      Membership: {
        findMany: vi.fn().mockResolvedValue([{ role: 'GUARDIAN' }]),
        findFirst: vi.fn().mockResolvedValue(null),
      },
    });
    await expect(
      listParishMembers({ parishId: PARISH }, ctx({ id: USER, isAdmin: false }, entities)),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('rejects CATECHUMEN with 403', async () => {
    const entities = baseEntities({
      Membership: {
        findMany: vi.fn().mockResolvedValue([{ role: 'CATECHUMEN' }]),
        findFirst: vi.fn().mockResolvedValue(null),
      },
    });
    await expect(
      assertCanListParishMembers(ctx({ id: USER, isAdmin: false }, entities), PARISH),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('allows DIOCESE_ADMIN when parish is in diocese scope', async () => {
    (getDioceseParishIds as any).mockResolvedValue([PARISH]);
    const entities = baseEntities({
      Membership: {
        findMany: vi.fn().mockResolvedValue([]), // no direct parish membership
        findFirst: vi.fn().mockResolvedValue({ id: 'da-1' }), // DIOCESE_ADMIN row
      },
    });
    await expect(
      assertCanListParishMembers(ctx({ id: USER, isAdmin: false }, entities), PARISH),
    ).resolves.toBeUndefined();
  });
});

describe('calendar write authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getDioceseParishIds as any).mockResolvedValue([]);
  });

  it('requires parishId on create for non-admins', async () => {
    const entities = baseEntities();
    await expect(
      createLiturgicalEvent(
        { name: 'X', date: '2026-01-01' } as any,
        ctx({ id: USER, isAdmin: false }, entities),
      ),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('allows platform admin to create global events without parishId', async () => {
    const entities = baseEntities();
    const created = await createLiturgicalEvent(
      { name: 'Global feast', date: '2026-12-25' },
      ctx({ id: USER, isAdmin: true }, entities),
    );
    expect(created.parishId).toBeNull();
    expect(entities.LiturgicalEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ parishId: null, name: 'Global feast' }),
      }),
    );
  });

  it('allows coordinator to create with explicit parishId', async () => {
    const entities = baseEntities({
      Membership: {
        findMany: vi.fn().mockResolvedValue([{ role: 'PARISH_COORDINATOR' }]),
        findFirst: vi.fn().mockResolvedValue(null),
      },
    });
    const created = await createLiturgicalEvent(
      { parishId: PARISH, name: 'Páscoa', date: '2026-04-05' },
      ctx({ id: USER, isAdmin: false }, entities),
    );
    expect(created.parishId).toBe(PARISH);
    expect(entities.LiturgicalEvent.create).toHaveBeenCalled();
  });

  it('rejects GUARDIAN create', async () => {
    const entities = baseEntities({
      Membership: {
        findMany: vi.fn().mockResolvedValue([{ role: 'GUARDIAN' }]),
        findFirst: vi.fn().mockResolvedValue(null),
      },
    });
    await expect(
      createLiturgicalEvent(
        { parishId: PARISH, name: 'X', date: '2026-01-01' },
        ctx({ id: USER, isAdmin: false }, entities),
      ),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('rejects LEAD_CATECHIST create', async () => {
    const entities = baseEntities({
      Membership: {
        findMany: vi.fn().mockResolvedValue([{ role: 'LEAD_CATECHIST' }]),
        findFirst: vi.fn().mockResolvedValue(null),
      },
    });
    await expect(
      assertCanWriteCalendar(ctx({ id: USER, isAdmin: false }, entities), PARISH),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('rejects family role on delete', async () => {
    const entities = baseEntities({
      LiturgicalEvent: {
        findUnique: vi.fn().mockResolvedValue({ parishId: PARISH }),
        delete: vi.fn(),
      },
      Membership: {
        findMany: vi.fn().mockResolvedValue([{ role: 'CATECHUMEN' }]),
        findFirst: vi.fn().mockResolvedValue(null),
      },
    });
    await expect(
      deleteLiturgicalEvent({ id: 'ev-1' }, ctx({ id: USER, isAdmin: false }, entities)),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('allows PERSONAL owner delete for their parish event', async () => {
    const entities = baseEntities({
      LiturgicalEvent: {
        findUnique: vi.fn().mockResolvedValue({ parishId: PARISH }),
        delete: vi.fn().mockResolvedValue({ id: 'ev-1' }),
      },
      Parish: {
        findFirst: vi.fn().mockResolvedValue({ id: PARISH }),
      },
      Membership: {
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn().mockResolvedValue(null),
      },
    });
    await expect(
      deleteLiturgicalEvent({ id: 'ev-1' }, ctx({ id: USER, isAdmin: false }, entities)),
    ).resolves.toEqual({ id: 'ev-1' });
  });
});

describe('conversation contact allowlists (family)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (assertCanAccessParish as any).mockResolvedValue('GUARDIAN');
    (getDioceseParishIds as any).mockResolvedValue([]);
  });

  it('guardian does not receive parish-wide membership dump', async () => {
    const parishMembershipDump = [
      {
        user: { id: 'stranger', firstName: 'Stranger', lastName: 'X', email: 's@x.com', avatarUrl: null },
        role: 'LEAD_CATECHIST',
      },
    ];

    const membershipFindMany = vi.fn(async (args: any) => {
      // workspace roles query
      if (args?.where?.userId === USER && args?.where?.parishId === PARISH) {
        return [{ role: 'GUARDIAN' }];
      }
      // coordination allowlist
      if (args?.where?.role?.in) {
        return [
          {
            user: { id: 'coord-1', firstName: 'Coord', lastName: 'Y', email: 'c@y.com', avatarUrl: null },
            role: 'PARISH_COORDINATOR',
          },
        ];
      }
      // staff dump path would use parishId in
      return parishMembershipDump;
    });

    const entities = baseEntities({
      Parish: {
        findUnique: vi.fn().mockResolvedValue({ id: PARISH, type: 'PARISH', ownerId: null }),
        findFirst: vi.fn().mockResolvedValue(null),
      },
      Membership: {
        findMany: membershipFindMany,
        findFirst: vi.fn().mockResolvedValue(null),
      },
      GuardianProfile: {
        findMany: vi.fn(async (args: any) => {
          if (args?.where?.userId === USER) {
            return [{ householdId: 'hh-1' }];
          }
          // household guardians
          return [
            {
              userId: 'co-guardian',
              user: { id: 'co-guardian', firstName: 'Co', lastName: 'G', email: 'g@x.com', avatarUrl: null },
            },
          ];
        }),
      },
      ClassEnrollment: {
        findMany: vi.fn().mockResolvedValue([{ classId: 'class-1' }]),
      },
      ClassCatechist: {
        findMany: vi.fn().mockResolvedValue([
          {
            role: 'LEAD',
            user: { id: 'cat-1', firstName: 'Cat', lastName: 'Z', email: 'cat@z.com', avatarUrl: null },
          },
        ]),
      },
      CatechumenProfile: {
        findMany: vi.fn().mockResolvedValue([
          {
            userId: 'random-catechumen',
            user: { id: 'random-catechumen', firstName: 'All', lastName: 'C', email: 'a@c.com', avatarUrl: null },
          },
        ]),
        findFirst: vi.fn().mockResolvedValue(null),
      },
    });

    const contacts = await getContactsForConversation(
      { workspaceId: PARISH },
      ctx({ id: USER, isAdmin: false }, entities),
    );
    const ids = contacts.map((c: any) => c.id).sort();

    expect(ids).toContain('co-guardian');
    expect(ids).toContain('cat-1');
    expect(ids).toContain('coord-1');
    expect(ids).not.toContain('stranger');
    expect(ids).not.toContain('random-catechumen');
  });

  it('catechumen contacts are limited to guardians, class team, and peers', async () => {
    (assertCanAccessParish as any).mockResolvedValue('CATECHUMEN');

    const entities = baseEntities({
      Parish: {
        findUnique: vi.fn().mockResolvedValue({ id: PARISH, type: 'PARISH', ownerId: null }),
        findFirst: vi.fn().mockResolvedValue(null),
      },
      Membership: {
        findMany: vi.fn(async (args: any) => {
          if (args?.where?.userId === USER) return [{ role: 'CATECHUMEN' }];
          return [
            {
              user: { id: 'should-not-appear', firstName: 'No', lastName: 'pe', email: 'n@p.com', avatarUrl: null },
              role: 'GUARDIAN',
            },
          ];
        }),
        findFirst: vi.fn().mockResolvedValue(null),
      },
      CatechumenProfile: {
        findFirst: vi.fn().mockResolvedValue({ id: 'cp-1', householdId: 'hh-1', parishId: PARISH }),
        findMany: vi.fn().mockResolvedValue([]),
      },
      ClassEnrollment: {
        findMany: vi.fn(async (args: any) => {
          if (args?.where?.catechumenProfileId === 'cp-1') {
            return [{ classId: 'class-1' }];
          }
          // peers
          return [{ catechumenProfile: { userId: 'peer-1' } }];
        }),
      },
      ClassCatechist: {
        findMany: vi.fn().mockResolvedValue([
          {
            role: 'LEAD',
            user: { id: 'teacher-1', firstName: 'T', lastName: '1', email: 't@1.com', avatarUrl: null },
          },
        ]),
      },
      GuardianProfile: {
        findMany: vi.fn().mockResolvedValue([
          {
            userId: 'parent-1',
            user: { id: 'parent-1', firstName: 'P', lastName: '1', email: 'p@1.com', avatarUrl: null },
          },
        ]),
      },
      User: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'peer-1', firstName: 'Peer', lastName: '1', email: 'peer@1.com', avatarUrl: null },
        ]),
      },
    });

    const contacts = await getContactsForConversation(
      { workspaceId: PARISH },
      ctx({ id: USER, isAdmin: false }, entities),
    );
    const ids = contacts.map((c: any) => c.id).sort();

    expect(ids).toEqual(['parent-1', 'peer-1', 'teacher-1'].sort());
    expect(ids).not.toContain('should-not-appear');
  });

  it('returns empty contacts when workspace roles are empty (fail-closed)', async () => {
    // Access mock succeeds but no membership roles → must not parish-wide dump.
    (assertCanAccessParish as any).mockResolvedValue('UNKNOWN');
    const entities = baseEntities({
      Parish: {
        findUnique: vi.fn().mockResolvedValue({ id: PARISH, type: 'PARISH', ownerId: null }),
        findFirst: vi.fn().mockResolvedValue(null),
      },
      Membership: {
        findMany: vi.fn().mockResolvedValue([]), // no roles for workspace
        findFirst: vi.fn().mockResolvedValue(null),
      },
    });

    const contacts = await getContactsForConversation(
      { workspaceId: PARISH },
      ctx({ id: USER, isAdmin: false }, entities),
    );
    expect(contacts).toEqual([]);
    // Staff dump would query parish members without userId filter on the caller role query —
    // ensure we never opened the wide membership dump for other users.
    const membershipCalls = (entities.Membership.findMany as any).mock.calls;
    const wideDump = membershipCalls.some(
      (call: any[]) => call[0]?.where?.parishId?.in || call[0]?.where?.userId?.not,
    );
    expect(wideDump).toBe(false);
  });

  it('createConversation rejects non-allowlisted participant for GUARDIAN (403)', async () => {
    (assertCanAccessParish as any).mockResolvedValue('GUARDIAN');
    (getEffectiveParishRole as any).mockResolvedValue('GUARDIAN');

    const membershipFindMany = vi.fn(async (args: any) => {
      if (args?.where?.userId === USER && args?.where?.parishId === PARISH) {
        return [{ role: 'GUARDIAN' }];
      }
      if (args?.where?.role?.in) {
        return [
          {
            user: { id: 'coord-1', firstName: 'Coord', lastName: 'Y', email: 'c@y.com', avatarUrl: null },
            role: 'PARISH_COORDINATOR',
          },
        ];
      }
      return [];
    });

    const entities = baseEntities({
      Parish: {
        findUnique: vi.fn().mockResolvedValue({ id: PARISH, type: 'PARISH', ownerId: null }),
        findFirst: vi.fn().mockResolvedValue(null),
      },
      Membership: {
        findMany: membershipFindMany,
        findFirst: vi.fn().mockResolvedValue(null),
      },
      GuardianProfile: {
        findMany: vi.fn(async (args: any) => {
          if (args?.where?.userId === USER) return [{ householdId: 'hh-1' }];
          return [
            {
              userId: 'co-guardian',
              user: {
                id: 'co-guardian',
                firstName: 'Co',
                lastName: 'G',
                email: 'g@x.com',
                avatarUrl: null,
              },
            },
          ];
        }),
      },
      ClassEnrollment: { findMany: vi.fn().mockResolvedValue([]) },
      ClassCatechist: { findMany: vi.fn().mockResolvedValue([]) },
      Conversation: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn(),
      },
    });

    await expect(
      createConversation(
        {
          type: 'DIRECT',
          parishId: PARISH,
          participantUserIds: ['stranger-not-allowed'],
        },
        ctx({ id: USER, isAdmin: false }, entities),
      ),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(entities.Conversation.create).not.toHaveBeenCalled();
  });

  it('createConversation allows allowlisted co-guardian for GUARDIAN', async () => {
    (assertCanAccessParish as any).mockResolvedValue('GUARDIAN');
    (getEffectiveParishRole as any).mockResolvedValue('GUARDIAN');

    const membershipFindMany = vi.fn(async (args: any) => {
      if (args?.where?.userId === USER && args?.where?.parishId === PARISH) {
        return [{ role: 'GUARDIAN' }];
      }
      if (args?.where?.role?.in) return [];
      return [];
    });

    const entities = baseEntities({
      Parish: {
        findUnique: vi.fn().mockResolvedValue({ id: PARISH, type: 'PARISH', ownerId: null }),
        findFirst: vi.fn().mockResolvedValue(null),
      },
      Membership: {
        findMany: membershipFindMany,
        findFirst: vi.fn().mockResolvedValue(null),
      },
      GuardianProfile: {
        findMany: vi.fn(async (args: any) => {
          if (args?.where?.userId === USER) return [{ householdId: 'hh-1' }];
          return [
            {
              userId: 'co-guardian',
              user: {
                id: 'co-guardian',
                firstName: 'Co',
                lastName: 'G',
                email: 'g@x.com',
                avatarUrl: null,
              },
            },
          ];
        }),
      },
      ClassEnrollment: { findMany: vi.fn().mockResolvedValue([]) },
      ClassCatechist: { findMany: vi.fn().mockResolvedValue([]) },
      Conversation: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn(async ({ data }: any) => ({
          id: 'conv-1',
          ...data,
          participants: [],
        })),
      },
    });

    const conv = await createConversation(
      {
        type: 'DIRECT',
        parishId: PARISH,
        participantUserIds: ['co-guardian'],
      },
      ctx({ id: USER, isAdmin: false }, entities),
    );
    expect(conv.id).toBe('conv-1');
    expect(entities.Conversation.create).toHaveBeenCalled();
  });
});
