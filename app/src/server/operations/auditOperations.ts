/**
 * Audit log operations — viewer for the admin panel.
 */
import { HttpError } from 'wasp/server';
import { requirePlatformAdmin } from '../auth/helpers';

export const getAuditLogs = async (
  args: {
    skip?: number;
    take?: number;
    action?: string;
    entityType?: string;
    userId?: string;
    parishId?: string;
  },
  context: any
) => {
  requirePlatformAdmin(context.user);

  const where: any = {};
  if (args.action) where.action = args.action;
  if (args.entityType) where.entityType = args.entityType;
  if (args.userId) where.userId = args.userId;
  if (args.parishId) where.parishId = args.parishId;

  const [logs, total] = await Promise.all([
    context.entities.AuditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: args.skip || 0,
      take: args.take || 50,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        metadata: true,
        createdAt: true,
        user: { select: { id: true, email: true } },
      },
    }),
    context.entities.AuditLog.count({ where }),
  ]);

  return { logs, total, skip: args.skip || 0, take: args.take || 50 };
};
