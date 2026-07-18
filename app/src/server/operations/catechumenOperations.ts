import { HttpError, prisma } from 'wasp/server';
import { MembershipStatus, CatechistAssignmentRole } from '@prisma/client';
import { assertCanAccessCatechumenProfile, requireAuth, writeAuditLog } from '../auth/helpers';
import {
  requireWorkspaceAccess,
  isCoordinatorOrAbove,
  isCatechist,
} from './sharedScope';
import { deleteDocumentFile } from '../storage/documentStorage';

export const listCatechumens = async (
  _args:
    | { take?: number; skip?: number; search?: string; workspaceId?: string }
    | void,
  context: any,
) => {
  const args = _args || {};
  const take = args.take;
  const skip = args.skip || 0;
  const search = args.search?.trim();
  if (!context.user) throw new HttpError(401);

  const orderBy: any = [{ firstName: 'asc' }, { lastName: 'asc' }];
  const include = {
    parish: { select: { id: true, name: true } },
    household: { select: { id: true, name: true, parishId: true } },
    enrollments: { include: { class: { select: { id: true, name: true, parishId: true } } } },
  };

  const buildWhere = (baseWhere: any) => {
    if (!search) return baseWhere;
    return {
      AND: [
        baseWhere,
        {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' as const } },
            { lastName: { contains: search, mode: 'insensitive' as const } },
          ],
        },
      ],
    };
  };

  const workspaceId = args.workspaceId?.trim() || undefined;

  if (context.user.isAdmin && !workspaceId) {
    return context.entities.CatechumenProfile.findMany({
      where: buildWhere({}),
      orderBy,
      take,
      skip,
      include,
    });
  }

  if (!workspaceId) return [];

  const access = await requireWorkspaceAccess(context, workspaceId);
  const parishId = access.workspaceId;

  // Coordinator and above: catechumens in this parish only (never other workspaces)
  if (access.isCoordinatorOrAbove || access.role === 'PASTORAL_VIEWER') {
    return context.entities.CatechumenProfile.findMany({
      where: buildWhere({
        OR: [
          { enrollments: { some: { class: { parishId } } } },
          { household: { parishId } },
          { parishId },
          {
            AND: [{ parishId: null }, { householdId: null }],
          },
        ],
      }),
      orderBy,
      take,
      skip,
      include,
    });
  }

  // Catechist: only enrolled in ClassCatechist-linked classes in this workspace
  if (access.isCatechist) {
    const classIds =
      access.allowedClassIds === 'ALL' ? [] : access.allowedClassIds;
    if (classIds.length === 0) return [];

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
    if (enrolledIds.length === 0) return [];

    return context.entities.CatechumenProfile.findMany({
      where: buildWhere({ id: { in: enrolledIds } }),
      orderBy,
      take,
      skip,
      include,
    });
  }

  if (access.role === 'GUARDIAN') {
    const guardian = await context.entities.GuardianProfile.findUnique({
      where: { userId: context.user.id },
    });
    if (guardian?.householdId) {
      return context.entities.CatechumenProfile.findMany({
        where: buildWhere({ householdId: guardian.householdId }),
        orderBy,
        take,
        skip,
        include,
      });
    }
    return [];
  }

  if (access.role === 'CATECHUMEN') {
    return context.entities.CatechumenProfile.findMany({
      where: buildWhere({ userId: context.user.id }),
      orderBy,
      take,
      skip,
      include,
    });
  }

  return [];
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

  if (!context.user.isAdmin) {
    const catechumen = await context.entities.CatechumenProfile.findUnique({
      where: { id: args.id },
      select: { userId: true },
    });
    // Allow self-update or coordinator/catechist update
    if (catechumen?.userId !== context.user.id) {
      const membership = await context.entities.Membership.findFirst({
        where: { userId: context.user.id, status: MembershipStatus.ACTIVE },
        select: { role: true },
      });
      if (!membership || (!isCoordinatorOrAbove(membership.role) && !isCatechist(membership.role))) {
        // Check personal workspace ownership
        const personal = await context.entities.Parish.findFirst({
          where: { ownerId: context.user.id, type: 'PERSONAL' },
          select: { id: true },
        });
        if (!personal) {
          throw new HttpError(403, 'Apenas coordenadores e catequistas podem editar catequizandos.');
        }
      }
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
