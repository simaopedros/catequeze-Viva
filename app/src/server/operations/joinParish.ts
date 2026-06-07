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

  const requestedRole = args.role || 'PASTORAL_VIEWER';

  const parish = await context.entities.Parish.findUnique({
    where: { id: args.parishId },
    select: { id: true, name: true, ownerId: true, type: true },
  });
  if (!parish) throw new HttpError(404, 'Paróquia não encontrada.');

  // Only the parish owner or an existing admin can self-assign privileged roles
  if (PRIVILEGED_ROLES.includes(requestedRole)) {
    if (parish.ownerId !== context.user.id) {
      throw new HttpError(403, 'Este papel requer convite de um administrador da paróquia.');
    }
  }
  if (!ALLOWED_SELF_JOIN_ROLES.includes(requestedRole) && !PRIVILEGED_ROLES.includes(requestedRole)) {
    throw new HttpError(400, `Papel inválido: ${requestedRole}`);
  }

  // Institutional parishes require an invitation — no open self-join
  if (parish.type !== 'PERSONAL') {
    const existing = await context.entities.Membership.findFirst({
      where: { userId: context.user.id, parishId: args.parishId },
    });
    if (existing) {
      // Only allow accepting an existing INVITED membership
      if (existing.status === 'INVITED') {
        return context.entities.Membership.update({
          where: { id: existing.id },
          data: { status: 'ACTIVE' },
        });
      }
      // Never allow self-service role changes — prevents privilege escalation
      return existing;
    }

    // No existing invitation — reject self-join to institutional parishes
    throw new HttpError(403, 'Você precisa de um convite para entrar nesta paróquia. Solicite a um administrador.');
  }

  // Personal workspace — only the owner can join
  if (parish.ownerId !== context.user.id) {
    throw new HttpError(403, 'Você não pode entrar no espaço pessoal de outro usuário.');
  }

  const existing = await context.entities.Membership.findFirst({
    where: { userId: context.user.id, parishId: args.parishId },
  });
  if (existing) {
    if (existing.status === 'INVITED') {
      return context.entities.Membership.update({
        where: { id: existing.id },
        data: { status: 'ACTIVE' },
      });
    }
    return existing;
  }

  return context.entities.Membership.create({
    data: {
      userId: context.user.id,
      parishId: args.parishId,
      status: 'ACTIVE',
      role: requestedRole,
    },
  });
};
