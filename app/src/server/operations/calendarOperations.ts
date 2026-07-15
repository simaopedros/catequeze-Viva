import { HttpError } from 'wasp/server';
import { getDioceseParishIds } from '../auth/helpers';
import { resolveUserLocale } from '../i18n/serverLocale';
import { isCoordinatorOrAbove } from './sharedScope';

/**
 * Calendar write capability: platform admin, PERSONAL owner of parishId,
 * or ACTIVE membership with coordinator-or-above role (incl. DIOCESE_ADMIN scope).
 * Catechists and family roles (GUARDIAN/CATECHUMEN) are never allowed.
 */
export async function assertCanWriteCalendar(context: any, parishId: string): Promise<void> {
  if (!parishId) {
    throw new HttpError(400, 'parishId é obrigatório.');
  }
  if (context.user.isAdmin) return;

  const personal = await context.entities.Parish.findFirst({
    where: { id: parishId, ownerId: context.user.id, type: 'PERSONAL' },
    select: { id: true },
  });
  if (personal) return;

  const memberships = await context.entities.Membership.findMany({
    where: { userId: context.user.id, parishId, status: 'ACTIVE' },
    select: { role: true },
  });
  if (memberships.some((m: any) => isCoordinatorOrAbove(m.role))) return;

  const hasDioceseAdmin = await context.entities.Membership.findFirst({
    where: { userId: context.user.id, status: 'ACTIVE', role: 'DIOCESE_ADMIN' },
    select: { id: true },
  });
  if (hasDioceseAdmin) {
    const dioceseParishIds = await getDioceseParishIds(context);
    if (dioceseParishIds.includes(parishId)) return;
  }

  throw new HttpError(403, 'Apenas coordenadores podem gerir o calendário litúrgico.');
}

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
    /** Required for non-admins. Platform admins may omit for global (parishId null) events. */
    parishId?: string;
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

  if (!args.parishId) {
    // Global liturgical events: platform admin only (delete already special-cases parishId null).
    if (!context.user.isAdmin) {
      throw new HttpError(400, 'parishId é obrigatório.');
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
        parishId: null,
      },
    });
  }

  await assertCanWriteCalendar(context, args.parishId);

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
      parishId: args.parishId,
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

  if (!event.parishId) {
    if (!context.user.isAdmin) {
      throw new HttpError(403, 'Apenas admin pode remover eventos globais.');
    }
  } else {
    await assertCanWriteCalendar(context, event.parishId);
  }

  return context.entities.LiturgicalEvent.delete({ where: { id: args.id } });
};
