import { prisma } from 'wasp/server';
import { deleteDocumentFile, readDocumentFile, storeDocumentFile } from '../storage/documentStorage';

/** Copies files outside database transactions; the source id makes retries safe. */
export async function syncRegistrationDocumentsToProfile(applicationId: string) {
  const application = await prisma.registrationApplication.findUnique({ where: { id: applicationId }, select: { catechumenProfileId: true } });
  const profileId = application?.catechumenProfileId;
  if (!profileId) return;
  const documents = await prisma.registrationDocument.findMany({ where: { applicationId, status: { in: ['PENDING', 'VERIFIED', 'REJECTED'] } } });
  for (const source of documents) {
    const existing = await prisma.document.findUnique({ where: { sourceRegistrationDocumentId: source.id } });
    if (existing) {
      await prisma.document.update({ where: { id: existing.id }, data: { status: source.status, verifiedAt: source.verifiedAt, verifiedById: source.verifiedById, rejectedAt: source.rejectedAt, rejectedReason: source.rejectedReason } });
      continue;
    }
    if (source.status === 'REJECTED' || await prisma.document.findFirst({ where: { catechumenProfileId: profileId, type: source.type, status: { in: ['PENDING', 'VERIFIED'] } }, select: { id: true } })) continue;
    const file = await readDocumentFile(source.s3Key);
    if (!file) throw new Error('Registration document file unavailable');
    const key = await storeDocumentFile({ buffer: file.buffer, mimeType: source.mimeType, keyPrefix: `documents/${profileId}` });
    try {
      const inserted = await prisma.$transaction(async tx => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${profileId}:${source.type}`}, 0))`;
        const current = await tx.registrationDocument.findUnique({ where: { id: source.id } });
        if (!current || !['PENDING', 'VERIFIED'].includes(current.status) || await tx.document.findFirst({ where: { OR: [{ sourceRegistrationDocumentId: source.id }, { catechumenProfileId: profileId, type: source.type, status: { in: ['PENDING', 'VERIFIED'] } }] }, select: { id: true } })) return false;
        await tx.document.create({ data: { name: current.name, type: current.type, s3Key: key, mimeType: current.mimeType, status: current.status, catechumenProfileId: profileId, uploadedById: current.uploadedByUserId, verifiedAt: current.verifiedAt, verifiedById: current.verifiedById, sourceRegistrationDocumentId: current.id } });
        return true;
      });
      if (!inserted) await deleteDocumentFile(key);
    } catch (error: any) {
      await deleteDocumentFile(key).catch(() => {});
      if (error?.code !== 'P2002') throw error;
    }
  }
}
