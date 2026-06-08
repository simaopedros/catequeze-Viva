import { HttpError } from 'wasp/server';
import { createMessageCampaignSchema } from '../validation';
import { requireAuth, getUserMembership, requireParishRole, getDioceseParishIds } from '../auth/helpers';

/** Build parishId list from memberships + diocese expansion */
async function getEffectiveParishIds(context: any): Promise<string[]> {
  const memberships = await context.entities.Membership.findMany({
    where: { userId: context.user.id, status: 'ACTIVE' },
    select: { parishId: true, role: true },
  });
  const ids = memberships.map((m: any) => m.parishId);

  if (memberships.some((m: any) => m.role === 'DIOCESE_ADMIN')) {
    const dioceseParishIds = await getDioceseParishIds(context);
    for (const id of dioceseParishIds) {
      if (!ids.includes(id)) ids.push(id);
    }
  }

  return ids;
}

// listCatecheticalYears — escopo por paróquia
export const listCatecheticalYears = async (_args: void, context: any) => {
  requireAuth(context.user);

  if (context.user.isAdmin) {
    return context.entities.CatecheticalYear.findMany({ orderBy: { startDate: 'desc' } });
  }

  const parishIds = await getEffectiveParishIds(context);
  if (parishIds.length === 0) return [];

  return context.entities.CatecheticalYear.findMany({
    where: { parishId: { in: parishIds } },
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

  const parishIds = await getEffectiveParishIds(context);
  if (parishIds.length === 0) return [];

  return context.entities.MessageCampaign.findMany({
    where: {
      OR: [
        { parishId: { in: parishIds } },
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
    const parishIds = await getEffectiveParishIds(context);
    if (parishIds.length === 0) return [];
    whereClause.parishId = { in: parishIds };
  }

  const reports = await context.entities.CatechesisClass.findMany({
    where: whereClause,
    select: { id: true, name: true, _count: { select: { enrollments: true } } },
  });
  return reports;
};

// getSacramentalJourney movido para sacramentOperations.ts

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
