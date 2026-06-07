/**
 * Mark a message as read by the current user.
 * Creates a MessageReadReceipt if one doesn't exist.
 */
import { HttpError } from 'wasp/server';
import { assertTwoFactorSessionVerified } from './twoFactorOperations';

async function assertMessageParticipant(context: any, messageId: string): Promise<void> {
  const message = await context.entities.Message.findUnique({
    where: { id: messageId },
    select: { conversationId: true },
  });
  if (!message) throw new HttpError(404, 'Mensagem não encontrada.');

  const participant = await context.entities.ConversationParticipant.findUnique({
    where: {
      conversationId_userId: {
        conversationId: message.conversationId,
        userId: context.user.id,
      },
    },
  });

  if (!participant && !context.user.isAdmin) {
    throw new HttpError(403, 'Você não participa desta conversa.');
  }
}

export const markMessageAsRead = async (args: { messageId: string }, context: any) => {
  if (!context.user) throw new HttpError(401);
  await assertTwoFactorSessionVerified(context);
  await assertMessageParticipant(context, args.messageId);

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
  if (!context.user) throw new HttpError(401);
  await assertTwoFactorSessionVerified(context);
  await assertMessageParticipant(context, args.messageId);

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
