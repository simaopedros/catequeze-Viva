import { HttpError } from 'wasp/server';
import { requireAuth } from '../auth/helpers';

// ── listNotifications ───────────────────────────────────────────────────────

export const listNotifications = async (
  args: { onlyUnread?: boolean; take?: number; cursor?: string },
  context: any
) => {
  requireAuth(context.user);

  const take = Math.min(args.take || 30, 100);
  const where: any = { userId: context.user.id };

  if (args.onlyUnread) {
    where.readAt = null;
  }

  if (args.cursor) {
    where.createdAt = { lt: new Date(args.cursor) };
  }

  const notifications = await context.entities.Notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: take + 1,
  });

  const hasMore = notifications.length > take;
  if (hasMore) notifications.pop();

  return {
    notifications,
    hasMore,
    nextCursor: hasMore && notifications.length > 0
      ? notifications[notifications.length - 1].createdAt.toISOString()
      : null,
  };
};

// ── getUnreadNotificationCount ──────────────────────────────────────────────

export const getUnreadNotificationCount = async (_args: void, context: any) => {
  requireAuth(context.user);

  const count = await context.entities.Notification.count({
    where: { userId: context.user.id, readAt: null },
  });

  return { count };
};

// ── markNotificationRead ────────────────────────────────────────────────────

export const markNotificationRead = async (
  args: { notificationId: string },
  context: any
) => {
  requireAuth(context.user);

  if (!args.notificationId) throw new HttpError(400, 'ID da notificação é obrigatório.');

  const notification = await context.entities.Notification.findUnique({
    where: { id: args.notificationId },
  });

  if (!notification) throw new HttpError(404, 'Notificação não encontrada.');
  if (notification.userId !== context.user.id && !context.user.isAdmin) {
    throw new HttpError(403, 'Acesso negado.');
  }

  await context.entities.Notification.update({
    where: { id: args.notificationId },
    data: { readAt: new Date() },
  });

  return { success: true };
};

// ── markAllNotificationsRead ────────────────────────────────────────────────

export const markAllNotificationsRead = async (_args: void, context: any) => {
  requireAuth(context.user);

  await context.entities.Notification.updateMany({
    where: { userId: context.user.id, readAt: null },
    data: { readAt: new Date() },
  });

  return { success: true };
};
