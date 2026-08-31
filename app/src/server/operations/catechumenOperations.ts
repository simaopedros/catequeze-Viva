import { HttpError, prisma } from 'wasp/server';
import { MembershipStatus, CatechistAssignmentRole } from '@prisma/client';
import { assertCanAccessCatechumenProfile, requireAuth, writeAuditLog } from '../auth/helpers';
import {
  requireWorkspaceAccess,
  isCoordinatorOrAbove,
  isCatechist,
} from './sharedScope';
import { deleteDocumentFile } from '../storage/documentStorage';

type ListCatechumensArgs = {
  take?: number;
  skip?: number;
  search?: string;
  workspaceId?: string;
  /** Opaque cursor from previous page (name-order). */
  cursor?: string | null;
  /**
   * When true (or when cursor is set), returns { items, nextCursor }.
   * Legacy callers without paginated keep array shape for mobile/API.
   */
  paginated?: boolean;
};

function encodeCatechumenCursor(row: {
  firstName: string | null;
  lastName: string | null;
  id: string;
}): string {
  return Buffer.from(
    JSON.stringify({
      f: row.firstName || '',
      l: row.lastName || '',
      i: row.id,
    }),
    'utf8',
  ).toString('base64url');
}

function decodeCatechumenCursor(cursor: string): {
  f: string;
  l: string;
  i: string;
} | null {
  try {
    const raw = JSON.parse(
      Buffer.from(cursor, 'base64url').toString('utf8'),
    );
    if (typeof raw?.i !== 'string') return null;
    return { f: raw.f || '', l: raw.l || '', i: raw.i };
  } catch {
    return null;
  }
}

function applyCursorWhere(baseWhere: any, cursor: string | null | undefined) {
  if (!cursor) return baseWhere;
  const c = decodeCatechumenCursor(cursor);
  if (!c) return baseWhere;
  const after = {
    OR: [
      { firstName: { gt: c.f } },
      { AND: [{ firstName: c.f }, { lastName: { gt: c.l } }] },
      {
        AND: [{ firstName: c.f }, { lastName: c.l }, { id: { gt: c.i } }],
      },
    ],
  };
  if (!baseWhere || Object.keys(baseWhere).length === 0) return after;
  return { AND: [baseWhere, after] };
}

