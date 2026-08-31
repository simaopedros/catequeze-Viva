import { HttpError } from 'wasp/server';
import { validateOrThrow, sendMessageSchema } from '../validation';
import { Resend } from 'resend';
import { requireWorkspaceAccess } from './sharedScope';

/** Escapa caracteres HTML para prevenir XSS em emails */
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Low-level Resend sender for trusted server jobs (e.g. invite delivery).
 * Not exposed as a Wasp operation — no auth.
 */
export async function sendRawTransactionalEmail(args: {
  to: string;
  subject: string;
  body: string;
}): Promise<{ success: boolean; id?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new HttpError(500, 'Configuração de email não encontrada. Contacte o administrador.');
  }

  const resend = new Resend(apiKey);
  const safeSubject = escapeHtml(args.subject);
  const safeBody = escapeHtml(args.body).replace(/\n/g, '<br>');

  try {
    const { data, error } = await resend.emails.send({
      from: 'Catequese Viva <noreply@catechis.app>',
      to: args.to,
      subject: args.subject,
      html:
        '<div style="font-family:sans-serif;max-width:600px;margin:0 auto"><h2>' +
        safeSubject +
        '</h2><p>' +
        safeBody +
        '</p><hr/><p style="color:#666;font-size:12px">Enviado pela Catequese Viva</p></div>',
    });

    if (error) throw new HttpError(500, 'Falha no envio: ' + error.message);
    return { success: true, id: data?.id };
  } catch (e: any) {
    if (e instanceof HttpError) throw e;
    throw new HttpError(500, 'Falha ao conectar ao serviço de email: ' + (e.message || 'Erro de rede'));
  }
}

async function assertRecipientInWorkspace(
  context: any,
  workspaceId: string,
  toEmail: string,
): Promise<void> {
  const email = toEmail.trim().toLowerCase();

  const member = await context.entities.Membership.findFirst({
    where: {
      parishId: workspaceId,
      status: 'ACTIVE',
      user: { email: { equals: email, mode: 'insensitive' } },
    },
    select: { id: true },
  });
  if (member) return;

  const catechumen = await context.entities.CatechumenProfile.findFirst({
    where: {
      email: { equals: email, mode: 'insensitive' },
      OR: [
        { parishId: workspaceId },
        { household: { parishId: workspaceId } },
        { enrollments: { some: { class: { parishId: workspaceId } } } },
      ],
    },
    select: { id: true },
  });
  if (catechumen) return;

  const guardian = await context.entities.GuardianProfile.findFirst({
    where: {
      email: { equals: email, mode: 'insensitive' },
      household: { parishId: workspaceId },
    },
    select: { id: true },
  });
  if (guardian) return;

  const pending = await context.entities.PendingInvitation.findFirst({
    where: {
      parishId: workspaceId,
      email: { equals: email, mode: 'insensitive' },
      expiresAt: { gt: new Date() },
    },
    select: { id: true },
  });
  if (pending) return;

  throw new HttpError(
    403,
    'Só pode enviar email para membros, catequizandos, responsáveis ou convites deste workspace.',
  );
}

/**
 * Client-facing email action — not an open relay.
 * Requires staff access to workspaceId and a recipient linked to that tenant.
 */
export const sendMessageEmail = async (
  args: { to: string; subject: string; body: string; workspaceId?: string },
  context: any,
) => {
  validateOrThrow(sendMessageSchema, args);
  if (!context.user) throw new HttpError(401);

  const workspaceId = args.workspaceId?.trim();
  if (!workspaceId) {
    throw new HttpError(400, 'workspaceId é obrigatório para enviar email.');
  }

  if (!context.user.isAdmin) {
    const access = await requireWorkspaceAccess(context, workspaceId);
    if (
      !access.isCoordinatorOrAbove &&
      !access.isCatechist &&
      access.role !== 'PERSONAL_OWNER'
    ) {
      throw new HttpError(403, 'Apenas a equipa pastoral pode enviar emails deste workspace.');
    }
  }

  await assertRecipientInWorkspace(context, workspaceId, args.to);
  return sendRawTransactionalEmail(args);
};
