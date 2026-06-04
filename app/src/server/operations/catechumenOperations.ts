import { HttpError } from 'wasp/server';
import { MembershipStatus } from '@prisma/client';

function isCoordinatorOrAbove(role: string): boolean {
  return ['SUPER_ADMIN', 'DIOCESE_ADMIN', 'PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR'].includes(role);
}

function isCatechist(role: string): boolean {
  return ['LEAD_CATECHIST', 'ASSISTANT_CATECHIST'].includes(role);
}

async function getParishIds(context: any): Promise<string[]> {
  const memberships = await context.entities.Membership.findMany({
    where: { userId: context.user.id, status: MembershipStatus.ACTIVE },
    select: { parishId: true },
  });
  return memberships.map((m: any) => m.parishId);
}

export const listCatechumens = async (_args: void, context: any) => {
  if (!context.user) throw new HttpError(401);
  if (context.user.isAdmin) {
    return context.entities.CatechumenProfile.findMany({
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      include: {
        parish: { select: { id: true, name: true } },
        household: { select: { id: true, name: true, parishId: true } },
        enrollments: { include: { class: { select: { id: true, name: true, parishId: true } } } },
      },
    });
  }

  const memberships = await context.entities.Membership.findMany({
    where: { userId: context.user.id, status: MembershipStatus.ACTIVE },
    select: { parishId: true, role: true },
  });

  if (memberships.length === 0) return [];
  const roles = memberships.map((m: any) => m.role);
  const parishIds = memberships.map((m: any) => m.parishId);

  // Coordinator and above: see all catechumens in parish
  if (roles.some((r: string) => isCoordinatorOrAbove(r))) {
    return context.entities.CatechumenProfile.findMany({
      where: {
        OR: [
          { enrollments: { some: { class: { parishId: { in: parishIds } } } } },
          { household: { parishId: { in: parishIds } } },
          { parishId: { in: parishIds } },
        ],
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      include: {
        parish: { select: { id: true, name: true } },
        household: { select: { id: true, name: true, parishId: true } },
        enrollments: { include: { class: { select: { id: true, name: true, parishId: true } } } },
      },
    });
  }

  // Catechist: see catechumens in their classes + parish
  if (roles.some((r: string) => isCatechist(r))) {
    // Get catechumens via class assignments
    const myClasses = await context.entities.ClassCatechist.findMany({
      where: { userId: context.user.id },
      select: { classId: true },
    });
    const classIds = myClasses.map((cc: any) => cc.classId);
    const enrollments = await context.entities.ClassEnrollment.findMany({
      where: { classId: { in: classIds } },
      select: { catechumenProfileId: true },
    });
    const enrolledIds = enrollments.map((e: any) => e.catechumenProfileId);

    return context.entities.CatechumenProfile.findMany({
      where: {
        OR: [
          { id: { in: enrolledIds } },
          { parishId: { in: parishIds } },
          { household: { parishId: { in: parishIds } } },
        ],
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      include: {
        parish: { select: { id: true, name: true } },
        household: { select: { id: true, name: true, parishId: true } },
        enrollments: { include: { class: { select: { id: true, name: true, parishId: true } } } },
      },
    });
  }

  if (roles.includes('GUARDIAN')) {
    const guardian = await context.entities.GuardianProfile.findUnique({ where: { userId: context.user.id } });
    if (guardian?.householdId) {
      return context.entities.CatechumenProfile.findMany({
        where: { householdId: guardian.householdId },
        orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
        include: {
          parish: { select: { id: true, name: true } },
          household: { select: { id: true, name: true, parishId: true } },
          enrollments: { include: { class: { select: { id: true, name: true, parishId: true } } } },
        },
      });
    }
    return [];
  }

  if (roles.includes('CATECHUMEN')) {
    return context.entities.CatechumenProfile.findMany({
      where: { userId: context.user.id },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      include: {
        parish: { select: { id: true, name: true } },
        household: { select: { id: true, name: true, parishId: true } },
        enrollments: { include: { class: { select: { id: true, name: true, parishId: true } } } },
      },
    });
  }

  return [];
};

export const getCatechumenProfile = async (args: { id: string }, context: any) => {
  if (!context.user) throw new HttpError(401);

  if (!context.user.isAdmin) {
    const memberships = await context.entities.Membership.findMany({
      where: { userId: context.user.id, status: MembershipStatus.ACTIVE },
      select: { parishId: true, role: true },
    });
    const roles = memberships.map((m: any) => m.role);
    const parishIds = memberships.map((m: any) => m.parishId);

    // Guardian: check if catechumen is in their household
    if (roles.includes('GUARDIAN')) {
      const guardian = await context.entities.GuardianProfile.findUnique({ where: { userId: context.user.id } });
      const catechumen = await context.entities.CatechumenProfile.findUnique({
        where: { id: args.id },
        select: { householdId: true },
      });
      if (!catechumen || catechumen.householdId !== guardian?.householdId) {
        throw new HttpError(403, 'Você não tem acesso a este catequizando.');
      }
    }
    // CATECHUMEN: only self
    else if (roles.includes('CATECHUMEN')) {
      const catechumen = await context.entities.CatechumenProfile.findUnique({
        where: { id: args.id },
        select: { userId: true },
      });
      if (!catechumen || catechumen.userId !== context.user.id) {
        throw new HttpError(403, 'Você só pode ver seu próprio perfil.');
      }
    }
    // Catechists/Coordinators: check parish access
    else {
      const catechumen = await context.entities.CatechumenProfile.findUnique({
        where: { id: args.id },
        select: {
          userId: true,
          parishId: true,
          enrollments: { select: { class: { select: { parishId: true } } } },
          household: { select: { parishId: true } },
        },
      });
      if (!catechumen) throw new HttpError(404, 'Catequizando não encontrado.');

      const catechumenParishIds = [
        ...catechumen.enrollments.map((e: any) => e.class.parishId),
        catechumen.household?.parishId,
        catechumen.parishId,
      ].filter(Boolean);

      const hasAccess = catechumenParishIds.some((pid: string) => parishIds.includes(pid));
      if (!hasAccess && catechumen.userId !== context.user.id) {
        throw new HttpError(403, 'Você não tem acesso a este catequizando.');
      }
    }
  }

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
    if (!membership || (!isCoordinatorOrAbove(membership.role) && !isCatechist(membership.role))) {
      throw new HttpError(403, 'Apenas coordenadores e catequistas podem criar catequizandos.');
    }
    parishId = membership.parishId;
  } else {
    // Admin: use first active membership parish, or null
    const membership = await context.entities.Membership.findFirst({
      where: { userId: context.user.id, status: MembershipStatus.ACTIVE },
      select: { parishId: true },
      orderBy: { createdAt: 'asc' },
    });
    parishId = membership?.parishId || null;
  }

  return context.entities.CatechumenProfile.create({
    data: {
      firstName: args.firstName, lastName: args.lastName,
      birthDate: args.birthDate ? new Date(args.birthDate) : null,
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
        throw new HttpError(403, 'Apenas coordenadores e catequistas podem editar catequizandos.');
      }
    }
  }

  const { id, ...data } = args;
  return context.entities.CatechumenProfile.update({
    where: { id },
    data: { ...data, birthDate: data.birthDate ? new Date(data.birthDate) : undefined },
  });
};