/** Returns array (legacy) or { items, nextCursor } when paginated/cursor. */
export const listCatechumens = async (
  _args: ListCatechumensArgs | void,
  context: any,
): Promise<any> => {
  const args = _args || {};
  const useCursorPage = Boolean(args.paginated || args.cursor);
  const pageSize = Math.min(Math.max(args.take || 50, 1), 100);
  const take = useCursorPage ? pageSize + 1 : args.take;
  const skip = useCursorPage ? 0 : args.skip || 0;
  const search = args.search?.trim();
  if (!context.user) throw new HttpError(401);

  const orderBy: any = [
    { firstName: 'asc' },
    { lastName: 'asc' },
    { id: 'asc' },
  ];
  const include = {
    parish: { select: { id: true, name: true } },
    household: { select: { id: true, name: true, parishId: true } },
    enrollments: {
      include: {
        class: { select: { id: true, name: true, parishId: true } },
      },
    },
  };

  const buildWhere = (baseWhere: any) => {
    let where = applyCursorWhere(baseWhere, args.cursor);
    if (!search) return where;
    return {
      AND: [
        where,
        {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' as const } },
            { lastName: { contains: search, mode: 'insensitive' as const } },
          ],
        },
      ],
    };
  };

  const wrapResult = (rows: any[]) => {
    if (!useCursorPage) return rows;
    const hasMore = rows.length > pageSize;
    const items = hasMore ? rows.slice(0, pageSize) : rows;
    const last = items[items.length - 1];
    return {
      items,
      nextCursor:
        hasMore && last
          ? encodeCatechumenCursor({
              firstName: last.firstName,
              lastName: last.lastName,
              id: last.id,
            })
          : null,
    };
  };

  const workspaceId = args.workspaceId?.trim() || undefined;

  if (context.user.isAdmin && !workspaceId) {
    const rows = await context.entities.CatechumenProfile.findMany({
      where: buildWhere({}),
      orderBy,
      take,
      skip,
      include,
    });
    return wrapResult(rows);
  }

  if (!workspaceId) return useCursorPage ? { items: [], nextCursor: null } : [];

  const access = await requireWorkspaceAccess(context, workspaceId);
  const parishId = access.workspaceId;

  if (access.isCoordinatorOrAbove || access.role === 'PASTORAL_VIEWER') {
    const rows = await context.entities.CatechumenProfile.findMany({
      where: buildWhere({
        OR: [
          { enrollments: { some: { class: { parishId } } } },
          { household: { parishId } },
          { parishId },
        ],
      }),
      orderBy,
      take,
      skip,
      include,
    });
    return wrapResult(rows);
  }

  if (access.isCatechist) {
    const classIds =
      access.allowedClassIds === 'ALL' ? [] : access.allowedClassIds;
    if (classIds.length === 0) {
      return useCursorPage ? { items: [], nextCursor: null } : [];
    }

    const enrollments = await context.entities.ClassEnrollment.findMany({
      where: { classId: { in: classIds } },
      select: { catechumenProfileId: true },
    });
    const enrolledIds = [
      ...new Set(
        enrollments
          .map((e: any) => e.catechumenProfileId)
          .filter(Boolean) as string[],
      ),
    ];
    if (enrolledIds.length === 0) {
      return useCursorPage ? { items: [], nextCursor: null } : [];
    }

    const rows = await context.entities.CatechumenProfile.findMany({
      where: buildWhere({ id: { in: enrolledIds } }),
      orderBy,
      take,
      skip,
      include,
    });
    return wrapResult(rows);
  }

  if (access.role === 'GUARDIAN') {
    const guardian = await context.entities.GuardianProfile.findUnique({
      where: { userId: context.user.id },
    });
    if (guardian?.householdId) {
      const rows = await context.entities.CatechumenProfile.findMany({
        where: buildWhere({ householdId: guardian.householdId }),
        orderBy,
        take,
        skip,
        include,
      });
      return wrapResult(rows);
    }
    return useCursorPage ? { items: [], nextCursor: null } : [];
  }

  if (access.role === 'CATECHUMEN') {
    const rows = await context.entities.CatechumenProfile.findMany({
      where: buildWhere({ userId: context.user.id }),
      orderBy,
      take,
      skip,
      include,
    });
    return wrapResult(rows);
  }

  return useCursorPage ? { items: [], nextCursor: null } : [];
};

export const getCatechumenProfile = async (args: { id: string }, context: any) => {
  if (!context.user) throw new HttpError(401);
  await assertCanAccessCatechumenProfile(context, args.id);

  return context.entities.CatechumenProfile.findUnique({
    where: { id: args.id },
    include: {
      parish: { select: { id: true, name: true } },
      household: { include: { guardians: { include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } } } } },
      enrollments: { include: { class: { select: { id: true, name: true, stage: { select: { name: true } } } } } },
      sacramentalJourneys: { include: { template: { select: { id: true, name: true } }, milestones: true } },
      documents: true,
    },
  });
};

export const createCatechumen = async (args: any, context: any) => {
  if (!context.user) throw new HttpError(401);

  let parishId: string | null = null;

  if (!context.user.isAdmin) {
    const membership = await context.entities.Membership.findFirst({
      where: { userId: context.user.id, status: MembershipStatus.ACTIVE },
      select: { role: true, parishId: true },
    });

    if (membership && (isCoordinatorOrAbove(membership.role) || isCatechist(membership.role))) {
      parishId = membership.parishId;
    } else {
      // Try personal workspace
      const personal = await context.entities.Parish.findFirst({
        where: { ownerId: context.user.id, type: 'PERSONAL' },
        select: { id: true },
      });
      if (personal) {
        parishId = personal.id;
      } else {
        throw new HttpError(403, 'Apenas coordenadores e catequistas podem criar catequizandos.');
      }
    }
  } else {
    // Admin: use first active membership parish, or personal workspace, or null
    const membership = await context.entities.Membership.findFirst({
      where: { userId: context.user.id, status: MembershipStatus.ACTIVE },
      select: { parishId: true },
      orderBy: { createdAt: 'asc' },
    });
    parishId = membership?.parishId || null;
    if (!parishId) {
      const personal = await context.entities.Parish.findFirst({
        where: { ownerId: context.user.id, type: 'PERSONAL' },
        select: { id: true },
      });
      if (personal) parishId = personal.id;
    }
  }

  return context.entities.CatechumenProfile.create({
    data: {
      firstName: args.firstName, lastName: args.lastName,
      email: args.email || null,
      birthDate: args.birthDate ? (() => { const [y, m, d] = args.birthDate.slice(0, 10).split('-').map(Number); return new Date(Date.UTC(y, m - 1, d, 12, 0, 0)); })() : null,
      householdId: args.householdId || null, photoUrl: args.photoUrl || null,
      parishId,
    },
  });
};

