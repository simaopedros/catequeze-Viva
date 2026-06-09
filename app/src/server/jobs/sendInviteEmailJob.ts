import type { SendInviteEmailJob } from 'wasp/server/jobs';
import { skipIfNotJobWorker } from './jobGuard';
import { deliverInviteEmail, type InviteEmailPayload } from './inviteEmailUtils';
import { logger } from '../logger';

export const sendInviteEmailJob: SendInviteEmailJob<InviteEmailPayload, void> = async (
  args,
  context,
) => {
  if (skipIfNotJobWorker()) return;

  try {
    await deliverInviteEmail(args, context);
  } catch (e) {
    logger.error('Erro ao enviar email de convite (job)', {
      error: e instanceof Error ? e.message : String(e),
      to: args.to,
    });
    throw e;
  }
};
