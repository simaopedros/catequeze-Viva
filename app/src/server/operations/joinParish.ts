import { HttpError } from 'wasp/server';

/** Roles that a self-joining user is allowed to assume. */
const ALLOWED_SELF_JOIN_ROLES = [
  'LEAD_CATECHIST',
  'ASSISTANT_CATECHIST',
  'GUARDIAN',
  'CATECHUMEN',
  'CONTENT_REVIEWER',
  'PASTORAL_VIEWER',
];

/** Privileged roles that must be assigned by an existing parish admin. */
const PRIVILEGED_ROLES = [
  'SUPER_ADMIN',
  'DIOCESE_ADMIN',
  'PARISH_COORDINATOR',
  'COMMUNITY_COORDINATOR',
];

export const joinParish = async (args: { parishId: string; role?: string }, context: any) => {
  if (!context.user) throw new HttpError(401);
  if (!args.parishId) throw new HttpError(400, 'parishId é obrigatório.');

  // Validate role — reject privileged roles for self-join
  const requestedRole = args.role || 'PASTORAL_VIEWER';

  // Check if parish exists
  const parish = await context.entities.Parish.findUnique({
    where: { id: args.parishId },
    select: { id: true, name: true, ownerId: true },
  });
  if (!parish) throw new HttpError(404, 'Paróquia não encontrada.');

  // Validate role — reject privileged roles for self-join (unless user owns the parish)
  if (PRIVILEGED_ROLES.includes(requestedRole)) {
    if (parish.ownerId !== context.user.id) {
      throw new HttpError(403, 'Este papel requer convite de um administrador da paróquia.');
    }
  }
  if (!ALLOWED_SELF_JOIN_ROLES.includes(requestedRole) && !PRIVILEGED_ROLES.includes(requestedRole)) {
    throw new HttpError(400, `Papel inválido: ${requestedRole}`);
  }

  // Check if already a member
  const existing = await context.entities.Membership.findFirst({
    where: { userId: context.user.id, parishId: args.parishId },
  });
  if (existing) {
    const updates: any = {};
    if (existing.status !== 'ACTIVE') updates.status = 'ACTIVE';
    if (existing.role !== requestedRole) updates.role = requestedRole;

    if (Object.keys(updates).length > 0) {
      return context.entities.Membership.update({
        where: { id: existing.id },
        data: updates,
      });
    }
    return existing;
  }

  // Create new membership with ACTIVE status
  return context.entities.Membership.create({
    data: {
      userId: context.user.id,
      parishId: args.parishId,
      status: 'ACTIVE',
      role: requestedRole,
    },
  });
};
