/**
 * Mark a message as read by the current user.
 * Creates a MessageReadReceipt if one doesn't exist.
 */
export const markMessageAsRead = async (args: { messageId: string }, context: any) => {
  if (!context.user) return { success: false };

  try {
    await context.entities.MessageReadReceipt.upsert({
      where: {
        messageId_userId: {
          messageId: args.messageId,
          userId: context.user.id,
        },
      },
      update: { readAt: new Date() },
      create: {
        messageId: args.messageId,
        userId: context.user.id,
      },
    });
    return { success: true };
  } catch {
    return { success: false };
  }
};

/**
 * Get read receipts for a message.
 */
export const getMessageReadReceipts = async (args: { messageId: string }, context: any) => {
  if (!context.user) return [];

  const receipts = await context.entities.MessageReadReceipt.findMany({
    where: { messageId: args.messageId },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, profileImage: true } },
    },
    orderBy: { readAt: 'asc' },
  });

  return receipts.map((r: any) => ({
    userId: r.userId,
    userName: `${r.user?.firstName || ''} ${r.user?.lastName || ''}`.trim(),
    readAt: r.readAt,
  }));
};
