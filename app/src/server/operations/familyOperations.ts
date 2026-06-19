import { HttpError } from 'wasp/server';
import { CatechistAssignmentRole } from '@prisma/client';
import { getDioceseParishIds } from '../auth/helpers';

function isCoordinatorOrAbove(role: string): boolean {
  return ['SUPER_ADMIN', 'DIOCESE_ADMIN', 'PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR', 'PERSONAL_OWNER'].includes(role);
}

function isCatechist(role: string): boolean {
  return ['LEAD_CATECHIST', 'ASSISTANT_CATECHIST'].includes(role);
}

async function getParishIds(context: any): Promise<string[]> {
  const memberships = await context.entities.Membership.findMany({
    where: { userId: context.user.id, status: 'ACTIVE' },
    select: { parishId: true, role: true },
  });
  const ids = memberships.map((m: any) => m.parishId);

  // Include personal workspace
  const personal = await context.entities.Parish.findFirst({
    where: { ownerId: context.user.id, type: 'PERSONAL' },
    select: { id: true },
  });
  if (personal && !ids.includes(personal.id)) {
    ids.push(personal.id);
  }

  // DIOCESE_ADMIN: include all parishes in the diocese
  if (memberships.some((m: any) => m.role === 'DIOCESE_ADMIN')) {
    const dioceseParishIds = await getDioceseParishIds(context);
    for (const id of dioceseParishIds) {
      if (!ids.includes(id)) ids.push(id);
    }
  }

  return ids;
}

export const listHouseholds = async (_args: { communityId?: string; take?: number; skip?: number; search?: string } | void, context: any) => {
  const args = _args || {};
  const take = args.take;
  const skip = args.skip || 0;
  const search = args.search?.trim();
  if (!context.user) throw new HttpError(401);

  const includeOpts = {
    guardians: {
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
    },
    catechumens: { select: { id: true, firstName: true, lastName: true } },
    community: { select: { id: true, name: true } },
    _count: { select: { catechumens: true } },
  };

  const buildWhere = (baseWhere: any) => {
    if (!search) return baseWhere;
    return {
      AND: [
        baseWhere,
        { name: { contains: search, mode: 'insensitive' as const } },
      ],
    };
  };

  if (context.user.isAdmin) {
    const whereAdmin: any = {};
    if (args.communityId) whereAdmin.communityId = args.communityId;
    return context.entities.Household.findMany({
      where: buildWhere(whereAdmin),
      orderBy: { name: 'asc' },
      take,
      skip,
      include: includeOpts,
    });
  }

  const parishIds = await getParishIds(context);
  if (parishIds.length === 0) return [];

  // Check user roles for filtering
  const membershipRoles = await context.entities.Membership.findMany({
    where: { userId: context.user.id, status: 'ACTIVE' },
    select: { role: true },
  });
  const roles = membershipRoles.map((m: any) => m.role);

  // Add PERSONAL_OWNER if user has personal workspace
  const personalCheck = await context.entities.Parish.findFirst({
    where: { ownerId: context.user.id, type: 'PERSONAL' },
    select: { id: true },
  });
  if (personalCheck) roles.push('PERSONAL_OWNER');

  // Coordinator or above (including PERSONAL_OWNER): all households in their parishes
  if (roles.some((r: string) => isCoordinatorOrAbove(r))) {
    const where: any = { parishId: { in: parishIds } };
    if (args.communityId) where.communityId = args.communityId;
    return context.entities.Household.findMany({
      where: buildWhere(where),
      orderBy: { name: 'asc' },
      take,
      skip,
      include: includeOpts,
    });
  }

  // GUARDIAN: only return the guardian's own household
  if (roles.includes('GUARDIAN') && !roles.some((r: string) => isCoordinatorOrAbove(r) || isCatechist(r))) {
    const guardianProfile = await context.entities.GuardianProfile.findFirst({
      where: { userId: context.user.id },
      select: { householdId: true },
    });
    if (!guardianProfile?.householdId) return [];
    const where: any = { id: guardianProfile.householdId };
    if (args.communityId) where.communityId = args.communityId;
    return context.entities.Household.findMany({
      where: buildWhere(where),
      orderBy: { name: 'asc' },
      take,
      skip,
      include: includeOpts,
    });
  }

  // Assistant catechist only (no coordinator, no lead): restrict to assisted classes
  const isStrictAssistant = !roles.includes('LEAD_CATECHIST') && roles.includes('ASSISTANT_CATECHIST');

  if (isStrictAssistant) {
    const assistedClasses = await context.entities.ClassCatechist.findMany({
      where: { userId: context.user.id, role: CatechistAssignmentRole.ASSISTANT },
      select: { classId: true },
    });
    const classIds = assistedClasses.map((cc: any) => cc.classId);
    if (classIds.length === 0) return [];

    const enrollments = await context.entities.ClassEnrollment.findMany({
      where: { classId: { in: classIds }, catechumenProfileId: { not: null } },
      select: { catechumenProfileId: true },
    });
    const catechumenIds = [...new Set(enrollments.map((e: any) => e.catechumenProfileId))];
    if (catechumenIds.length === 0) return [];

    const profiles = await context.entities.CatechumenProfile.findMany({
      where: { id: { in: catechumenIds }, householdId: { not: null } },
      select: { householdId: true },
    });
    const householdIds = [...new Set(profiles.map((p: any) => p.householdId))];
    if (householdIds.length === 0) return [];

    const where: any = { id: { in: householdIds } };
    if (args.communityId) where.communityId = args.communityId;
    return context.entities.Household.findMany({
      where: buildWhere(where),
      orderBy: { name: 'asc' },
      take,
      skip,
      include: includeOpts,
    });
  }

  // Lead catechist or general catechetical role: households in their parishes
  if (roles.includes('LEAD_CATECHIST') || roles.includes('ASSISTANT_CATECHIST')) {
    const where: any = { parishId: { in: parishIds } };
    if (args.communityId) where.communityId = args.communityId;
    return context.entities.Household.findMany({
      where: buildWhere(where),
      orderBy: { name: 'asc' },
      take,
      skip,
      include: includeOpts,
    });
  }

  const where: any = { parishId: { in: parishIds } };
  if (args.communityId) where.communityId = args.communityId;
  return context.entities.Household.findMany({
    where: buildWhere(where),
    orderBy: { name: 'asc' },
    take,
    skip,
    include: includeOpts,
  });
};

