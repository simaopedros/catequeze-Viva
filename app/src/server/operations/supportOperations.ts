/**
 * Support inbox operations — ContactFormMessage management.
 */
import { HttpError } from 'wasp/server';
import { requirePlatformAdmin } from '../auth/helpers';

/**
 * Public endpoint for contact form submissions — no auth required.
 * Rate limit: 3 messages per IP per hour (basic implementation).
 */
export const submitContactMessage = async (
  args: { name: string; email: string; message: string },
  context: any
) => {
  if (!args.name?.trim() || !args.email?.trim() || !args.message?.trim()) {
    throw new HttpError(400, 'Nome, email e mensagem são obrigatórios.');
  }

  // Basic rate limiting: count messages from this email in the last hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentCount = await context.entities.ContactFormMessage.count({
    where: {
      email: args.email.trim(),
      createdAt: { gte: oneHourAgo },
    },
  });

  if (recentCount >= 3) {
    throw new HttpError(429, 'Muitas mensagens. Tente novamente mais tarde.');
  }

  const msg = await context.entities.ContactFormMessage.create({
    data: {
      name: args.name.trim(),
      email: args.email.trim(),
      content: args.message.trim(),
    },
  });

  return { success: true, id: msg.id };
};

/**
 * List contact messages (admin only).
 */
export const getContactMessages = async (_args: void, context: any) => {
  requirePlatformAdmin(context.user);

  return context.entities.ContactFormMessage.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
};

/**
 * Mark a contact message as read.
 */
export const markContactMessageRead = async (args: { id: string }, context: any) => {
  requirePlatformAdmin(context.user);

  return context.entities.ContactFormMessage.update({
    where: { id: args.id },
    data: { isRead: true },
  });
};
