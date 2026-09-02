import { HttpError } from 'wasp/server';
import { requireWorkspaceAccess } from './sharedScope';
import {
  emptyPage,
  mergeWhere,
  nameIdCursorWhere,
  pageParams,
  wrapNameIdPage,
} from './listCursor';

/**
 * Coordinators and catechists may manage a household only inside the household's
 * own workspace. The role is resolved for that workspace alone (never merged).
 */
async function assertCanManageHousehold(
  context: any,
  household: { parishId: string | null } | null,
  deniedMessage: string,
): Promise<void> {
  if (!household) throw new HttpError(404, 'Família não encontrada.');
  if (context.user.isAdmin) return;
  if (!household.parishId) throw new HttpError(403, 'Esta família não pertence à sua paróquia.');

  const access = await requireWorkspaceAccess(context, household.parishId).catch(() => {
    throw new HttpError(403, 'Esta família não pertence à sua paróquia.');
  });
  if (!access.isCoordinatorOrAbove && !access.isCatechist) {
    throw new HttpError(403, deniedMessage);
  }
}

/** Returns array (legacy) or { items, nextCursor } when paginated/cursor. */
export const listHouseholds = async (
  _args:
    | {
        communityId?: string;
        /** When set, scope results to this workspace (must be in user's accessible parishes). */
        parishId?: string;
        workspaceId?: string;
        take?: number;
        skip?: number;
        search?: string;
        cursor?: string | null;
        paginated?: boolean;
      }
    | void,
  context: any,
): Promise<any> => {
  const args = _args || {};
  const { useCursorPage, pageSize, take, skip } = pageParams(args);
  const search = args.search?.trim();
  const requestedParishId =
    args.parishId?.trim() || args.workspaceId?.trim() || undefined;
  if (!context.user) throw new HttpError(401);

  // Family-only users: only their own household(s), never parish directory.
  const { rolesAreFamilyOnly, loadActiveRoles } = await import(
    '../auth/familySurface'
  );
  const roles = await loadActiveRoles(context);
  if (rolesAreFamilyOnly(roles)) {
    const guardians = await context.entities.GuardianProfile.findMany({
      where: { userId: context.user.id },
      select: { householdId: true },
    });
    const ids = guardians
      .map((g: { householdId: string | null }) => g.householdId)
      .filter(Boolean) as string[];
    if (ids.length === 0) return emptyPage(useCursorPage);
    const rows = await context.entities.Household.findMany({
      where: mergeWhere(
        { id: { in: ids } },
        nameIdCursorWhere(args.cursor),
      ),
      include: {
        guardians: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        catechumens: {
          select: { id: true, firstName: true, lastName: true },
        },
        community: { select: { id: true, name: true } },
        _count: { select: { catechumens: true } },
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      take,
    });
    return wrapNameIdPage(rows, pageSize, useCursorPage);
  }

  const includeOpts = {
    guardians: {
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    },
    catechumens: { select: { id: true, firstName: true, lastName: true } },
    community: { select: { id: true, name: true } },
    _count: { select: { catechumens: true } },
  };

  const buildWhere = (baseWhere: any) => {
    let where = mergeWhere(baseWhere, nameIdCursorWhere(args.cursor));
    if (!search) return where;
    return {
      AND: [
        where,
        { name: { contains: search, mode: 'insensitive' as const } },
      ],
    };
  };

  if (context.user.isAdmin && !requestedParishId) {
    const whereAdmin: any = {};
    if (args.communityId) whereAdmin.communityId = args.communityId;
    const rows = await context.entities.Household.findMany({
      where: buildWhere(whereAdmin),
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      take,
      skip,
      include: includeOpts,
    });
    return wrapNameIdPage(rows, pageSize, useCursorPage);
  }

  if (!requestedParishId) return emptyPage(useCursorPage);

  const access = await requireWorkspaceAccess(context, requestedParishId);
  const parishId = access.workspaceId;
  const extra: any = { parishId };
  if (args.communityId) extra.communityId = args.communityId;

  // Coordinator / pastoral: all households in this workspace only
  if (access.isCoordinatorOrAbove || access.role === 'PASTORAL_VIEWER') {
    // Scoped community coordinator (vice): households of the community or of
    // catechumens enrolled in the classes under their responsibility.
    const scopedWhere =
      access.isScopedCoordinator && access.allowedClassIds !== 'ALL'
        ? {
            OR: [
              ...(access.communityId ? [{ communityId: access.communityId }] : []),
              {
                catechumens: {
                  some: {
                    enrollments: {
                      some: { classId: { in: access.allowedClassIds } },
                    },
                  },
                },
              },
            ],
          }
        : {};
    const rows = await context.entities.Household.findMany({
      where: buildWhere({ ...extra, ...scopedWhere }),
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      take,
      skip,
      include: includeOpts,
    });
    return wrapNameIdPage(rows, pageSize, useCursorPage);
  }

  // GUARDIAN: only own household
  if (access.role === 'GUARDIAN') {
    const guardianProfile = await context.entities.GuardianProfile.findFirst({
      where: { userId: context.user.id },
      select: { householdId: true },
    });
    if (!guardianProfile?.householdId) return emptyPage(useCursorPage);
    const where: any = { id: guardianProfile.householdId, parishId };
    if (args.communityId) where.communityId = args.communityId;
    const rows = await context.entities.Household.findMany({
      where: buildWhere(where),
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      take,
      skip,
      include: includeOpts,
    });
    return wrapNameIdPage(rows, pageSize, useCursorPage);
  }

  // Catechist: households of catechumens in allowed classes only (not whole parish)
  if (access.isCatechist) {
    const classIds =
      access.allowedClassIds === 'ALL' ? [] : access.allowedClassIds;
    if (classIds.length === 0) return emptyPage(useCursorPage);

    const enrollments = await context.entities.ClassEnrollment.findMany({
      where: { classId: { in: classIds }, catechumenProfileId: { not: null } },
      select: { catechumenProfileId: true },
    });
    const catechumenIds = [
      ...new Set(
        enrollments.map((e: any) => e.catechumenProfileId).filter(Boolean),
      ),
    ];
    if (catechumenIds.length === 0) return emptyPage(useCursorPage);

    const profiles = await context.entities.CatechumenProfile.findMany({
      where: { id: { in: catechumenIds }, householdId: { not: null } },
      select: { householdId: true },
    });
    const householdIds = [
      ...new Set(profiles.map((p: any) => p.householdId).filter(Boolean)),
    ];
    if (householdIds.length === 0) return emptyPage(useCursorPage);

    const where: any = { id: { in: householdIds }, parishId };
    if (args.communityId) where.communityId = args.communityId;
    const rows = await context.entities.Household.findMany({
      where: buildWhere(where),
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      take,
      skip,
      include: includeOpts,
    });
    return wrapNameIdPage(rows, pageSize, useCursorPage);
  }

  return emptyPage(useCursorPage);
};

export const createHousehold = async (
  args: { name: string; address?: string; phone?: string; parishId?: string; communityId?: string },
  context: any
) => {
  if (!context.user) throw new HttpError(401);

  let parishId = args.parishId?.trim() || undefined;
  if (!parishId && !context.user.isAdmin) {
    const membership = await context.entities.Membership.findFirst({
      where: { userId: context.user.id, status: 'ACTIVE' },
      select: { parishId: true },
    });
    parishId = membership?.parishId;

    // Fallback to personal workspace
    if (!parishId) {
      const personal = await context.entities.Parish.findFirst({
        where: { ownerId: context.user.id, type: 'PERSONAL' },
        select: { id: true },
      });
      if (personal) parishId = personal.id;
    }
  }

  if (!parishId && !context.user.isAdmin) {
    throw new HttpError(400, 'É necessário especificar uma paróquia para criar a família.');
  }

  if (parishId && !context.user.isAdmin) {
    const access = await requireWorkspaceAccess(context, parishId);
    if (!access.isCoordinatorOrAbove && !access.isCatechist && access.role !== 'PERSONAL_OWNER') {
      throw new HttpError(403, 'Apenas coordenadores e catequistas podem criar famílias neste workspace.');
    }
  }

  // Validate communityId belongs to the same parish if provided
  if (args.communityId && parishId) {
    const community = await context.entities.Community.findUnique({
      where: { id: args.communityId },
      select: { parishId: true },
    });
    if (!community || community.parishId !== parishId) {
      throw new HttpError(400, 'A comunidade não pertence à mesma paróquia.');
    }
  }

  return context.entities.Household.create({
    data: {
      name: args.name,
      address: args.address,
      phone: args.phone,
      parishId: parishId || null,
      communityId: args.communityId || null,
    },
  });
};

export const addGuardianToHousehold = async (
  args: { userId?: string; householdId: string; firstName?: string; lastName?: string; email?: string; relationship?: string; phone?: string },
  context: any
) => {
  if (!context.user) throw new HttpError(401);

  // At least one of userId or firstName must be provided
  if (!args.userId && !args.firstName) {
    throw new HttpError(400, 'É necessário informar um usuário ou um nome.');
  }

  const household = await context.entities.Household.findUnique({
    where: { id: args.householdId },
    select: { parishId: true },
  });
  await assertCanManageHousehold(
    context,
    household,
    'Apenas coordenadores e catequistas podem vincular responsáveis.',
  );

  // If userId provided, check for existing guardian by userId + householdId (no-op)
  if (args.userId) {
    const existingInHousehold = await context.entities.GuardianProfile.findFirst({
      where: { userId: args.userId, householdId: args.householdId },
    });
    if (existingInHousehold) {
      if (args.relationship !== undefined || args.phone !== undefined || args.email !== undefined) {
        return context.entities.GuardianProfile.update({
          where: { id: existingInHousehold.id },
          data: {
            ...(args.relationship !== undefined && { relationship: args.relationship }),
            ...(args.phone !== undefined && { phone: args.phone }),
            ...(args.email !== undefined && { email: args.email }),
          },
        });
      }
      return existingInHousehold;
    }

    const existing = await context.entities.GuardianProfile.findFirst({
      where: { userId: args.userId },
    });

    if (existing) {
      return context.entities.GuardianProfile.update({
        where: { id: existing.id },
        data: {
          householdId: args.householdId,
          ...(args.relationship !== undefined && { relationship: args.relationship }),
          ...(args.phone !== undefined && { phone: args.phone }),
          ...(args.email !== undefined && { email: args.email }),
        },
      });
    }
  }

  // If email provided but no userId, check for existing guardian by email in same household
  if (!args.userId && args.email) {
    const existingByEmail = await context.entities.GuardianProfile.findFirst({
      where: { email: args.email, householdId: args.householdId },
    });
    if (existingByEmail) {
      return context.entities.GuardianProfile.update({
        where: { id: existingByEmail.id },
        data: {
          ...(args.firstName !== undefined && { firstName: args.firstName }),
          ...(args.lastName !== undefined && { lastName: args.lastName }),
          ...(args.relationship !== undefined && { relationship: args.relationship }),
          ...(args.phone !== undefined && { phone: args.phone }),
        },
      });
    }
  }

  return context.entities.GuardianProfile.create({
    data: {
      userId: args.userId || null,
      email: args.email,
      firstName: args.firstName,
      lastName: args.lastName,
      householdId: args.householdId,
      relationship: args.relationship,
      phone: args.phone,
    },
  });
};

export const removeGuardianFromHousehold = async (
  args: { guardianProfileId: string },
  context: any
) => {
  if (!context.user) throw new HttpError(401);

  const guardian = await context.entities.GuardianProfile.findUnique({
    where: { id: args.guardianProfileId },
    select: { id: true, householdId: true, household: { select: { parishId: true } } },
  });

  if (!guardian) throw new HttpError(404, 'Responsável não encontrado.');

  await assertCanManageHousehold(
    context,
    guardian.household ?? { parishId: null },
    'Apenas coordenadores e catequistas podem remover responsáveis.',
  );

  return context.entities.GuardianProfile.update({
    where: { id: args.guardianProfileId },
    data: { householdId: null },
  });
};

export const updateGuardianProfile = async (
  args: { guardianProfileId: string; firstName?: string; lastName?: string; relationship?: string; phone?: string },
  context: any
) => {
  if (!context.user) throw new HttpError(401);

  const guardian = await context.entities.GuardianProfile.findUnique({
    where: { id: args.guardianProfileId },
    select: { id: true, userId: true, household: { select: { parishId: true } } },
  });

  if (!guardian) throw new HttpError(404, 'Responsável não encontrado.');

  // Allow guardians to edit their own profile (phone, relationship only)
  const isSelfGuardian = guardian.userId === context.user.id;

  if (!isSelfGuardian) {
    await assertCanManageHousehold(
      context,
      guardian.household ?? { parishId: null },
      'Apenas coordenadores e catequistas podem editar responsáveis.',
    );
  }

  const data: any = {};
  // Self-guardian can only edit phone and relationship, not names
  if (!guardian.userId || isSelfGuardian) {
    if (args.firstName !== undefined && !isSelfGuardian) data.firstName = args.firstName;
    if (args.lastName !== undefined && !isSelfGuardian) data.lastName = args.lastName;
  }
  if (args.relationship !== undefined) data.relationship = args.relationship;
  if (args.phone !== undefined) data.phone = args.phone;

  return context.entities.GuardianProfile.update({
    where: { id: args.guardianProfileId },
    data,
  });
};

export const updateHousehold = async (
  args: { id: string; name?: string; address?: string; phone?: string },
  context: any
) => {
  if (!context.user) throw new HttpError(401);

  const household = await context.entities.Household.findUnique({
    where: { id: args.id },
    select: { parishId: true },
  });

  await assertCanManageHousehold(
    context,
    household,
    'Apenas coordenadores e catequistas podem editar famílias.',
  );

  return context.entities.Household.update({
    where: { id: args.id },
    data: {
      ...(args.name !== undefined && { name: args.name }),
      ...(args.address !== undefined && { address: args.address }),
      ...(args.phone !== undefined && { phone: args.phone }),
    },
  });
};
