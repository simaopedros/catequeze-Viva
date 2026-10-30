import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
vi.mock('wasp/server', async () => { const { PrismaClient } = await import('@prisma/client'); const url = new URL(process.env.DATABASE_URL!); url.searchParams.set('connection_limit', '2'); return { prisma: new PrismaClient({ datasources: { db: { url: url.toString() } } }), HttpError: class extends Error { constructor(public statusCode: number, message?: string) { super(message); } } }; });
import { prisma } from 'wasp/server';
import { syncRegistrationDocumentsToProfile } from '../server/registrations/profileDocuments';
import { storeDocumentFile, deleteDocumentFile } from '../server/storage/documentStorage';
import { reviewRegistrationDocument } from '../server/operations/registrationDocumentOperations';
import { approveRegistrationApplication, linkRegistrationProfile } from '../server/operations/registrationReviewOperations';
const db = new PrismaClient();
const suffix = crypto.randomUUID(); const id = (s: string) => `approval-${s}-${suffix}`;
const entities = new Proxy(db as any, { get(target, key: string) { return Reflect.get(target, key.charAt(0).toLowerCase() + key.slice(1)); } });
const ctx = (name: string) => ({ user: { id: id(name), isAdmin: false }, entities });
const coordinator = ctx('coordinator'), priest = ctx('priest'), secretary = ctx('secretary'), other = ctx('other'), community = ctx('community');
const users = [coordinator, priest, secretary, other, community].map(u => u.user.id);
const application = (name: string, kind: 'MINOR' | 'ADULT' = 'MINOR') => ({ id: id(name), submissionId: id('submission'), offeringId: id('offering'), kind, firstName: 'Sentinela', lastName: name, birthDate: new Date('2010-01-01'), ageAtCutoff: 16, preferences: [], status: 'UNDER_REVIEW' as const });
describe.skipIf(!process.env.DATABASE_URL)('aprovação cadastral com Postgres', () => {
  let enabled: string | undefined;
  beforeAll(async () => {
    enabled = process.env.REGISTRATIONS_ENABLED; process.env.REGISTRATIONS_ENABLED = 'true';
    await db.user.createMany({ data: users.map(id => ({ id })) });
    await db.parish.createMany({ data: [{ id: id('parish'), name: 'Teste' }, { id: id('other-parish'), name: 'Outra' }] });
    await db.community.createMany({ data: [{ id: id('community'), name: 'Comunidade', parishId: id('parish') }, { id: id('community2'), name: 'Outra', parishId: id('parish') }] });
    await db.membership.createMany({ data: [{ userId: coordinator.user.id, parishId: id('parish'), role: 'PARISH_COORDINATOR' }, { userId: priest.user.id, parishId: id('parish'), role: 'PARISH_PRIEST' }, { userId: secretary.user.id, parishId: id('parish'), role: 'PARISH_SECRETARY' }, { userId: other.user.id, parishId: id('other-parish'), role: 'PARISH_COORDINATOR' }, { userId: community.user.id, parishId: id('parish'), role: 'COMMUNITY_COORDINATOR', communityId: id('community') }] });
    const membership = await db.membership.findFirstOrThrow({ where: { userId: community.user.id } });
    await db.registrationPermissionGrant.create({ data: { membershipId: membership.id, action: 'APPROVE_ENROLLMENT', grantedById: coordinator.user.id, reason: 'Teste' } });
    await db.tenantBilling.create({ data: { parishId: id('parish'), plan: 'parish', status: 'ACTIVE' } });
    await db.catecheticalYear.create({ data: { id: id('year'), parishId: id('parish'), name: 'Ano', startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31') } });
    await db.stage.create({ data: { id: id('stage'), yearId: id('year'), name: 'Etapa' } });
    await db.registrationCampaign.create({ data: { id: id('campaign'), slug: id('slug'), title: 'Teste', parishId: id('parish'), yearId: id('year'), createdById: coordinator.user.id, status: 'OPEN', opensAt: new Date('2020-01-01'), closesAt: new Date('2099-01-01'), ageCutoffDate: new Date('2026-01-01'), offeredWindows: [], offeredCommunityIds: [] } });
    await db.registrationOffering.create({ data: { id: id('offering'), campaignId: id('campaign'), stageId: id('stage'), documentStageKind: 'PRE_CATECHESIS', audience: 'BOTH' } });
    await db.registrationSubmission.create({ data: { id: id('submission'), campaignId: id('campaign'), protocol: id('protocol'), requestKey: id('request'), payloadHash: 'hash', status: 'RECEIVED', contactName: 'Pessoa Sentinela', contactEmail: 'sentinela@example.invalid', contactPhone: '123456789', retentionUntil: new Date('2099-01-01') } });
    await db.registrationApplication.createMany({ data: [{ ...application('sibling1'), sponsorName: 'Padrinho Sentinela', sponsorRole: 'PADRINHO' as const, sponsorFromOtherParish: true, sponsorParishName: 'Paróquia' }, application('sibling2'), application('adult', 'ADULT'), application('linked'), application('conflict'), application('foreign'), application('documents', 'ADULT'), { ...application('community'), communityId: id('community') }, { ...application('community-other'), communityId: id('community2') }, { ...application('submitted'), status: 'SUBMITTED' as const }] });
    await db.registrationConsent.create({ data: { applicationId: id('sibling1'), kind: 'PRIVACY', granted: true, textVersion: '1', actorName: 'Pessoa Sentinela', actorRelationship: 'mother' } });
    await db.catechumenProfile.createMany({ data: [{ id: id('profile'), parishId: id('parish'), firstName: 'Original', lastName: 'Pessoa', email: 'original@example.invalid' }, { id: id('foreign-profile'), parishId: id('other-parish'), firstName: 'Outra', lastName: 'Pessoa' }] });
  });
  afterAll(async () => {
    await db.auditLog.deleteMany({ where: { parishId: id('parish') } });
    const files = await db.registrationDocument.findMany({ where: { campaignId: id('campaign') }, select: { s3Key: true } });
    const copied = await db.document.findMany({ where: { catechumenProfile: { parishId: id('parish') } }, select: { s3Key: true } });
    await Promise.all([...files, ...copied].map(f => deleteDocumentFile(f.s3Key)));
    await db.registrationDocument.deleteMany({ where: { campaignId: id('campaign') } });
    await db.registrationConsent.deleteMany({ where: { application: { submissionId: id('submission') } } });
    await db.registrationApplication.deleteMany({ where: { submissionId: id('submission') } });
    await db.registrationSubmission.deleteMany({ where: { id: id('submission') } });
    await db.catechumenSponsor.deleteMany({ where: { catechumenProfile: { parishId: id('parish') } } });
    await db.document.deleteMany({ where: { catechumenProfile: { parishId: id('parish') } } });
    await db.catechumenProfile.deleteMany({ where: { parishId: { in: [id('parish'), id('other-parish')] } } });
    await db.guardianProfile.deleteMany({ where: { household: { parishId: id('parish') } } }); await db.household.deleteMany({ where: { parishId: id('parish') } });
    await db.registrationOffering.deleteMany({ where: { campaignId: id('campaign') } }); await db.registrationCampaign.deleteMany({ where: { id: id('campaign') } }); await db.stage.deleteMany({ where: { id: id('stage') } }); await db.catecheticalYear.deleteMany({ where: { id: id('year') } });
    await db.registrationPermissionGrant.deleteMany({ where: { grantedById: coordinator.user.id } }); await db.membership.deleteMany({ where: { userId: { in: users } } }); await db.tenantBilling.deleteMany({ where: { parishId: id('parish') } }); await db.community.deleteMany({ where: { parishId: id('parish') } }); await db.parish.deleteMany({ where: { id: { in: [id('parish'), id('other-parish')] } } }); await db.user.deleteMany({ where: { id: { in: users } } });
    await db.$disconnect(); await prisma.$disconnect(); if (enabled === undefined) delete process.env.REGISTRATIONS_ENABLED; else process.env.REGISTRATIONS_ENABLED = enabled;
  });
  it('aprova irmãos em paralelo com uma família, responsável e avisos', async () => {
    const results = await Promise.all(['sibling1', 'sibling2'].map(name => approveRegistrationApplication({ id: id(name), revision: 0 }, coordinator)));
    expect(results[0].householdId).toBeTruthy(); expect(results[0].householdId).toBe(results[1].householdId); expect(results[0].documentWarnings).toBeGreaterThan(0);
    expect(await db.guardianProfile.count({ where: { householdId: results[0].householdId } })).toBe(1);
    expect(await db.catechumenSponsor.findFirst({ where: { catechumenProfileId: results[0].profileId! } })).toMatchObject({ role: 'PADRINHO', name: 'Padrinho Sentinela', fromOtherParish: true, parishName: 'Paróquia' });
    await expect(approveRegistrationApplication({ id: id('sibling1'), revision: 0 }, coordinator)).rejects.toMatchObject({ statusCode: 409 });
  });
  it('aprova adulto sem família e impede acesso sem permissão', async () => {
    await expect(approveRegistrationApplication({ id: id('adult'), revision: 0 }, secretary)).rejects.toMatchObject({ statusCode: 403 });
    await expect(approveRegistrationApplication({ id: id('adult'), revision: 0 }, other)).rejects.toMatchObject({ statusCode: 403 });
    const result = await approveRegistrationApplication({ id: id('adult'), revision: 0 }, priest); expect(result.householdId).toBeNull();
    expect((await db.catechumenProfile.findUniqueOrThrow({ where: { id: result.profileId! } })).email).toBe('sentinela@example.invalid');
  });
  it('exige vínculo explícito da paróquia e preserva perfil existente', async () => {
    await expect(linkRegistrationProfile({ id: id('foreign'), revision: 0, catechumenProfileId: id('foreign-profile') }, coordinator)).rejects.toMatchObject({ statusCode: 404 });
    await db.catechumenSponsor.create({ data: { catechumenProfileId: id('profile'), role: 'PADRINHO', name: 'Original' } });
    await db.registrationApplication.update({ where: { id: id('linked') }, data: { sponsorName: 'Não substituir', sponsorRole: 'PADRINHO' } });
    const before = await db.catechumenProfile.findUniqueOrThrow({ where: { id: id('profile') } });
    const originalKey = await storeDocumentFile({ buffer: Buffer.from('%PDF-original'), mimeType: 'application/pdf', keyPrefix: `documents/${id('profile')}` });
    const sourceKey = await storeDocumentFile({ buffer: Buffer.from('%PDF-new'), mimeType: 'application/pdf', keyPrefix: `registrations/${id('campaign')}/${id('linked')}` });
    await db.document.create({ data: { name: 'Original', type: 'BIRTH_CERTIFICATE', status: 'VERIFIED', s3Key: originalKey, catechumenProfileId: id('profile') } });
    await db.registrationDocument.create({ data: { applicationId: id('linked'), campaignId: id('campaign'), type: 'BIRTH_CERTIFICATE', name: 'Novo', s3Key: sourceKey, mimeType: 'application/pdf', sizeBytes: 8, sha256: 'linked', source: 'STAFF', status: 'PENDING' } });
    await linkRegistrationProfile({ id: id('linked'), revision: 0, catechumenProfileId: id('profile') }, coordinator);
    await expect(linkRegistrationProfile({ id: id('conflict'), revision: 0, catechumenProfileId: id('profile') }, coordinator)).rejects.toMatchObject({ statusCode: 409 });
    await approveRegistrationApplication({ id: id('linked'), revision: 1 }, coordinator);
    expect(await db.catechumenProfile.findUniqueOrThrow({ where: { id: id('profile') } })).toEqual(before);
    expect(await db.document.count({ where: { catechumenProfileId: id('profile'), type: 'BIRTH_CERTIFICATE' } })).toBe(1);
    expect(await db.catechumenSponsor.findMany({ where: { catechumenProfileId: id('profile') } })).toHaveLength(1);
    expect((await db.catechumenSponsor.findFirstOrThrow({ where: { catechumenProfileId: id('profile') } })).name).toBe('Original');
    expect(JSON.stringify(await db.auditLog.findMany({ where: { parishId: id('parish') } }))).not.toContain('Sentinela');
    expect(await db.emailMessage.count({ where: { to: 'sentinela@example.invalid' } })).toBe(0);
  });
  it('restringe coordenador à comunidade delegada', async () => {
    await expect(approveRegistrationApplication({ id: id('community-other'), revision: 0 }, community)).rejects.toMatchObject({ statusCode: 403 });
    await expect(approveRegistrationApplication({ id: id('community'), revision: 0 }, community)).resolves.toMatchObject({ status: 'APPROVED' });
  });
  it('exige UNDER_REVIEW, flag e plano ativo', async () => {
    await expect(approveRegistrationApplication({ id: id('submitted'), revision: 0 }, coordinator)).rejects.toMatchObject({ statusCode: 409 });
    process.env.REGISTRATIONS_ENABLED = 'false';
    try { await expect(approveRegistrationApplication({ id: id('submitted'), revision: 0 }, coordinator)).rejects.toMatchObject({ statusCode: 404 }); } finally { process.env.REGISTRATIONS_ENABLED = 'true'; }
    await db.parish.update({ where: { id: id('parish') }, data: { type: 'PERSONAL' } });
    try { await expect(approveRegistrationApplication({ id: id('submitted'), revision: 0 }, coordinator)).rejects.toMatchObject({ statusCode: 403 }); } finally { await db.parish.update({ where: { id: id('parish') }, data: { type: 'PARISH' } }); }
  });
  it('copia apenas documentos disponíveis e sincroniza conferência', async () => {
    const specs = [ ['BIRTH_CERTIFICATE', 'PENDING'], ['BAPTISM_CERTIFICATE', 'VERIFIED'], ['OTHER', 'QUARANTINE'], ['CONSENT_FORM', 'REJECTED'] ] as const;
    for (const [type, status] of specs) {
      const key = await storeDocumentFile({ buffer: Buffer.from('%PDF-test'), mimeType: 'application/pdf', keyPrefix: `registrations/${id('campaign')}/${id('documents')}` });
      await db.registrationDocument.create({ data: { applicationId: id('documents'), campaignId: id('campaign'), type, name: 'Documento', s3Key: key, mimeType: 'application/pdf', sizeBytes: 9, sha256: type, source: 'STAFF', status } });
    }
    const result = await approveRegistrationApplication({ id: id('documents'), revision: 0 }, coordinator);
    await Promise.all([syncRegistrationDocumentsToProfile(id('documents')), syncRegistrationDocumentsToProfile(id('documents'))]);
    const docs = await db.document.findMany({ where: { catechumenProfileId: result.profileId } }); expect(docs).toHaveLength(2);
    const source = await db.registrationDocument.findFirstOrThrow({ where: { applicationId: id('documents'), status: 'PENDING' } });
    expect(docs.find(d => d.sourceRegistrationDocumentId === source.id)?.s3Key).not.toBe(source.s3Key);
    await reviewRegistrationDocument({ id: source.id, decision: 'VERIFY' }, coordinator);
    expect((await db.document.findUniqueOrThrow({ where: { sourceRegistrationDocumentId: source.id } })).status).toBe('VERIFIED');
    const verified = await db.registrationDocument.findFirstOrThrow({ where: { applicationId: id('documents'), type: 'BAPTISM_CERTIFICATE' } });
    await db.registrationDocument.update({ where: { id: verified.id }, data: { status: 'PENDING' } });
    await reviewRegistrationDocument({ id: verified.id, decision: 'REJECT', reason: 'Teste' }, coordinator);
    expect((await db.document.findUniqueOrThrow({ where: { sourceRegistrationDocumentId: verified.id } })).status).toBe('REJECTED');
  });

});