export const updateCatechumen = async (args: any, context: any) => {
  if (!context.user) throw new HttpError(401);

  if (!args.id) {
    throw new HttpError(400, 'ID do catequizando é obrigatório.');
  }

  if (!context.user.isAdmin) {
    const catechumen = await context.entities.CatechumenProfile.findUnique({
      where: { id: args.id },
      select: { userId: true },
    });
    if (!catechumen) {
      throw new HttpError(404, 'Catequizando não encontrado.');
    }
    // Self-update allowed; otherwise require access to THIS catechumen's workspace
    if (catechumen.userId !== context.user.id) {
      await assertCanAccessCatechumenProfile(context, args.id);
    }
  }

  const { id, ...data } = args;
  return context.entities.CatechumenProfile.update({
    where: { id },
    data: { ...data, birthDate: data.birthDate ? (() => { const [y, m, d] = data.birthDate.slice(0, 10).split('-').map(Number); return new Date(Date.UTC(y, m - 1, d, 12, 0, 0)); })() : undefined },
  });
};

export const deleteCatechumen = async (args: { id: string }, context: any) => {
  requireAuth(context.user);

  if (!args.id) {
    throw new HttpError(400, 'ID do catequizando é obrigatório.');
  }

  await assertCanAccessCatechumenProfile(context, args.id);

  const catechumen = await context.entities.CatechumenProfile.findUnique({
    where: { id: args.id },
    select: {
      id: true,
      parishId: true,
      documents: { select: { id: true, s3Key: true } },
      sacramentalJourneys: { select: { id: true } },
      enrollments: { select: { class: { select: { parishId: true } } } },
      household: { select: { parishId: true } },
    },
  });

  if (!catechumen) {
    throw new HttpError(404, 'Catequizando não encontrado.');
  }

  if (!context.user.isAdmin) {
    // Authorize manage permission in the catechumen's workspace only
    const parishCandidates = [
      catechumen.parishId,
      catechumen.household?.parishId,
      ...(catechumen.enrollments || []).map(
        (e: any) => e.class?.parishId,
      ),
    ].filter(Boolean) as string[];
    let canManage = false;
    for (const pid of [...new Set(parishCandidates)]) {
      const access = await requireWorkspaceAccess(context, pid).catch(() => null);
      if (
        access &&
        (access.isCoordinatorOrAbove || access.isCatechist)
      ) {
        canManage = true;
        break;
      }
    }
    if (!canManage) {
      throw new HttpError(403, 'Apenas coordenadores e catequistas podem excluir catequizandos.');
    }
  }

  const documentKeys = catechumen.documents
    .map((document: any) => document.s3Key)
    .filter((s3Key: string | null) => !!s3Key && !s3Key.startsWith('pending/')) as string[];
  const journeyIds = catechumen.sacramentalJourneys.map((journey: any) => journey.id);

  await prisma.$transaction(async (tx: any) => {
    if (journeyIds.length > 0) {
      await tx.SacramentalMilestone.deleteMany({
        where: { journeyId: { in: journeyIds } },
      });
    }

    await tx.AttendanceRecord.deleteMany({
      where: { catechumenProfileId: args.id },
    });

    await tx.ActivitySubmission.deleteMany({
      where: { catechumenProfileId: args.id },
    });

    await tx.ClassEnrollment.deleteMany({
      where: { catechumenProfileId: args.id },
    });

    await tx.SacramentalJourney.deleteMany({
      where: { catechumenProfileId: args.id },
    });

    await tx.Document.deleteMany({
      where: { catechumenProfileId: args.id },
    });

    await tx.CatechumenProfile.delete({
      where: { id: args.id },
    });
  });

  for (const s3Key of documentKeys) {
    try {
      await deleteDocumentFile(s3Key);
    } catch {
      // best-effort blob cleanup after the database transaction succeeds
    }
  }

  await writeAuditLog(context, 'DELETE', 'CatechumenProfile', args.id, {
    operation: 'CATECHUMEN_DELETE',
    parishId: catechumen.parishId || null,
  });

  return { success: true };
};
