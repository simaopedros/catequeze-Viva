import { HttpError, prisma } from 'wasp/server';
import { z } from 'zod';
import { assertRegistrationPermission, assertRegistrationsEnabled } from '../auth/registrationPermissions';
import { assertRegistrationsPlan } from './registrationCampaignOperations';

export async function authorizeDocument(context: any, campaign: any, communityId: string | null | undefined, action: 'VERIFY_DOCUMENTS' | 'VIEW_SENSITIVE_FILES') {
  await assertRegistrationPermission(context, { parishId: campaign.parishId, communityId: communityId ?? undefined, action });
  await assertRegistrationsPlan(context, campaign.parishId);
}
export async function documentApplication(context: any, id: string, action: 'VERIFY_DOCUMENTS' | 'VIEW_SENSITIVE_FILES') {
  assertRegistrationsEnabled();
  if (!context.user) throw new HttpError(401);
  const application = await context.entities.RegistrationApplication.findUnique({ where: { id }, include: { submission: { include: { campaign: true } } } });
  if (!application) throw new HttpError(404);
  await authorizeDocument(context, application.submission.campaign, application.communityId, action);
  return application;
}
const queueSchema = z.object({ campaignId: z.string().min(1), status: z.enum(['QUARANTINE', 'PENDING', 'VERIFIED', 'REJECTED']).optional(), cursor: z.string().min(1).optional(), take: z.number().int().min(1).max(50).optional() }).strict();
export async function listRegistrationDocumentQueue(args: unknown, context: any) {
  const parsed = queueSchema.safeParse(args); if (!parsed.success) throw new HttpError(400);
  assertRegistrationsEnabled(); if (!context.user) throw new HttpError(401);
  const campaign = await context.entities.RegistrationCampaign.findUnique({ where: { id: parsed.data.campaignId } });
  if (!campaign) throw new HttpError(404);
  const membership = await context.entities.Membership.findFirst({ where: { userId: context.user.id, parishId: campaign.parishId, status: 'ACTIVE' }, select: { role: true, communityId: true } });
  const communityId = membership?.role === 'COMMUNITY_COORDINATOR' ? membership.communityId : undefined;
  await authorizeDocument(context, campaign, communityId, 'VERIFY_DOCUMENTS');
  const where = { campaignId: campaign.id, status: parsed.data.status ?? 'PENDING', ...(communityId ? { application: { communityId } } : {}) };
  if (parsed.data.cursor && !await context.entities.RegistrationDocument.findFirst({ where: { ...where, id: parsed.data.cursor }, select: { id: true } })) throw new HttpError(400);
  const rows = await context.entities.RegistrationDocument.findMany({ where, take: parsed.data.take ?? 50, ...(parsed.data.cursor ? { cursor: { id: parsed.data.cursor }, skip: 1 } : {}), orderBy: { id: 'asc' }, select: { id: true, applicationId: true, type: true, status: true, source: true, sizeBytes: true, createdAt: true, application: { select: { firstName: true, lastName: true, submission: { select: { protocol: true } } } } } });
  return rows.map(({ application, ...row }: any) => ({ ...row, protocol: application.submission.protocol, name: `${application.firstName} ${application.lastName}` }));
}
const reviewSchema = z.object({ id: z.string().min(1), decision: z.enum(['VERIFY', 'REJECT']), reason: z.string().trim().max(300).optional() }).strict().refine(v => v.decision !== 'REJECT' || !!v.reason);
export async function reviewRegistrationDocument(args: unknown, context: any) {
  const parsed = reviewSchema.safeParse(args); if (!parsed.success) throw new HttpError(400);
  assertRegistrationsEnabled(); if (!context.user) throw new HttpError(401);
  const doc = await context.entities.RegistrationDocument.findUnique({ where: { id: parsed.data.id }, select: { id: true, applicationId: true } });
  if (!doc) throw new HttpError(404);
  const application = await documentApplication(context, doc.applicationId, 'VERIFY_DOCUMENTS');
  const now = new Date(); const status = parsed.data.decision === 'VERIFY' ? 'VERIFIED' : 'REJECTED';
  await prisma.$transaction(async tx => {
    const result = await tx.registrationDocument.updateMany({ where: { id: doc.id, status: 'PENDING' }, data: status === 'VERIFIED' ? { status, verifiedAt: now, verifiedById: context.user.id } : { status, rejectedAt: now, rejectedReason: parsed.data.reason } });
    if (!result.count) throw new HttpError(409, 'Conflito de revisão.');
    await tx.auditLog.create({ data: { action: 'UPDATE', entityType: 'RegistrationDocument', entityId: doc.id, parishId: application.submission.campaign.parishId, userId: context.user.id, metadata: JSON.stringify({ applicationId: application.id }) } });
  });
  return { id: doc.id, status };
}
