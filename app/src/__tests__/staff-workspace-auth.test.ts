/**
 * staff-workspace-auth.test.ts — roles from parish A must not elevate writes/reads in B.
 *
 * Run: npx vitest run src/__tests__/staff-workspace-auth.test.ts
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('wasp/server', () => {
  class HttpError extends Error {
    statusCode: number;
    constructor(statusCode: number, message?: string) {
      super(message);
      this.statusCode = statusCode;
      this.name = 'HttpError';
    }
  }
  return { HttpError };
});

vi.mock('../server/storage/documentStorage', () => ({
  readDocumentFile: vi.fn().mockResolvedValue({
    buffer: Buffer.from('pdf'),
    contentType: 'application/pdf',
  }),
}));

import { createMeeting, saveAttendance } from '../server/operations/meetingOperations';
import { contentDispositionInline, serveDocument } from '../server/api/documents';
import { joinParish } from '../server/operations/joinParish';

const PARISH_A = 'parish-a';
const PARISH_B = 'parish-b';
const CLASS_B = 'class-b';
const MEETING_B = 'meeting-b';
const USER_ID = 'user-coord-a-guardian-b';
const CATECHUMEN_B = 'catechumen-b';

type MembershipRow = { parishId: string; role: string };

function makeCrossTenantEntities(opts?: {
  householdId?: string | null;
  catechumenHouseholdId?: string;
  allowAttendanceWrite?: boolean;
}) {
  const memberships: MembershipRow[] = [
    { parishId: PARISH_A, role: 'PARISH_COORDINATOR' },
    { parishId: PARISH_B, role: 'GUARDIAN' },
  ];
  const attendanceCreate = vi.fn(async (args: any) => ({
    id: 'att-1',
    updatedAt: new Date(),
    ...args.data,
  }));
  const meetingCreate = vi.fn(async (args: any) => ({ id: 'mtg-1', ...args.data }));

  const entities = {
    Parish: {
      findFirst: vi.fn(async () => null),
      findUnique: vi.fn(async ({ where }: any) =>
        where.id === PARISH_B
          ? { id: PARISH_B, name: 'B', ownerId: 'other', type: 'PARISH' }
          : { id: where.id, name: 'A', ownerId: 'other', type: 'PARISH' },
      ),
      findMany: vi.fn(async () => []),
    },
    Membership: {
      findFirst: vi.fn(async ({ where }: any) => {
        const hit = memberships.find((m) => {
          if (where.userId && where.userId !== USER_ID) return false;
          if (where.parishId && m.parishId !== where.parishId) return false;
          if (where.role && m.role !== where.role) return false;
          return true;
        });
        return hit ? { id: `m-${hit.parishId}`, role: hit.role } : null;
      }),
      findMany: vi.fn(async ({ where }: any) => {
        const userId = where.userId;
        if (userId && userId !== USER_ID && userId !== 'uploader-b') return [];
        const rows =
          userId === 'uploader-b'
            ? [{ parishId: PARISH_B, role: 'LEAD_CATECHIST' }]
            : memberships;
        return rows
          .filter((m) => !where.parishId || m.parishId === where.parishId)
          .map((m) => ({ parishId: m.parishId, role: m.role }));
      }),
    },
    ClassCatechist: {
      findMany: vi.fn(async () => []),
    },
    CatechesisClass: {
      findUnique: vi.fn(async () => ({
        parishId: PARISH_B,
        catechists: [],
      })),
    },
    Meeting: {
      findUnique: vi.fn(async () => ({
        classId: CLASS_B,
        status: 'NOT_STARTED',
      })),
      create: meetingCreate,
    },
    ClassEnrollment: {
      findFirst: vi.fn(async () => (opts?.allowAttendanceWrite === false ? null : { id: 'enr-1' })),
    },
    AttendanceRecord: {
      findFirst: vi.fn(async () => null),
      create: attendanceCreate,
      update: vi.fn(),
    },
    GuardianProfile: {
      findUnique: vi.fn(async () => ({
        householdId: opts?.householdId === undefined ? 'hh-guardian-b' : opts.householdId,
      })),
    },
    CatechumenProfile: {
      findUnique: vi.fn(async () => ({
        userId: 'someone-else',
        parishId: PARISH_B,
        householdId: opts?.catechumenHouseholdId ?? 'hh-other-b',
        enrollments: [{ class: { parishId: PARISH_B, id: CLASS_B } }],
        household: { parishId: PARISH_B },
      })),
      findFirst: vi.fn(async () => null),
    },
    Document: {
      findUnique: vi.fn(async () => ({
        id: 'doc-b',
        s3Key: 'docs/b.pdf',
        mimeType: 'application/pdf',
        name: 'boletim.pdf',
        catechumenProfileId: CATECHUMEN_B,
        uploadedById: 'uploader-b',
        catechumenProfile: { uploadToken: 'tok' },
      })),
    },
  };

  return {
    entities,
    attendanceCreate,
    meetingCreate,
    context: {
      user: { id: USER_ID, isAdmin: false },
      entities,
    },
  };
}

function makeRes() {
  const res: any = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  res.setHeader = vi.fn(() => res);
  res.send = vi.fn(() => res);
  return res;
}

describe('staff workspace scoping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('coordinator-in-A + guardian-in-B cannot saveAttendance in B', async () => {
    const { context, attendanceCreate } = makeCrossTenantEntities();
    await expect(
      saveAttendance(
        {
          meetingId: MEETING_B,
          catechumenProfileId: CATECHUMEN_B,
          status: 'PRESENT',
        },
        context,
      ),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(attendanceCreate).not.toHaveBeenCalled();
  });

  it('coordinator-in-A + guardian-in-B cannot createMeeting in B', async () => {
    const { context, meetingCreate } = makeCrossTenantEntities();
    await expect(
      createMeeting(
        {
          classId: CLASS_B,
          title: 'Encontro',
          date: '2026-03-01',
        },
        context,
      ),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(meetingCreate).not.toHaveBeenCalled();
  });

  it('serveDocument denies coordinator-in-A + guardian-in-B for a non-dependent in B', async () => {
    const { context } = makeCrossTenantEntities({
      householdId: 'hh-guardian-b',
      catechumenHouseholdId: 'hh-other-b',
    });
    const res = makeRes();
    await serveDocument(
      { params: { id: 'doc-b' }, query: {} } as any,
      res,
      context,
    );
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.send).not.toHaveBeenCalled();
  });

  it('joinParish rejects SUPER_ADMIN self-assign on a personal workspace', async () => {
    const create = vi.fn();
    const ctx = {
      user: { id: 'owner-1', isAdmin: false },
      entities: {
        Parish: {
          findUnique: vi.fn(async () => ({
            id: 'personal-1',
            name: 'Meu espaço',
            ownerId: 'owner-1',
            type: 'PERSONAL',
          })),
        },
        Membership: {
          findFirst: vi.fn(async () => null),
          create,
        },
      },
    };
    await expect(
      joinParish({ parishId: 'personal-1', role: 'SUPER_ADMIN' }, ctx),
    ).rejects.toMatchObject({ statusCode: 400 });
    await expect(
      joinParish({ parishId: 'personal-1', role: 'DIOCESE_ADMIN' }, ctx),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(create).not.toHaveBeenCalled();
  });

  it('escapes quotes and CRLF in Content-Disposition filenames', () => {
    expect(contentDispositionInline('ok.pdf')).toBe('inline; filename="ok.pdf"');
    expect(contentDispositionInline('evil"\r\nfilename=stolen.pdf')).toBe(
      'inline; filename="evil_filename=stolen.pdf"',
    );
  });
});
