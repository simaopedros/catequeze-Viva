import { HttpError } from 'wasp/server';

function isCoordinatorOrAbove(role: string): boolean {
  return ['SUPER_ADMIN', 'DIOCESE_ADMIN', 'PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR'].includes(role);
}

function isCatechist(role: string): boolean {
  return ['LEAD_CATECHIST', 'ASSISTANT_CATECHIST'].includes(role);
}

async function getParishIds(context: any): Promise<string[]> {
  const memberships = await context.entities.Membership.findMany({
    where: { userId: context.user.id, status: 'ACTIVE' },
    select: { parishId: true },
  });
  return memberships.map((m: any) => m.parishId);
}

export const listHouseholds = async (_args: { communityId?: string } | void, context: any) => {
  const args = _args || {};
  if (!context.user) throw new HttpError(401);

  const includeOpts = {
    guardians: {
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
    },
    catechumens: { select: { id: true, firstName: true, lastName: true } },
    community: { select: { id: true, name: true } },
    _count: { select: { catechumens: true } },
  };

  if (context.user.isAdmin) {
    const whereAdmin: any = {};
    if (args.communityId) whereAdmin.communityId = args.communityId;
    return context.entities.Household.findMany({
      where: whereAdmin,
      orderBy: { name: 'asc' },
      include: includeOpts,
    });
  }

  const parishIds = await getParishIds(context);
  if (parishIds.length === 0) return [];

  const where: any = { parishId: { in: parishIds } };
  if (args.communityId) where.communityId = args.communityId;
  return context.entities.Household.findMany({
    where,
    orderBy: { name: 'asc' },
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
  }

  if (!parishId && !context.user.isAdmin) {
    throw new HttpError(400, 'Você não está vinculado a nenhuma paróquia.');
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
  args: { userId?: string; householdId: string; firstName?: string; lastName?: string; relationship?: string; phone?: string },
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
    if (!membership || (!isCoordinatorOrAbove(membership.role) && !isCatechist(membership.role))) {
      throw new HttpError(403, 'Apenas coordenadores e catequistas podem vincular responsáveis.');
    }
    // Verify household belongs to user's parish
    const household = await context.entities.Household.findUnique({
      where: { id: args.householdId },
      select: { parishId: true },
    });
    if (!household || household.parishId !== membership.parishId) {
      throw new HttpError(403, 'Esta família não pertence à sua paróquia.');
    }
  }

  // If userId provided, check for existing guardian by userId + householdId (no-op)
  if (args.userId) {
    const existingInHousehold = await context.entities.GuardianProfile.findFirst({
      where: { userId: args.userId, householdId: args.householdId },
    });
    if (existingInHousehold) {
      // Already linked — update relationship/phone if provided
      if (args.relationship !== undefined || args.phone !== undefined) {
        return context.entities.GuardianProfile.update({
          where: { id: existingInHousehold.id },
          data: {
            ...(args.relationship !== undefined && { relationship: args.relationship }),
            ...(args.phone !== undefined && { phone: args.phone }),
          },
        });
      }
      return existingInHousehold;
    }

    // Check if user is guardian of another household (reassign)
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
        },
      });
    }
  }

  // Create new guardian (with or without userId)
  return context.entities.GuardianProfile.create({
    data: {
      userId: args.userId || null,
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
    if (!membership || (!isCoordinatorOrAbove(membership.role) && !isCatechist(membership.role))) {
      throw new HttpError(403, 'Apenas coordenadores e catequistas podem remover responsáveis.');
    }
    // Verify household belongs to user's parish
    if (!guardian.household?.parishId || guardian.household.parishId !== membership.parishId) {
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

  if (!context.user.isAdmin) {
    const membership = await context.entities.Membership.findFirst({
      where: { userId: context.user.id, status: 'ACTIVE' },
      select: { role: true, parishId: true },
    });
    if (!membership || (!isCoordinatorOrAbove(membership.role) && !isCatechist(membership.role))) {
      throw new HttpError(403, 'Apenas coordenadores e catequistas podem editar responsáveis.');
    }
    // Verify guardian's household belongs to user's parish
    if (!guardian.household?.parishId || guardian.household.parishId !== membership.parishId) {
      throw new HttpError(403, 'Esta família não pertence à sua paróquia.');
    }
  }

  const data: any = {};
  // Only allow editing firstName/lastName for guardians without a linked user
  if (!guardian.userId) {
    if (args.firstName !== undefined) data.firstName = args.firstName;
    if (args.lastName !== undefined) data.lastName = args.lastName;
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
    if (!membership || (!isCoordinatorOrAbove(membership.role) && !isCatechist(membership.role))) {
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
