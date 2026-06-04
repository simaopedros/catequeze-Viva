import { HttpError } from 'wasp/server';
import { createMessageCampaignSchema } from '../validation';
import { requireAuth, getUserMembership, requireParishRole } from '../auth/helpers';

// listCatecheticalYears — escopo por paróquia
export const listCatecheticalYears = async (_args: void, context: any) => {
  requireAuth(context.user);

  if (context.user.isAdmin) {
    return context.entities.CatecheticalYear.findMany({ orderBy: { startDate: 'desc' } });
  }

  const memberships = await context.entities.Membership.findMany({
    where: { userId: context.user.id, status: 'ACTIVE' },
    select: { parishId: true },
  });

  if (memberships.length === 0) return [];

  return context.entities.CatecheticalYear.findMany({
    where: { parishId: { in: memberships.map((m: any) => m.parishId) } },
    orderBy: { startDate: 'desc' },
  });
};

// listMessageCampaigns — escopo por paróquia ou remetente


// createCatecheticalYear
export const createCatecheticalYear = async (
  args: { name: string; startDate: string; endDate: string; parishId?: string },
  context: any
) => {
  requireAuth(context.user);

  let parishId = args.parishId;
  if (!parishId) {
    const membership = await context.entities.Membership.findFirst({
      where: { userId: context.user.id, status: 'ACTIVE' },
      select: { parishId: true },
    });
    if (!membership && !context.user.isAdmin) {
      throw new HttpError(400, 'Você não está vinculado a nenhuma paróquia.');
    }
    parishId = membership?.parishId;
  }

  return context.entities.CatecheticalYear.create({
    data: {
      name: args.name,
      startDate: new Date(args.startDate),
      endDate: new Date(args.endDate),
      parishId: parishId || undefined,
    },
  });
};
export const listMessageCampaigns = async (_args: void, context: any) => {
  requireAuth(context.user);

  if (context.user.isAdmin) {
    return context.entities.MessageCampaign.findMany({ orderBy: { createdAt: 'desc' }, take: 20 });
  }

  const memberships = await context.entities.Membership.findMany({
    where: { userId: context.user.id, status: 'ACTIVE' },
    select: { parishId: true },
  });

  if (memberships.length === 0) return [];

  return context.entities.MessageCampaign.findMany({
    where: {
      OR: [
        { parishId: { in: memberships.map((m: any) => m.parishId) } },
        { createdById: context.user.id },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
};

// createMessageCampaign
export const createMessageCampaign = async (
  args: { title: string; body: string; channel: string; segment: string; parishId?: string },
  context: any
) => {
  requireAuth(context.user);

  let parishId = args.parishId;
  if (!parishId) {
    const membership = await context.entities.Membership.findFirst({
      where: { userId: context.user.id, status: 'ACTIVE' },
      select: { parishId: true, role: true },
    });
    if (!membership && !context.user.isAdmin) {
      throw new HttpError(400, 'Você não está vinculado a nenhuma paróquia.');
    }
    parishId = membership?.parishId;
  }

  return context.entities.MessageCampaign.create({
    data: {
      title: args.title,
      body: args.body,
      channel: args.channel || 'email',
      segment: args.segment || 'all_parish',
      status: 'DRAFT',
      createdById: context.user.id,
      parishId: parishId || undefined,
    },
  });
};

// exportReport (server-side CSV generation) — escopo por paróquia
export const exportReport = async (_args: void, context: any) => {
  requireAuth(context.user);

  let whereClause: any = { status: 'ACTIVE' };
  if (!context.user.isAdmin) {
    const memberships = await context.entities.Membership.findMany({
      where: { userId: context.user.id, status: 'ACTIVE' },
      select: { parishId: true },
    });
    if (memberships.length === 0) return [];
    whereClause.parishId = { in: memberships.map((m: any) => m.parishId) };
  }

  const reports = await context.entities.CatechesisClass.findMany({
    where: whereClause,
    select: { id: true, name: true, _count: { select: { enrollments: true } } },
  });
  return reports;
};

// getSacramentalJourney — verificar acesso ao catequizando
export const getSacramentalJourney = async (args: { id: string }, context: any) => {
  requireAuth(context.user);

  const journey = await context.entities.SacramentalJourney.findUnique({
    where: { id: args.id },
    include: {
      catechumenProfile: { select: { id: true, firstName: true, lastName: true, householdId: true } },
      template: true,
      milestones: {
        include: { templateMilestone: true },
        orderBy: { templateMilestone: { order: 'asc' } },
      },
    },
  });

  if (!journey) throw new HttpError(404, 'Jornada não encontrada.');

  // Admin vê tudo
  if (context.user.isAdmin) return journey;

  // Verificar se o usuário pertence à mesma paróquia ou é responsável pelo catequizando
  const memberships = await context.entities.Membership.findMany({
    where: { userId: context.user.id, status: 'ACTIVE' },
    select: { parishId: true, role: true },
  });

  const roles = memberships.map((m: any) => m.role);

  // Coordenadores veem jornadas da sua paróquia
  if (roles.some((r: string) => ['PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR'].includes(r))) {
    // Verificar se o catequizando pertence a uma turma da mesma paróquia
    const catechumenClasses = await context.entities.ClassEnrollment.findMany({
      where: { catechumenProfileId: journey.catechumenProfile.id },
      select: { class: { select: { parishId: true } } },
    });
    const parishIds = memberships.map((m: any) => m.parishId);
    if (catechumenClasses.some((e: any) => parishIds.includes(e.class.parishId))) {
      return journey;
    }
  }

  // Responsável vê jornadas dos seus dependentes
  if (roles.includes('GUARDIAN')) {
    const guardian = await context.entities.GuardianProfile.findUnique({ where: { userId: context.user.id } });
    if (guardian?.householdId && guardian.householdId === journey.catechumenProfile.householdId) {
      return journey;
    }
  }

  // Catequista vê jornadas dos alunos da sua turma
  if (roles.includes('LEAD_CATECHIST') || roles.includes('ASSISTANT_CATECHIST')) {
    const myClasses = await context.entities.ClassCatechist.findMany({
      where: { userId: context.user.id },
      select: { classId: true },
    });
    const classIds = myClasses.map((cc: any) => cc.classId);
    const enrollment = await context.entities.ClassEnrollment.findFirst({
      where: {
        catechumenProfileId: journey.catechumenProfile.id,
        classId: { in: classIds },
      },
    });
    if (enrollment) return journey;
  }

  // Catequizando vê a própria jornada
  if (roles.includes('CATECHUMEN')) {
    const catechumen = await context.entities.CatechumenProfile.findFirst({
      where: { userId: context.user.id },
    });
    if (catechumen?.id === journey.catechumenProfile.id) return journey;
  }

  throw new HttpError(403, 'Acesso negado a esta jornada sacramental.');
};

// updateLocalePreference
export const updateLocalePreference = async (
  args: { locale: string; timezone: string },
  context: any
) => {
  requireAuth(context.user);
  return context.entities.User.update({
    where: { id: context.user.id },
    data: { locale: args.locale, timezone: args.timezone },
  });
};