export const createHousehold = async (
  args: { name: string; address?: string; phone?: string; parishId?: string; communityId?: string },
  context: any
) => {
  if (!context.user) throw new HttpError(401);

  let parishId = args.parishId;
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

  if (!context.user.isAdmin) {
    const membership = await context.entities.Membership.findFirst({
      where: { userId: context.user.id, status: 'ACTIVE' },
      select: { role: true, parishId: true },
    });

    // Check if user is personal workspace owner
    const isPersonalOwner = !membership && await context.entities.Parish.findFirst({
      where: { ownerId: context.user.id, type: 'PERSONAL' },
      select: { id: true },
    });

    if (!membership && !isPersonalOwner) {
      throw new HttpError(403, 'Apenas coordenadores e catequistas podem vincular responsáveis.');
    }

    const role = membership?.role || 'PERSONAL_OWNER';
    if (!isCoordinatorOrAbove(role) && !isCatechist(role)) {
      throw new HttpError(403, 'Apenas coordenadores e catequistas podem vincular responsáveis.');
    }

    // Verify household belongs to user's parish or personal workspace
    const household = await context.entities.Household.findUnique({
      where: { id: args.householdId },
      select: { parishId: true },
    });
    const userParishId = membership?.parishId || (isPersonalOwner ? isPersonalOwner.id : null);
    if (!household || household.parishId !== userParishId) {
      throw new HttpError(403, 'Esta família não pertence à sua paróquia.');
    }
  }

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

  if (!context.user.isAdmin) {
    const membership = await context.entities.Membership.findFirst({
      where: { userId: context.user.id, status: 'ACTIVE' },
      select: { role: true, parishId: true },
    });
    const isPersonalOwner = !membership && await context.entities.Parish.findFirst({
      where: { ownerId: context.user.id, type: 'PERSONAL' },
      select: { id: true },
    });
    if (!membership && !isPersonalOwner) {
      throw new HttpError(403, 'Apenas coordenadores e catequistas podem remover responsáveis.');
    }
    const role = membership?.role || 'PERSONAL_OWNER';
    if (!isCoordinatorOrAbove(role) && !isCatechist(role)) {
      throw new HttpError(403, 'Apenas coordenadores e catequistas podem remover responsáveis.');
    }
    const userParishId = membership?.parishId || (isPersonalOwner ? isPersonalOwner.id : null);
    if (!guardian.household?.parishId || guardian.household.parishId !== userParishId) {
      throw new HttpError(403, 'Esta família não pertence à sua paróquia.');
    }
  }

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

  if (!context.user.isAdmin && !isSelfGuardian) {
    const membership = await context.entities.Membership.findFirst({
      where: { userId: context.user.id, status: 'ACTIVE' },
      select: { role: true, parishId: true },
    });
    const isPersonalOwner = !membership && await context.entities.Parish.findFirst({
      where: { ownerId: context.user.id, type: 'PERSONAL' },
      select: { id: true },
    });
    if (!membership && !isPersonalOwner) {
      throw new HttpError(403, 'Apenas coordenadores e catequistas podem editar responsáveis.');
    }
    const role = membership?.role || 'PERSONAL_OWNER';
    if (!isCoordinatorOrAbove(role) && !isCatechist(role)) {
      throw new HttpError(403, 'Apenas coordenadores e catequistas podem editar responsáveis.');
    }
    const userParishId = membership?.parishId || (isPersonalOwner ? isPersonalOwner.id : null);
    if (!guardian.household?.parishId || guardian.household.parishId !== userParishId) {
      throw new HttpError(403, 'Esta família não pertence à sua paróquia.');
    }
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

  if (!household) throw new HttpError(404, 'Família não encontrada.');

  if (!context.user.isAdmin) {
    const membership = await context.entities.Membership.findFirst({
      where: { userId: context.user.id, status: 'ACTIVE', parishId: household.parishId },
      select: { role: true },
    });
    const isPersonalOwner = !membership && await context.entities.Parish.findFirst({
      where: { id: household.parishId, ownerId: context.user.id, type: 'PERSONAL' },
      select: { id: true },
    });
    if (!membership && !isPersonalOwner) {
      throw new HttpError(403, 'Apenas coordenadores e catequistas podem editar famílias.');
    }
    const role = membership?.role || 'PERSONAL_OWNER';
    if (!isCoordinatorOrAbove(role) && !isCatechist(role)) {
      throw new HttpError(403, 'Apenas coordenadores e catequistas podem editar famílias.');
    }
  }

  return context.entities.Household.update({
    where: { id: args.id },
    data: {
      ...(args.name !== undefined && { name: args.name }),
      ...(args.address !== undefined && { address: args.address }),
      ...(args.phone !== undefined && { phone: args.phone }),
    },
  });
};
