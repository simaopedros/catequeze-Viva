import { HttpError } from 'wasp/server';
import { getDioceseParishIds } from '../auth/helpers';
import { resolveUserLocale } from '../i18n/serverLocale';

export const listLiturgicalEvents = async (_args: void, context: any) => {
  if (!context.user) throw new HttpError(401);

  if (context.user.isAdmin) {
    return context.entities.LiturgicalEvent.findMany({ orderBy: { date: 'asc' } });
  }

  const memberships = await context.entities.Membership.findMany({
    where: { userId: context.user.id, status: 'ACTIVE' },
    select: { parishId: true, role: true },
  });
  const parishIds = memberships.map((m: any) => m.parishId);

  // Include personal workspace
  const personalWorkspace = await context.entities.Parish.findFirst({
    where: { ownerId: context.user.id, type: 'PERSONAL' },
    select: { id: true },
  });
  if (personalWorkspace && !parishIds.includes(personalWorkspace.id)) {
    parishIds.push(personalWorkspace.id);
  }

  // DIOCESE_ADMIN: include all parishes in the diocese
  if (memberships.some((m: any) => m.role === 'DIOCESE_ADMIN')) {
    const dioceseParishIds = await getDioceseParishIds(context);
    for (const id of dioceseParishIds) {
      if (!parishIds.includes(id)) parishIds.push(id);
    }
  }

  if (parishIds.length === 0) return [];

  return context.entities.LiturgicalEvent.findMany({
    where: { parishId: { in: parishIds } },
    orderBy: { date: 'asc' },
  });
};

export const createLiturgicalEvent = async (
  args: {
    name: string;
    date: string;
    description?: string;
    endDate?: string;
    color?: string;
    type?: string;
    recurring?: boolean;
    recurrenceRule?: string;
    parishId?: string;
  },
  context: any
) => {
  if (!context.user) throw new HttpError(401);

  const { assertStaffOperation } = await import('../auth/familySurface');
  await assertStaffOperation(context, {
    parishId: args.parishId,
    message: 'Apenas a equipe pastoral pode criar eventos no calendário.',
  });

  const membership = await context.entities.Membership.findFirst({
    where: {
      userId: context.user.id,
      status: 'ACTIVE',
      ...(args.parishId ? { parishId: args.parishId } : {}),
      role: {
        in: [
          'SUPER_ADMIN',
          'DIOCESE_ADMIN',
          'PARISH_COORDINATOR',
          'COMMUNITY_COORDINATOR',
          'PERSONAL_OWNER',
        ],
      },
    },
    select: { parishId: true, role: true },
  });

  let parishId = membership?.parishId;

  // Fallback to personal workspace
  if (!parishId && !context.user.isAdmin) {
    const personal = await context.entities.Parish.findFirst({
      where: { ownerId: context.user.id, type: 'PERSONAL' },
      select: { id: true },
    });
    if (personal) parishId = personal.id;
  }

  if (!parishId && !context.user.isAdmin) {
    throw new HttpError(400, 'Voce nao esta vinculado a nenhuma paroquia.');
  }

  return context.entities.LiturgicalEvent.create({
    data: {
      name: args.name,
      date: new Date(args.date),
      description: args.description,
      endDate: args.endDate ? new Date(args.endDate) : null,
      color: args.color || '#6366f1',
      type: args.type || 'liturgical',
      recurring: args.recurring || false,
      recurrenceRule: args.recurrenceRule,
      locale: resolveUserLocale(context.user),
      parishId: parishId || null,
    },
  });
};

export const deleteLiturgicalEvent = async (args: { id: string }, context: any) => {
  if (!context.user) throw new HttpError(401);

  const event = await context.entities.LiturgicalEvent.findUnique({
    where: { id: args.id },
    select: { parishId: true },
  });
  if (!event) throw new HttpError(404, 'Evento nao encontrado.');

  const { assertStaffOperation } = await import('../auth/familySurface');
  await assertStaffOperation(context, {
    parishId: event.parishId,
    message: 'Apenas a equipe pastoral pode remover eventos do calendário.',
  });

  if (!context.user.isAdmin) {
    if (!event.parishId) throw new HttpError(403, 'Apenas admin pode remover eventos globais.');
    const membership = await context.entities.Membership.findFirst({
      where: {
        userId: context.user.id,
        parishId: event.parishId,
        status: 'ACTIVE',
        role: {
          in: [
            'SUPER_ADMIN',
            'DIOCESE_ADMIN',
            'PARISH_COORDINATOR',
            'COMMUNITY_COORDINATOR',
            'PERSONAL_OWNER',
          ],
        },
      },
    });
    // Also check personal workspace ownership
    const isPersonalOwner = !membership && await context.entities.Parish.findFirst({
      where: { id: event.parishId, ownerId: context.user.id, type: 'PERSONAL' },
      select: { id: true },
    });
    if (!membership && !isPersonalOwner) {
      throw new HttpError(403, 'Voce nao tem permissao para remover este evento.');
    }
  }

  return context.entities.LiturgicalEvent.delete({ where: { id: args.id } });
};
