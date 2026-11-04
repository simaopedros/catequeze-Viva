import { logger } from '../logger';
import { syncRegistrationDocumentsToProfile } from './profileDocuments';
import { createHash } from 'node:crypto';
import { HttpError, prisma } from 'wasp/server';
import { storeDocumentFile, deleteDocumentFile } from '../storage/documentStorage';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES, TYPE_LABELS, VALID_DOCUMENT_TYPES, validateFileSignature } from '../storage/uploadValidation';
import { registrationFileScanner, type RegistrationFileScanner } from '../security/registrationFileScanner';

export async function uploadRegistrationDocument(input: { applicationId: string; campaignId: string; type: string; file: Express.Multer.File; source: 'FAMILY' | 'STAFF'; userId?: string; parishId?: string }, scanner: RegistrationFileScanner = registrationFileScanner()) {
  const { file, type } = input;
  if (!file || !(VALID_DOCUMENT_TYPES as readonly string[]).includes(type) || !(ALLOWED_MIME_TYPES as readonly string[]).includes(file.mimetype) || file.size > MAX_FILE_SIZE_BYTES || !validateFileSignature(file.buffer, file.mimetype)) throw new HttpError(400, 'Arquivo ou tipo inválido.');
  const sha256 = createHash('sha256').update(file.buffer).digest('hex');
  let key: string | undefined;
  let created: any;
  try {
    const result = await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "RegistrationApplication" WHERE "id" = ${input.applicationId} FOR UPDATE`;
      if (input.source === 'FAMILY') {
        const campaign = await tx.registrationCampaign.findUnique({ where: { id: input.campaignId }, select: { status: true } });
        const application = await tx.registrationApplication.findFirst({ where: { id: input.applicationId, submission: { campaignId: input.campaignId }, status: { notIn: ['REJECTED', 'WITHDRAWN'] } }, select: { id: true } });
        if (!application || !campaign || !['OPEN', 'CLOSED', 'ORGANIZING'].includes(campaign.status)) throw new HttpError(404);
      }
      const existing = await tx.registrationDocument.findFirst({ where: { applicationId: input.applicationId, type: type as any, sha256 }, select: { id: true, type: true, status: true } });
      if (existing) return { document: existing, created: false };
      const count = await tx.registrationDocument.count({ where: { applicationId: input.applicationId, status: { not: 'REJECTED' } } });
      if (count >= 10) throw new HttpError(400, 'Limite de documentos atingido.');
      key = await storeDocumentFile({ buffer: file.buffer, mimeType: file.mimetype, keyPrefix: `registrations/${input.campaignId}/${input.applicationId}` });
      const doc = await tx.registrationDocument.create({ data: { applicationId: input.applicationId, campaignId: input.campaignId, type: type as any, name: TYPE_LABELS[type], s3Key: key, mimeType: file.mimetype, sizeBytes: file.size, sha256, source: input.source, uploadedByUserId: input.userId ?? null, status: 'QUARANTINE' }, select: { id: true, type: true, status: true } });
      if (input.userId && input.parishId) await tx.auditLog.create({ data: { action: 'CREATE', entityType: 'RegistrationDocument', entityId: doc.id, parishId: input.parishId, userId: input.userId, metadata: JSON.stringify({ applicationId: input.applicationId, campaignId: input.campaignId }) } });
      return { document: doc, created: true };
    });
    if (!result.created) return result.document;
    created = result.document;
  } catch (error) { if (key) await deleteDocumentFile(key).catch(() => {}); throw error; }
  let scan: 'clean' | 'infected' | 'unavailable' = 'unavailable';
  let timer: ReturnType<typeof setTimeout> | undefined;
  try { scan = await Promise.race([scanner.scan(file.buffer, file.mimetype), new Promise<'unavailable'>(resolve => { timer = setTimeout(() => resolve('unavailable'), 4000); })]); } catch {} finally { if (timer) clearTimeout(timer); }
  if (scan === 'infected') {
    await deleteDocumentFile(key!);
    return prisma.registrationDocument.update({ where: { id: created.id }, data: { status: 'REJECTED', rejectedAt: new Date(), rejectedReason: 'Arquivo recusado pela análise de segurança', scannedAt: new Date() }, select: { id: true, type: true, status: true } });
  }
  if (scan === 'clean') {
    const document = await prisma.registrationDocument.update({ where: { id: created.id }, data: { status: 'PENDING', scannedAt: new Date() }, select: { id: true, type: true, status: true } });
    const application = await prisma.registrationApplication.findUnique({ where: { id: input.applicationId }, select: { status: true } });
    if (application?.status === 'APPROVED') try { await syncRegistrationDocumentsToProfile(input.applicationId); } catch { logger.warn('registration_document_sync_failed', { applicationId: input.applicationId }); }
    return document;
  }
  return created;
}
