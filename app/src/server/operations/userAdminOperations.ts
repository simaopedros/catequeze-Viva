/**
 * User detail operation — full profile view for the admin governance panel.
 */
import { HttpError } from 'wasp/server';
import { requirePlatformAdmin } from '../auth/helpers';

export const getUserAdminDetail = async (args: { id: string }, context: any) => {
  requirePlatformAdmin(context.user);

  const user = await context.entities.User.findUnique({
    where: { id: args.id },
    select: {
      id: true,
      email: true,
      username: true,
      firstName: true,
      lastName: true,
      phone: true,
      isAdmin: true,
      locale: true,
      createdAt: true,
      subscriptionStatus: true,
      subscriptionPlan: true,
      credits: true,
      wooviCorrelationId: true,
    },
  });

  if (!user) throw new HttpError(404, 'Utilizador não encontrado.');

  // Memberships
  const memberships = await context.entities.Membership.findMany({
    where: { userId: args.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      role: true,
      status: true,
      createdAt: true,
      parish: { select: { id: true, name: true, active: true } },
      community: { select: { id: true, name: true } },
    },
  });

  // Audit log
  const auditLog = await context.entities.AuditLog.findMany({
    where: { userId: args.id },
    orderBy: { createdAt: 'desc' },
    take: 30,
    select: {
      id: true,
      action: true,
      entityType: true,
      entityId: true,
      metadata: true,
      createdAt: true,
    },
  });

  // AI usage
  const aiUsage = await context.entities.DailyAiUsage.findMany({
    where: { userId: args.id },
    orderBy: { date: 'desc' },
    take: 30,
    select: { id: true, date: true, creditsUsed: true },
  });

  return { ...user, memberships, auditLog, aiUsage };
};
