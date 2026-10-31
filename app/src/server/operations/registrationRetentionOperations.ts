import { HttpError } from 'wasp/server';
import { z } from 'zod';
import { assertRegistrationPermission, assertRegistrationsEnabled } from '../auth/registrationPermissions';
import { REGISTRATION_DRAFT_RETENTION_DAYS, retentionCutoff } from '../../shared/registrationRetention';

const campaignSchema = z.object({ campaignId: z.string().min(1) }).strict();

async function authorize(args: unknown, context: any, action: 'VIEW_AUDIT' | 'VIEW_AGGREGATE_REPORTS') {
  assertRegistrationsEnabled();
  if (!context.user) throw new HttpError(401);
  const parsed = campaignSchema.safeParse(args);
  if (!parsed.success) throw new HttpError(400);
  const campaign = await context.entities.RegistrationCampaign.findUnique({ where: { id: parsed.data.campaignId }, select: { id: true, parishId: true } });
  if (!campaign) throw new HttpError(404);
  await assertRegistrationPermission(context, { parishId: campaign.parishId, action });
  return campaign;
}

/** Prévia conservadora: inscrições vinculadas a perfil ou matrícula ficam preservadas. */
export async function previewRegistrationRetention(args: unknown, context: any) {
  const campaign = await authorize(args, context, 'VIEW_AUDIT');
  const now = new Date();
  const [expiredTokens, submissions, protectedSubmissions] = await Promise.all([
    context.entities.RegistrationAccessToken.count({ where: { campaignId: campaign.id, expiresAt: { lte: retentionCutoff(now, REGISTRATION_DRAFT_RETENTION_DAYS) } } }),
    context.entities.RegistrationSubmission.count({ where: { campaignId: campaign.id, retentionUntil: { lte: now }, applications: { none: { OR: [{ catechumenProfileId: { not: null } }, { status: 'ENROLLED' }] } } } }),
    context.entities.RegistrationSubmission.count({ where: { campaignId: campaign.id, retentionUntil: { lte: now }, applications: { some: { OR: [{ catechumenProfileId: { not: null } }, { status: 'ENROLLED' }] } } } }),
  ]);
  return { simulated: true, expiredTokens, submissions, protectedSubmissions };
}

/** Apenas contagens agregadas, sem informações pessoais ou documentos. */
export async function getRegistrationOperationalReport(args: unknown, context: any) {
  const campaign = await authorize(args, context, 'VIEW_AGGREGATE_REPORTS');
  const groups = await context.entities.RegistrationApplication.groupBy({ by: ['status'], where: { submission: { campaignId: campaign.id } }, _count: { _all: true } });
  return { counts: groups.map((group: any) => ({ status: group.status, count: group._count._all })) };
}
