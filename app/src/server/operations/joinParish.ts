import { HttpError } from 'wasp/server';

export const joinParish = async (args: { parishId: string; role?: string }, context: any) => {
  if (!context.user) throw new HttpError(401);
  if (!args.parishId) throw new HttpError(400, 'parishId é obrigatório.');

  // Check if parish exists
  const parish = await context.entities.Parish.findUnique({
    where: { id: args.parishId },
    select: { id: true, name: true },
  });
  if (!parish) throw new HttpError(404, 'Paróquia não encontrada.');

  // Check if already a member
  const existing = await context.entities.Membership.findFirst({
    where: { userId: context.user.id, parishId: args.parishId },
  });
  if (existing) {
    const updates: any = {};
    if (existing.status !== 'ACTIVE') updates.status = 'ACTIVE';
    if (args.role && existing.role !== args.role) updates.role = args.role;
    
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
      role: args.role || 'ASSISTANT_CATECHIST',
    },
  });
};
