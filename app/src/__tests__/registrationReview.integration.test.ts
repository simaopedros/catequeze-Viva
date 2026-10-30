import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
vi.mock('wasp/server', async () => { const { PrismaClient } = await import('@prisma/client'); return { prisma: new PrismaClient(), HttpError: class extends Error { constructor(public statusCode: number, message?: string) { super(message); } } }; });
import { prisma } from 'wasp/server';
import { createAssistedRegistration, getRegistrationApplication, getRegistrationReviewOptions, listRegistrationApplications, reviewRegistrationApplication } from '../server/operations/registrationReviewOperations';
import { getFakeSentEmails, resetFakeEmailAdapter } from '../server/email';
const db = new PrismaClient(); const suffix = crypto.randomUUID(); const id = (s: string) => `review-${s}-${suffix}`;
const entities = new Proxy(db as any, { get(target, key: string) { return Reflect.get(target, key.charAt(0).toLowerCase() + key.slice(1)); } });
const ctx = (role: string) => ({ user: { id: id(role), isAdmin: false }, entities });
const actor = ctx('coordinator'), secretary = ctx('secretary'), priest = ctx('priest'), catechist = ctx('catechist'), other = ctx('other');
const input = () => ({ requestKey: crypto.randomUUID(), mode: 'ADULT', consentConfirmedByStaff: true, contactEmail: 'sentinela-review@example.invalid', contactPhone: '11999999999', applicant: { firstName: 'Sentinela', lastName: 'Pessoa', birthDate: '1990-01-01', offeringId: id('offering'), windows: ['sat'] } });
const create = (data: any, context = secretary) => createAssistedRegistration({ campaignId: id('campaign'), data }, context);
let submission: any;
describe.skipIf(!process.env.DATABASE_URL)('conferência com banco real', () => {
  beforeAll(async () => {
    process.env.REGISTRATIONS_ENABLED = 'true'; process.env.EMAIL_PROVIDER = 'fake'; resetFakeEmailAdapter();
    await db.user.createMany({ data: [actor, secretary, priest, catechist, other].map(c => ({ id: c.user.id })) });
    await db.parish.createMany({ data: [{ id: id('parish'), name: 'Teste' }, { id: id('other-parish'), name: 'Outra' }] });
    await db.membership.createMany({ data: [ { userId: actor.user.id, parishId: id('parish'), role: 'PARISH_COORDINATOR' }, { userId: secretary.user.id, parishId: id('parish'), role: 'PARISH_SECRETARY' }, { userId: priest.user.id, parishId: id('parish'), role: 'PARISH_PRIEST' }, { userId: catechist.user.id, parishId: id('parish'), role: 'LEAD_CATECHIST' }, { userId: other.user.id, parishId: id('other-parish'), role: 'PARISH_COORDINATOR' } ] });
    await db.tenantBilling.create({ data: { parishId: id('parish'), plan: 'parish', status: 'ACTIVE' } });
    await db.catecheticalYear.create({ data: { id: id('year'), parishId: id('parish'), name: 'Ano', startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31') } });
    await db.stage.create({ data: { id: id('stage'), yearId: id('year'), name: 'Etapa' } });
    await db.registrationCampaign.create({ data: { id: id('campaign'), slug: id('slug'), title: 'Teste', parishId: id('parish'), yearId: id('year'), createdById: actor.user.id, status: 'OPEN', opensAt: new Date('2020-01-01'), closesAt: new Date('2099-01-01'), ageCutoffDate: new Date('2026-01-01'), offeredWindows: [{ id: 'sat', weekday: 6, startTime: '09:00', endTime: '10:00', label: 'Sábado' }], offeredCommunityIds: [] } });
    await db.registrationOffering.create({ data: { id: id('offering'), campaignId: id('campaign'), stageId: id('stage'), documentStageKind: 'PRE_CATECHESIS', audience: 'BOTH' } });
    await db.catechumenProfile.createMany({ data: [{ id: id('local'), parishId: id('parish'), firstName: 'Sentinela', lastName: 'Pessoa', birthDate: new Date('1990-01-01') }, { id: id('foreign'), parishId: id('other-parish'), firstName: 'Sentinela', lastName: 'Pessoa', birthDate: new Date('1990-01-01') }] });
  });
  afterAll(async () => {
    await db.rateLimitBucket.deleteMany({ where: { key: `registration-assisted-user:${secretary.user.id}` } });
    await db.auditLog.deleteMany({ where: { parishId: id('parish') } });
    await db.registrationDocument.deleteMany({ where: { campaignId: id('campaign') } }); await db.documentStageRule.deleteMany({ where: { parishId: id('parish') } });
    await db.registrationConsent.deleteMany({ where: { application: { submission: { campaignId: id('campaign') } } } }); await db.registrationApplication.deleteMany({ where: { submission: { campaignId: id('campaign') } } }); await db.registrationSubmission.deleteMany({ where: { campaignId: id('campaign') } });
    await db.registrationOffering.deleteMany({ where: { campaignId: id('campaign') } }); await db.registrationCampaign.deleteMany({ where: { id: id('campaign') } }); await db.stage.deleteMany({ where: { id: id('stage') } }); await db.catecheticalYear.deleteMany({ where: { id: id('year') } });
    await db.catechumenProfile.deleteMany({ where: { id: { in: [id('local'), id('foreign')] } } }); await db.membership.deleteMany({ where: { userId: { in: [actor, secretary, priest, catechist, other].map(c => c.user.id) } } }); await db.tenantBilling.deleteMany({ where: { parishId: id('parish') } }); await db.parish.deleteMany({ where: { id: { in: [id('parish'), id('other-parish')] } } }); await db.user.deleteMany({ where: { id: { in: [actor, secretary, priest, catechist, other].map(c => c.user.id) } } }); await db.$disconnect(); await prisma.$disconnect();
  });
  it('cria com consentimento, sem e-mail e com idempotência', async () => {
    const data: any = input(); const withSponsor = { ...data, applicant: { ...data.applicant, sponsor: { role: 'MADRINHA', name: 'Maria', fromOtherParish: true, parishName: 'Outra' } } }; submission = await create(withSponsor); data.applicant = withSponsor.applicant; expect(await create(data)).toEqual(submission);
    const record = await db.registrationSubmission.findUniqueOrThrow({ where: { id: submission.submissionId }, include: { applications: { include: { consents: true } } } });
    expect(record.applications[0]).toMatchObject({ sponsorName: 'Maria', sponsorRole: 'MADRINHA', sponsorFromOtherParish: true, sponsorParishName: 'Outra' });
    expect(record).toMatchObject({ source: 'ASSISTED', status: 'RECEIVED', createdByUserId: secretary.user.id, contactVerifiedAt: null }); expect(record.applications[0].consents[0].textVersion).toBe('registration-consent-v1'); expect(getFakeSentEmails()).toHaveLength(0);
    await expect(create({ ...data, contactPhone: '11988888888' })).rejects.toMatchObject({ statusCode: 409 });
  });
  it('entrega opções da campanha só a quem pode conferir', async () => {
    const args = { campaignId: id('campaign') };
    const options = await getRegistrationReviewOptions(args, secretary);
    expect(options.windows.map((w: any) => w.id)).toEqual(['sat']); expect(options.offerings).toEqual([{ id: id('offering'), name: 'Etapa', audience: 'BOTH' }]); expect(options.status).toBe('OPEN');
    for (const user of [priest, catechist, other]) await expect(getRegistrationReviewOptions(args, user)).rejects.toMatchObject({ statusCode: 403 });
    process.env.REGISTRATIONS_ENABLED = 'false'; try { await expect(getRegistrationReviewOptions(args, actor)).rejects.toMatchObject({ statusCode: 404 }); } finally { process.env.REGISTRATIONS_ENABLED = 'true'; }
  });
  it('aplica permissões, flag e plano', async () => {
    const args = { campaignId: id('campaign') }; await expect(listRegistrationApplications(args, actor)).resolves.toHaveLength(1); await expect(listRegistrationApplications(args, secretary)).resolves.toHaveLength(1);
    for (const user of [priest, catechist, other]) await expect(listRegistrationApplications(args, user)).rejects.toMatchObject({ statusCode: 403 });
    process.env.REGISTRATIONS_ENABLED = 'false'; await expect(listRegistrationApplications(args, actor)).rejects.toMatchObject({ statusCode: 404 }); process.env.REGISTRATIONS_ENABLED = 'true';
    await db.tenantBilling.delete({ where: { parishId: id('parish') } }); try { await expect(listRegistrationApplications(args, { ...actor, entities: Object.create(entities) })).rejects.toMatchObject({ statusCode: 403 }); } finally { await db.tenantBilling.create({ data: { parishId: id('parish'), plan: 'parish', status: 'ACTIVE' } }); }
  });
  it('pagina sem contato e limita duplicidades à paróquia', async () => {
    const withoutSponsor = await create(input()); const stored = await db.registrationApplication.findUniqueOrThrow({ where: { id: withoutSponsor.applicationIds[0] } }); expect(stored.sponsorFromOtherParish).toBeNull();
    const one = await listRegistrationApplications({ campaignId: id('campaign'), take: 1 }, actor); const two = await listRegistrationApplications({ campaignId: id('campaign'), take: 1, cursor: one[0].id }, actor); expect(two).toHaveLength(1); expect(two[0].id).not.toBe(one[0].id); expect(JSON.stringify(one)).not.toContain('sentinela-review@example.invalid'); expect(JSON.stringify(one)).not.toContain('11999999999');
    const detail = await getRegistrationApplication({ id: submission.applicationIds[0] }, actor); expect(detail.contactEmail).toBe('sentinela-review@example.invalid'); expect(detail.duplicateSuggestions.map((x: any) => x.id)).toEqual([id('local')]);
  });
  it('apresenta avisos e documentos sem chave e aplica regra da paróquia', async () => {
    await db.documentStageRule.create({ data: { scope: 'PARISH', parishId: id('parish'), stageKind: 'PRE_CATECHESIS', documentType: 'BIRTH_CERTIFICATE', requirement: 'REQUIRED', changedById: actor.user.id } });
    await db.registrationDocument.create({ data: { applicationId: submission.applicationIds[0], campaignId: id('campaign'), type: 'BIRTH_CERTIFICATE', name: 'Certidão', s3Key: 'private-key', mimeType: 'application/pdf', sizeBytes: 10, sha256: 'hash', source: 'STAFF', status: 'REJECTED' } });
    const detail = await getRegistrationApplication({ id: submission.applicationIds[0] }, actor);
    expect(detail.documents).toHaveLength(1); expect(JSON.stringify(detail)).not.toContain('private-key');
    expect(detail.documentChecklist.warnings).toContain('BIRTH_CERTIFICATE'); expect(detail.documentChecklist.blocking).toBe(false);
    const list = await listRegistrationApplications({ campaignId: id('campaign') }, actor);
    expect(list.find((x: any) => x.id === submission.applicationIds[0]).documentWarnings).toBe(detail.documentChecklist.warnings.length);
  });
  it('revisa com concorrência e auditoria sem dados pessoais', async () => {
    const args = { id: submission.applicationIds[0], revision: 0, decision: 'START_REVIEW', note: 'Sentinela Pessoa' }; await reviewRegistrationApplication(args, actor);
    await expect(reviewRegistrationApplication(args, actor)).rejects.toMatchObject({ statusCode: 409 }); await expect(reviewRegistrationApplication({ ...args, revision: 1 }, actor)).rejects.toMatchObject({ statusCode: 409 });
    const audit = JSON.stringify(await db.auditLog.findMany({ where: { parishId: id('parish') } })); expect(audit).not.toContain('Sentinela'); expect(audit).not.toContain('sentinela-review@example.invalid');
  });
  it('recusa janela, campanha fechada e falha do limitador', async () => {
    const data = input(); await expect(create({ ...data, applicant: { ...data.applicant, windows: ['outra'] } })).rejects.toMatchObject({ statusCode: 400 });
    await expect(create({ ...data, applicant: { ...data.applicant, communityId: 'outra-paroquia' } })).rejects.toMatchObject({ statusCode: 400 });
    await db.registrationCampaign.update({ where: { id: id('campaign') }, data: { status: 'CLOSED' } }); try { await expect(create(data)).rejects.toMatchObject({ statusCode: 409 }); } finally { await db.registrationCampaign.update({ where: { id: id('campaign') }, data: { status: 'OPEN' } }); }
    const key = `registration-assisted-user:${secretary.user.id}`;
    await db.rateLimitBucket.update({ where: { key }, data: { count: 60, resetAt: new Date(Date.now() + 3600000) } });
    await expect(create(data)).rejects.toMatchObject({ statusCode: 429 });
    await db.rateLimitBucket.delete({ where: { key } });
    const spy = vi.spyOn(prisma, '$queryRaw').mockRejectedValueOnce(new Error('falha sintética')); try { await expect(create(data)).rejects.toMatchObject({ statusCode: 503 }); } finally { spy.mockRestore(); }
  });
});
