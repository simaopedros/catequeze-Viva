import { HttpError, prisma } from 'wasp/server';
import { z } from 'zod';
import { assertRegistrationPermission, assertRegistrationsEnabled } from '../auth/registrationPermissions';
import { escapeCsvCell } from '../security/csvSafety';

const fields = ['applicationId', 'firstName', 'lastName', 'birthDate', 'status', 'offeringId', 'submittedAt'] as const;
const schema = z.object({ campaignId: z.string().min(1), fields: z.array(z.enum(fields)).min(1).max(fields.length).refine(v => new Set(v).size === v.length), purpose: z.enum(['REGISTRATION_MANAGEMENT', 'INSTITUTIONAL_REPORT']) }).strict();

/** Gera somente os campos solicitados, sem arquivos, e registra finalidade e quantidade. */
export async function exportRegistrationApplications(args: unknown, context: any) {
  assertRegistrationsEnabled();
  if (!context.user) throw new HttpError(401);
  const parsed = schema.safeParse(args);
  if (!parsed.success) throw new HttpError(400, 'Dados de exportação inválidos.');
  const { campaignId, fields: selected, purpose } = parsed.data;
  const campaign = await context.entities.RegistrationCampaign.findUnique({ where: { id: campaignId }, select: { id: true, parishId: true } });
  if (!campaign) throw new HttpError(404);
  await assertRegistrationPermission(context, { parishId: campaign.parishId, action: 'EXPORT_DATA' });
  return prisma.$transaction(async (tx: any) => {
    const applications = await tx.registrationApplication.findMany({ where: { submission: { campaignId } }, select: { id: true, firstName: true, lastName: true, birthDate: true, status: true, offeringId: true, submission: { select: { submittedAt: true } } }, orderBy: [{ submission: { submittedAt: 'asc' } }, { id: 'asc' }] });
    const rows = applications.map((a: any) => ({ applicationId: a.id, firstName: a.firstName, lastName: a.lastName, birthDate: a.birthDate.toISOString().slice(0, 10), status: a.status, offeringId: a.offeringId, submittedAt: a.submission.submittedAt.toISOString() }));
    const csv = '\uFEFF' + [selected.map(escapeCsvCell).join(','), ...rows.map((row: any) => selected.map(field => escapeCsvCell(row[field])).join(','))].join('\r\n');
    await tx.auditLog.create({ data: { action: 'EXPORT', entityType: 'RegistrationCampaign', entityId: campaignId, parishId: campaign.parishId, userId: context.user.id, metadata: JSON.stringify({ purpose, fields: selected, count: rows.length }) } });
    return { csv, count: rows.length };
  });
}
