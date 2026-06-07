/**
 * Parish detail operation — full view for the admin governance panel.
 */
import { HttpError } from 'wasp/server';
import { requirePlatformAdmin } from '../auth/helpers';

export const getParishAdminDetail = async (args: { id: string }, context: any) => {
  requirePlatformAdmin(context.user);

  const parish = await context.entities.Parish.findUnique({
    where: { id: args.id },
    include: {
      diocese: { select: { id: true, name: true } },
      billing: true,
      owner: { select: { id: true, email: true, firstName: true, lastName: true } },
      _count: {
        select: {
          communities: true,
          classes: true,
          memberships: true,
          catechumens: true,
          messageCampaigns: true,
        },
      },
    },
  });

  if (!parish) throw new HttpError(404, 'Paróquia não encontrada.');

  // Recent audit log for this parish
  const recentAudit = await context.entities.AuditLog.findMany({
    where: { parishId: args.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      id: true,
      action: true,
      entityType: true,
      entityId: true,
      metadata: true,
      createdAt: true,
      user: { select: { id: true, email: true } },
    },
  });

  // Active members
  const members = await context.entities.Membership.findMany({
    where: { parishId: args.id, status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      role: true,
      createdAt: true,
      user: { select: { id: true, email: true, firstName: true, lastName: true } },
    },
  });

  return { ...parish, recentAudit, members };
};
