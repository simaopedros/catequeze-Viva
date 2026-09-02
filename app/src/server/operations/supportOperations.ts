/**
 * Support inbox operations — ContactFormMessage management.
 */
import { HttpError } from "wasp/server";
import { emailSender } from "wasp/server/email";
import { requirePlatformAdmin, writeAuditLog } from "../auth/helpers";

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

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentCount = await context.entities.ContactFormMessage.count({
    where: {
      email: args.email.trim(),
      createdAt: { gte: oneHourAgo },
    },
  });

  if (recentCount >= 3) {
    throw new HttpError(429, "Muitas mensagens. Tente novamente mais tarde.");
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

  const escaped = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  await emailSender.send({
    to: message.email,
    subject: `Re: ${message.name || "Contacto"} — Catequese Viva`,
    text: body,
    html: `<p>${escaped.replace(/\n/g, "<br/>")}</p>`,
  });

  const updated = await context.entities.ContactFormMessage.update({
    where: { id: args.id },
    data: { isRead: true, repliedAt: new Date() },
  });

  await writeAuditLog(context, "UPDATE", "ContactFormMessage", args.id, {
    operation: "ADMIN_SUPPORT_REPLY",
    to: message.email,
  });

  return updated;
};
