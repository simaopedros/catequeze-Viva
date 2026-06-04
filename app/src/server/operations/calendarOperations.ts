import { HttpError } from 'wasp/server';

export const listLiturgicalEvents = async (_args: void, context: any) => {
  if (!context.user) throw new HttpError(401);

  if (context.user.isAdmin) {
    return context.entities.LiturgicalEvent.findMany({ orderBy: { date: 'asc' } });
  }

  const memberships = await context.entities.Membership.findMany({
    where: { userId: context.user.id, status: 'ACTIVE' },
    select: { parishId: true },
  });
  const parishIds = memberships.map((m: any) => m.parishId);
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
  },
  context: any
) => {
  if (!context.user) throw new HttpError(401);

  const membership = await context.entities.Membership.findFirst({
    where: { userId: context.user.id, status: 'ACTIVE' },
    select: { parishId: true, role: true },
  });

  const parishId = membership?.parishId;
  if (!parishId && !context.user.isAdmin) {
    throw new HttpError(400, 'Você não está vinculado a nenhuma paróquia.');
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
      locale: 'pt-BR',
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
  if (!event) throw new HttpError(404, 'Evento não encontrado.');

  if (!context.user.isAdmin) {
    if (!event.parishId) throw new HttpError(403, 'Apenas admin pode remover eventos globais.');
    const membership = await context.entities.Membership.findFirst({
      where: { userId: context.user.id, parishId: event.parishId, status: 'ACTIVE' },
    });
    if (!membership) throw new HttpError(403, 'Você não tem permissão para remover este evento.');
  }

  return context.entities.LiturgicalEvent.delete({ where: { id: args.id } });
};
