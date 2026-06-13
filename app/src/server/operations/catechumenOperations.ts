import { HttpError } from 'wasp/server';
import { MembershipStatus, CatechistAssignmentRole } from '@prisma/client';
import { assertCanAccessCatechumenProfile } from '../auth/helpers';
import { resolveUserScope, isCoordinatorOrAbove, isCatechist } from './sharedScope';

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

  const { parishIds, roles } = await resolveUserScope(context);

  if (parishIds.length === 0) return [];

  // Coordinator and above (including PERSONAL_OWNER): see all catechumens in parish
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

  // Lead catechist: only catechumens enrolled in their assigned classes
  if (roles.includes('LEAD_CATECHIST')) {
    const myClasses = await context.entities.ClassCatechist.findMany({
      where: { userId: context.user.id },
      select: { classId: true },
    });
    const classIds = myClasses.map((cc: any) => cc.classId);
    if (classIds.length === 0) return [];

    const enrollments = await context.entities.ClassEnrollment.findMany({
      where: { classId: { in: classIds } },
      select: { catechumenProfileId: true },
    });
    const enrolledIds = enrollments.map((e: any) => e.catechumenProfileId);
    if (enrolledIds.length === 0) return [];

    return context.entities.CatechumenProfile.findMany({
      where: { id: { in: enrolledIds } },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      include: {
        parish: { select: { id: true, name: true } },
        household: { select: { id: true, name: true, parishId: true } },
        enrollments: { include: { class: { select: { id: true, name: true, parishId: true } } } },
      },
    });
  }

  // Assistant catechist: only see catechumens enrolled in their assigned classes
  if (roles.includes('ASSISTANT_CATECHIST')) {
    const myClasses = await context.entities.ClassCatechist.findMany({
      where: { userId: context.user.id, role: CatechistAssignmentRole.ASSISTANT },
      select: { classId: true },
    });
    const classIds = myClasses.map((cc: any) => cc.classId);
    if (classIds.length === 0) return [];
    const enrollments = await context.entities.ClassEnrollment.findMany({
      where: { classId: { in: classIds } },
      select: { catechumenProfileId: true },
    });
    const enrolledIds = enrollments.map((e: any) => e.catechumenProfileId);

    return context.entities.CatechumenProfile.findMany({
      where: { id: { in: enrolledIds } },
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
    data: { ...data, birthDate: data.birthDate ? new Date(data.birthDate) : undefined },
  });
};
