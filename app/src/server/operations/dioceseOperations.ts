import { HttpError } from 'wasp/server';
import { requireAuth, writeAuditLog } from '../auth/helpers';

/** Lista todas as dioceses (admin) ou a diocese da paróquia do usuário. */
export const listDioceses = async (_args: void, context: any) => {
  requireAuth(context.user);

  if (context.user.isAdmin) {
    return context.entities.Diocese.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { parishes: true } } },
    });
  }

  // Usuário vê apenas a diocese da sua paróquia
  const memberships = await context.entities.Membership.findMany({
    where: { userId: context.user.id, status: 'ACTIVE' },
    include: { parish: { select: { dioceseId: true } } },
  });
  const dioceseIds = [...new Set(memberships.map((m: any) => m.parish?.dioceseId).filter(Boolean))];

  if (dioceseIds.length === 0) return [];

  return context.entities.Diocese.findMany({
    where: { id: { in: dioceseIds } },
    orderBy: { name: 'asc' },
    include: { _count: { select: { parishes: true } } },
  });
};

/** Cria uma diocese. Qualquer usuário autenticado pode criar durante o onboarding. */
export const createDiocese = async (args: { name: string; country: string }, context: any) => {
  requireAuth(context.user);

  const diocese = await context.entities.Diocese.create({
    data: { name: args.name, country: args.country || 'BR' },
  });

  await writeAuditLog(context, 'DIOCESE_CREATE', 'Diocese', diocese.id);
  return diocese;
};

/** Atualiza uma diocese. Apenas SUPER_ADMIN. */
export const updateDiocese = async (args: { id: string; name?: string; country?: string }, context: any) => {
  requireAuth(context.user);
  if (!context.user.isAdmin) throw new HttpError(403, 'Apenas administradores podem editar dioceses.');

  const data: any = {};
  if (args.name) data.name = args.name;
  if (args.country) data.country = args.country;

  const diocese = await context.entities.Diocese.update({ where: { id: args.id }, data });
  await writeAuditLog(context, 'DIOCESE_UPDATE', 'Diocese', diocese.id);
  return diocese;
};

/** Public search for onboarding — finds dioceses by name and state. */
export const searchDiocesesForOnboarding = async (
  args: { name?: string; state?: string },
  context: any
) => {
  if (!context.user) throw new HttpError(401);

  const where: any = {};

  if (args.name?.trim()) {
    where.name = { contains: args.name.trim(), mode: 'insensitive' };
  }
  if (args.state?.trim()) {
    // Include both exact state matches AND dioceses without state set (legacy data)
    where.OR = [
      { state: { equals: args.state.trim().toUpperCase() } },
      { state: null },
    ];
  }

  return context.entities.Diocese.findMany({
    where,
    orderBy: { name: 'asc' },
    take: 50,
    include: { _count: { select: { parishes: true } } },
  });
};
