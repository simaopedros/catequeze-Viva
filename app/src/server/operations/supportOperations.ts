/**
 * Support inbox operations — ContactFormMessage management.
 */
import { HttpError } from "wasp/server";
import { emailSender } from "wasp/server/email";
import { requireAuth, requirePlatformAdmin, writeAuditLog } from "../auth/helpers";
import { logger } from "../logger";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function htmlParagraphs(value: string) {
  return escapeHtml(value).replace(/\n/g, "<br/>");
}

async function findUserByContactEmail(context: any, email?: string | null) {
  const trimmed = email?.trim();
  if (!trimmed) return null;
  return context.entities.User.findFirst({
    where: { email: { equals: trimmed, mode: "insensitive" } },
    select: { id: true, email: true, firstName: true },
  });
}

/**
 * Public endpoint for contact form submissions — no auth required.
 * Rate limit: 3 messages per email per hour.
 */
export const submitContactMessage = async (
  args: { name: string; email: string; message: string },
  context: any,
) => {
  if (!args.name?.trim() || !args.email?.trim() || !args.message?.trim()) {
    throw new HttpError(400, "Nome, email e mensagem são obrigatórios.");
  }

  const email = args.email.trim();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentCount = await context.entities.ContactFormMessage.count({
    where: {
      email,
      createdAt: { gte: oneHourAgo },
    },
  });

  if (recentCount >= 3) {
    throw new HttpError(429, "Muitas mensagens. Tente novamente mais tarde.");
  }

  const matchedUser =
    context.user?.id
      ? { id: context.user.id }
      : await findUserByContactEmail(context, email);

  const msg = await context.entities.ContactFormMessage.create({
    data: {
      name: args.name.trim(),
      email,
      content: args.message.trim(),
      userId: matchedUser?.id ?? null,
    },
  });

  return { success: true, id: msg.id };
};

export const getContactMessages = async (_args: void, context: any) => {
  requirePlatformAdmin(context.user);

  return context.entities.ContactFormMessage.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });
};

export const getContactUnreadCount = async (_args: void, context: any) => {
  requirePlatformAdmin(context.user);
  return context.entities.ContactFormMessage.count({
    where: { isRead: false },
  });
};

export const getMySupportMessages = async (_args: void, context: any) => {
  requireAuth(context.user);

  const email = context.user.email?.trim();
  return context.entities.ContactFormMessage.findMany({
    where: {
      OR: [
        { userId: context.user.id },
        ...(email ? [{ email: { equals: email, mode: "insensitive" } }] : []),
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      createdAt: true,
      content: true,
      replyBody: true,
      repliedAt: true,
    },
  });
};

export const markContactMessageRead = async (
  args: { id: string },
  context: any,
) => {
  requirePlatformAdmin(context.user);

  return context.entities.ContactFormMessage.update({
    where: { id: args.id },
    data: { isRead: true },
  });
};

export const replyToContactMessage = async (
  args: { id: string; body: string },
  context: any,
) => {
  requirePlatformAdmin(context.user);

  const body = args.body?.trim();
  if (!body) throw new HttpError(400, "A resposta não pode estar vazia.");

  const message = await context.entities.ContactFormMessage.findUnique({
    where: { id: args.id },
  });
  if (!message) throw new HttpError(404, "Mensagem não encontrada.");
  if (!message.email) {
    throw new HttpError(400, "Esta mensagem não tem email de resposta.");
  }

  const updated = await context.entities.ContactFormMessage.update({
    where: { id: args.id },
    data: { isRead: true, repliedAt: new Date(), replyBody: body },
  });

  const recipient =
    (message.userId
      ? await context.entities.User.findUnique({
          where: { id: message.userId },
          select: { id: true, email: true, firstName: true },
        })
      : null) || (await findUserByContactEmail(context, message.email));

  let notified = false;
  if (recipient?.id && context.entities.Notification) {
    try {
      await context.entities.Notification.create({
        data: {
          userId: recipient.id,
          type: "SYSTEM",
          title: "Resposta do suporte",
          body: body.slice(0, 280),
          link: "/app/suporte",
          entityType: "ContactFormMessage",
          entityId: message.id,
        },
      });
      notified = true;
    } catch (error) {
      logger.error("[support] failed to create in-app notification", {
        error: error instanceof Error ? error.message : String(error),
        messageId: message.id,
      });
    }
  }

  let emailSent = false;
  const greeting = message.name ? `Olá ${message.name},` : "Olá,";
  try {
    await emailSender.send({
      to: message.email,
      subject: "Resposta do suporte — Catequese Viva",
      text: `${greeting}\n\nRecebemos a sua mensagem e a nossa resposta é:\n\n${body}\n\nTambém pode ver esta resposta na central de notificações da Catequese Viva.\n`,
      html: `<p>${escapeHtml(greeting)}</p>
<p>Recebemos a sua mensagem e a nossa resposta é:</p>
<blockquote style="margin:0;padding:12px 16px;border-left:3px solid #D39A2B;background:#f7f4ee">${htmlParagraphs(body)}</blockquote>
<p style="color:#666;font-size:13px">Também pode ver esta resposta na <a href="https://catechis.app/app/suporte">central de suporte</a> da Catequese Viva.</p>`,
    });
    emailSent = true;
  } catch (error) {
    logger.error("[support] failed to send reply email", {
      error: error instanceof Error ? error.message : String(error),
      to: message.email,
      messageId: message.id,
    });
  }

  await writeAuditLog(context, "UPDATE", "ContactFormMessage", args.id, {
    operation: "ADMIN_SUPPORT_REPLY",
    to: message.email,
    notifiedUserId: recipient?.id ?? null,
    emailSent,
  });

  return { ...updated, emailSent, notified };
};
