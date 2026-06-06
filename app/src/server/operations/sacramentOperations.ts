import { HttpError } from 'wasp/server';

export const listSacramentalJourneys = async (_args: void, context: any) => {
  if (!context.user) throw new HttpError(401);

  const baseInclude = {
    catechumenProfile: { select: { id: true, firstName: true, lastName: true } },
    template: { select: { id: true, name: true } },
    milestones: {
      include: { templateMilestone: { select: { id: true, name: true, required: true, order: true } } },
      orderBy: { templateMilestone: { order: 'asc' } },
    },
  };

  if (context.user.isAdmin) {
    return context.entities.SacramentalJourney.findMany({ include: baseInclude });
  }

  const memberships = await context.entities.Membership.findMany({
    where: { userId: context.user.id, status: 'ACTIVE' },
    select: { parishId: true, role: true },
  });
  if (memberships.length === 0) return [];

  const parishIds = memberships.map((m: any) => m.parishId);
  const roles = memberships.map((m: any) => m.role);

  // Coordinator and above: see all journeys in their parishes
  if (roles.some((r: string) => ['SUPER_ADMIN', 'DIOCESE_ADMIN', 'PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR'].includes(r))) {
    return context.entities.SacramentalJourney.findMany({
      where: {
        catechumenProfile: {
          enrollments: { some: { class: { parishId: { in: parishIds } } } },
        },
      },
      include: baseInclude,
    });
  }

  // Catechist: see journeys of their students
  if (roles.includes('LEAD_CATECHIST') || roles.includes('ASSISTANT_CATECHIST')) {
    const myClasses = await context.entities.ClassCatechist.findMany({
      where: { userId: context.user.id },
      select: { classId: true },
    });
    const classIds = myClasses.map((cc: any) => cc.classId);
    const enrollments = await context.entities.ClassEnrollment.findMany({
      where: { classId: { in: classIds } },
      select: { catechumenProfileId: true },
    });
    const catechumenIds = enrollments.map((e: any) => e.catechumenProfileId);
    return context.entities.SacramentalJourney.findMany({
      where: { catechumenProfileId: { in: catechumenIds } },
      include: baseInclude,
    });
  }

  if (roles.includes('GUARDIAN')) {
    const guardian = await context.entities.GuardianProfile.findUnique({ where: { userId: context.user.id } });
    if (!guardian?.householdId) return [];
    const dependents = await context.entities.CatechumenProfile.findMany({
      where: { householdId: guardian.householdId },
      select: { id: true },
    });
    const dependentIds = dependents.map((d: any) => d.id);
    return context.entities.SacramentalJourney.findMany({
      where: { catechumenProfileId: { in: dependentIds } },
      include: baseInclude,
    });
  }

  if (roles.includes('CATECHUMEN')) {
    const catechumen = await context.entities.CatechumenProfile.findFirst({
      where: { userId: context.user.id },
      select: { id: true },
    });
    if (!catechumen) return [];
    return context.entities.SacramentalJourney.findMany({
      where: { catechumenProfileId: catechumen.id },
      include: baseInclude,
    });
  }

  return [];
};

export const createSacramentalJourney = async (
  args: { catechumenProfileId: string; templateId: string },
  context: any
) => {
  if (!context.user) throw new HttpError(401);

  // Validate template exists
  const template = await context.entities.SacramentalJourneyTemplate.findUnique({
    where: { id: args.templateId },
  });
  if (!template) throw new HttpError(404, 'Modelo de jornada não encontrado.');

  // Verify the catechumen belongs to user's parish
  if (!context.user.isAdmin) {
    const membership = await context.entities.Membership.findFirst({
      where: { userId: context.user.id, status: 'ACTIVE' },
      select: { role: true, parishId: true },
    });
    if (!membership || !['SUPER_ADMIN', 'DIOCESE_ADMIN', 'PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR'].includes(membership.role)) {
      throw new HttpError(403, 'Apenas coordenadores podem criar jornadas sacramentais.');
    }

    // Verify catechumen is in the user's parish
    const catechumen = await context.entities.CatechumenProfile.findUnique({
      where: { id: args.catechumenProfileId },
      select: {
        enrollments: { select: { class: { select: { parishId: true } } } },
        household: { select: { parishId: true } },
      },
    });
    if (!catechumen) throw new HttpError(404, 'Catequizando não encontrado.');

    const catechumenParishIds = [
      ...catechumen.enrollments.map((e: any) => e.class.parishId),
      catechumen.household?.parishId,
    ].filter(Boolean);

    if (!catechumenParishIds.includes(membership.parishId)) {
      throw new HttpError(403, 'Este catequizando não pertence à sua paróquia.');
    }
  }

  const journey = await context.entities.SacramentalJourney.create({
    data: { catechumenProfileId: args.catechumenProfileId, templateId: args.templateId },
  });

  const templateMilestones = await context.entities.SacramentalMilestoneTemplate.findMany({
    where: { templateId: args.templateId },
    orderBy: { order: 'asc' },
  });

  for (const tm of templateMilestones) {
    await context.entities.SacramentalMilestone.create({
      data: { journeyId: journey.id, templateMilestoneId: tm.id, status: 'PENDING' },
    });
  }

  return journey;
};

export const updateMilestoneStatus = async (
  args: { milestoneId: string; status: string; notes?: string },
  context: any
) => {
  if (!context.user) throw new HttpError(401);

  if (!context.user.isAdmin) {
    const membership = await context.entities.Membership.findFirst({
      where: { userId: context.user.id, status: 'ACTIVE' },
      select: { role: true },
    });
    if (!membership || !['SUPER_ADMIN', 'DIOCESE_ADMIN', 'PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR'].includes(membership.role)) {
      throw new HttpError(403, 'Apenas coordenadores podem atualizar marcos sacramentais.');
    }
  }

  const data: any = { status: args.status };
  if (args.status === 'COMPLETED') data.completedAt = new Date();
  if (args.notes) data.notes = args.notes;

  return context.entities.SacramentalMilestone.update({ where: { id: args.milestoneId }, data });
};

export const listJourneyTemplates = async (_args: void, context: any) => {
  if (!context.user) throw new HttpError(401);

  if (context.user.isAdmin) {
    return context.entities.SacramentalJourneyTemplate.findMany({
      include: { milestones: { orderBy: { order: 'asc' } } },
    });
  }

  const memberships = await context.entities.Membership.findMany({
    where: { userId: context.user.id, status: 'ACTIVE' },
    select: { parishId: true },
  });
  if (memberships.length === 0) return [];

  const parishIds = memberships.map((m: any) => m.parishId);
  const parishes = await context.entities.Parish.findMany({
    where: { id: { in: parishIds } },
    select: { dioceseId: true },
  });
  const dioceseIds = [...new Set(parishes.map((p: any) => p.dioceseId).filter(Boolean))];

  return context.entities.SacramentalJourneyTemplate.findMany({
    where: {
      OR: [
        { parishId: { in: parishIds } },
        { parish: { dioceseId: { in: dioceseIds } } },
        { parishId: null },
      ],
    },
    include: { milestones: { orderBy: { order: 'asc' } } },
  });
};
