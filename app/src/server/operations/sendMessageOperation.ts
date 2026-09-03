import { HttpError } from 'wasp/server';
import { validateOrThrow, sendMessageSchema } from '../validation';
import { requireWorkspaceAccess } from './sharedScope';
import { EMAIL_MESSAGE } from '../../shared/emailCatalog';
import { enqueueEmail } from '../email/service';
import { resolveEmailProviderName } from '../email/config';

/**
 * Low-level sender for trusted server jobs (e.g. invite delivery).
 * Not exposed as a Wasp operation — no auth.
 */
export async function sendRawTransactionalEmail(args: {
  to: string;
  subject: string;
  body: string;
}): Promise<{ success: boolean; id?: string }> {
  const result = await enqueueEmail({
    messageId: EMAIL_MESSAGE.PASTORAL_MESSAGE,
    to: args.to,
    payload: { subject: args.subject, heading: args.subject, body: args.body },
    idempotencyKey: `pastoral.message:${args.to}:${args.subject}:${Date.now()}`,
  });
  if (result.skipped === 'suppressed' || result.skipped === 'opted_out') {
    throw new HttpError(400, 'Este destinatário não pode receber este email.');
  }
  return { success: true, id: result.id };
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
      throw new HttpError(403, 'Apenas a equipe pastoral pode enviar emails deste workspace.');
    }
  }

  if (resolveEmailProviderName() === 'fake' && !process.env.RESEND_API_KEY && process.env.NODE_ENV === 'production') {
    throw new HttpError(500, 'Configuração de email não encontrada. Contacte o administrador.');
  }

  await assertRecipientInWorkspace(context, workspaceId, args.to);
  return enqueueEmail({
    messageId: EMAIL_MESSAGE.PASTORAL_MESSAGE,
    to: args.to,
    payload: { subject: args.subject, heading: args.subject, body: args.body },
    idempotencyKey: `pastoral.message:${workspaceId}:${args.to}:${args.subject}:${Date.now()}`,
    context,
  });
};
