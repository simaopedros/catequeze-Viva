import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { Resend } from 'resend';
vi.mock('resend', () => ({ Resend: vi.fn() }));
vi.mock('wasp/server', async () => { const { PrismaClient } = await import('@prisma/client'); const url = new URL(process.env.DATABASE_URL!); url.searchParams.set('connection_limit', '2'); return { prisma: new PrismaClient({ datasources: { db: { url: url.toString() } } }), HttpError: class extends Error { constructor(public statusCode: number) { super(); } } }; });
import { prisma } from 'wasp/server';
import * as emailService from '../server/email';
import { sendRegistrationRemindersJob } from '../server/scripts/registrationRemindersJob';
import { getFakeSentEmails, resetFakeEmailAdapter } from '../server/email';
import { hashEmail } from '../server/email/hash';
import { resolveEmailProviderName } from '../server/email/config';
const db = new PrismaClient(); const suffix = crypto.randomUUID(); const id = (v: string) => `reminder-${v}-${suffix}`;
const entities = new Proxy(db as any, { get(target, key: string) { return Reflect.get(target, key.charAt(0).toLowerCase() + key.slice(1)); } });
const email = `reminder-${suffix}@example.invalid`;
describe.skipIf(!process.env.DATABASE_URL)('lembretes em Postgres', () => {
 beforeAll(async () => {
  process.env.EMAIL_PROVIDER = 'fake'; process.env.REGISTRATIONS_ENABLED = 'true'; process.env.JWT_SECRET = 'followup-test-secret'; process.env.WASP_WEB_CLIENT_URL = 'https://example.invalid'; resetFakeEmailAdapter();
  await db.user.create({ data: { id: id('user') } }); await db.parish.create({ data: { id: id('parish'), name: 'Paróquia' } }); await db.tenantBilling.create({ data: { parishId: id('parish'), plan: 'parish', status: 'ACTIVE' } });
  await db.catecheticalYear.create({ data: { id: id('year'), parishId: id('parish'), name: 'Ano', startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31') } }); await db.stage.create({ data: { id: id('stage'), yearId: id('year'), name: 'Etapa' } });
  await db.registrationCampaign.create({ data: { id: id('campaign'), slug: id('slug'), title: 'Campanha', parishId: id('parish'), yearId: id('year'), createdById: id('user'), status: 'CLOSED', opensAt: new Date('2020-01-01'), closesAt: new Date('2099-01-01'), ageCutoffDate: new Date('2026-01-01'), offeredWindows: [], offeredCommunityIds: [] } });
  await db.registrationOffering.create({ data: { id: id('offering'), campaignId: id('campaign'), stageId: id('stage'), documentStageKind: 'PRE_CATECHESIS', audience: 'BOTH' } });
  await db.registrationSubmission.create({ data: { id: id('submission'), campaignId: id('campaign'), protocol: id('protocol'), requestKey: id('request'), payloadHash: 'hash', status: 'RECEIVED', contactName: 'Segredo', contactEmail: email, contactVerifiedAt: new Date(), submittedAt: new Date(Date.now() - 4 * 86400000), retentionUntil: new Date('2099-01-01') } });
  await db.registrationApplication.create({ data: { id: id('application'), submissionId: id('submission'), offeringId: id('offering'), kind: 'MINOR', firstName: 'Ana', lastName: 'Segredo', birthDate: new Date('2010-01-01'), ageAtCutoff: 16, preferences: [] } });
 });
 afterAll(async () => { await db.emailMessage.deleteMany({ where: { to: email } }); await db.registrationAccessToken.deleteMany({ where: { submissionId: id('submission') } }); await db.registrationApplication.deleteMany({ where: { submissionId: id('submission') } }); await db.registrationSubmission.deleteMany({ where: { id: id('submission') } }); await db.registrationOffering.deleteMany({ where: { campaignId: id('campaign') } }); await db.registrationCampaign.deleteMany({ where: { id: id('campaign') } }); await db.stage.deleteMany({ where: { id: id('stage') } }); await db.catecheticalYear.deleteMany({ where: { id: id('year') } }); await db.tenantBilling.deleteMany({ where: { parishId: id('parish') } }); await db.parish.deleteMany({ where: { id: id('parish') } }); await db.user.deleteMany({ where: { id: id('user') } }); await db.$disconnect(); await prisma.$disconnect(); });
 it('reserva apenas uma vez em execuções concorrentes e respeita pausa e prazo', async () => {
  expect(resolveEmailProviderName()).toBe('fake'); expect(Resend).not.toHaveBeenCalled();
  await Promise.all([sendRegistrationRemindersJob(undefined, { entities }), sendRegistrationRemindersJob(undefined, { entities })]);
  let submission = await db.registrationSubmission.findUniqueOrThrow({ where: { id: id('submission') } }); expect(submission.reminderCount).toBe(1);
  expect(await db.emailMessage.count({ where: { to: email, messageId: 'registration.reminder' } })).toBe(1);
  const message = getFakeSentEmails().at(-1)!; expect(JSON.stringify(message)).not.toContain('Ana'); expect(JSON.stringify(message)).not.toContain('#token=');
  await sendRegistrationRemindersJob(undefined, { entities }); expect((await db.registrationSubmission.findUniqueOrThrow({ where: { id: id('submission') } })).reminderCount).toBe(1);
  await db.registrationSubmission.update({ where: { id: id('submission') }, data: { lastReminderAt: new Date(Date.now() - 8 * 86400000), remindersPausedAt: new Date() } });
  await sendRegistrationRemindersJob(undefined, { entities }); expect((await db.registrationSubmission.findUniqueOrThrow({ where: { id: id('submission') } })).reminderCount).toBe(1);
  await db.registrationSubmission.update({ where: { id: id('submission') }, data: { remindersPausedAt: null } }); await sendRegistrationRemindersJob(undefined, { entities });
  submission = await db.registrationSubmission.findUniqueOrThrow({ where: { id: id('submission') } }); expect(submission.reminderCount).toBe(2);
  await sendRegistrationRemindersJob(undefined, { entities }); expect((await db.registrationSubmission.findUniqueOrThrow({ where: { id: id('submission') } })).reminderCount).toBe(2); expect(Resend).not.toHaveBeenCalled();
 });
 it('ignora flag desligada, campanhas indisponíveis, contato não verificado e inscrições terminais', async () => {
  const reset = () => db.registrationSubmission.update({ where: { id: id('submission') }, data: { reminderCount: 0, lastReminderAt: null, submittedAt: new Date(Date.now() - 4 * 86400000), contactVerifiedAt: new Date() } });
  await reset();
  await db.registrationSubmission.update({ where: { id: id('submission') }, data: { submittedAt: new Date(Date.now() - 2 * 86400000) } });
  await sendRegistrationRemindersJob(undefined, { entities }); expect((await db.registrationSubmission.findUniqueOrThrow({ where: { id: id('submission') } })).reminderCount).toBe(0); await reset();
  process.env.REGISTRATIONS_ENABLED = 'false'; await sendRegistrationRemindersJob(undefined, { entities }); process.env.REGISTRATIONS_ENABLED = 'true';
  for (const status of ['DRAFT', 'ARCHIVED'] as const) { await db.registrationCampaign.update({ where: { id: id('campaign') }, data: { status } }); await sendRegistrationRemindersJob(undefined, { entities }); }
  await db.registrationCampaign.update({ where: { id: id('campaign') }, data: { status: 'CLOSED' } });
  await db.registrationSubmission.update({ where: { id: id('submission') }, data: { contactVerifiedAt: null } }); await sendRegistrationRemindersJob(undefined, { entities });
  await reset(); await db.registrationApplication.update({ where: { id: id('application') }, data: { status: 'REJECTED' } }); await sendRegistrationRemindersJob(undefined, { entities });
  expect((await db.registrationSubmission.findUniqueOrThrow({ where: { id: id('submission') } })).reminderCount).toBe(0);
  await db.registrationApplication.update({ where: { id: id('application') }, data: { status: 'SUBMITTED' } });
 });
 it('não envia quando todos os documentos obrigatórios estão completos', async () => {
  const types = ['BIRTH_CERTIFICATE', 'BAPTISM_CERTIFICATE', 'CONSENT_FORM', 'MARRIAGE_CERTIFICATE', 'PASTORAL_LETTER', 'OTHER'] as const;
  await db.registrationDocument.createMany({ data: types.map(type => ({ applicationId: id('application'), campaignId: id('campaign'), type, name: 'Documento', s3Key: 'test-key', mimeType: 'application/pdf', sizeBytes: 1, sha256: type, source: 'STAFF' as const, status: 'VERIFIED' as const })) });
  try { await sendRegistrationRemindersJob(undefined, { entities }); expect((await db.registrationSubmission.findUniqueOrThrow({ where: { id: id('submission') } })).reminderCount).toBe(0); } finally { await db.registrationDocument.deleteMany({ where: { applicationId: id('application') } }); }
 });
 it('mantém reserva quando o destinatário está suprimido', async () => {
  await db.emailMessage.deleteMany({ where: { to: email } });
  await db.registrationSubmission.update({ where: { id: id('submission') }, data: { reminderCount: 0, lastReminderAt: null } });
  await db.emailSuppression.create({ data: { email, emailHash: hashEmail(email), reason: 'HARD_BOUNCE', source: 'test' } });
  try { const result = await sendRegistrationRemindersJob(undefined, { entities }); expect(result.skipped).toBe(1); expect((await db.registrationSubmission.findUniqueOrThrow({ where: { id: id('submission') } })).reminderCount).toBe(1); expect(await db.emailMessage.count({ where: { to: email } })).toBe(0); } finally { await db.emailSuppression.deleteMany({ where: { email } }); }
 });

 it('reverte reserva se o enfileiramento falhar', async () => {
  await db.registrationSubmission.update({ where: { id: id('submission') }, data: { reminderCount: 0, lastReminderAt: null } });
  const mock = vi.spyOn(emailService, 'enqueueEmail').mockRejectedValueOnce(new Error('erro de teste'));
  try { const result = await sendRegistrationRemindersJob(undefined, { entities }); expect(result.failed).toBe(1); expect(await db.registrationSubmission.findUniqueOrThrow({ where: { id: id('submission') } })).toMatchObject({ reminderCount: 0, lastReminderAt: null }); } finally { mock.mockRestore(); }
 });
 it('limita a 50 submissões por campanha', async () => {
  await db.registrationSubmission.update({ where: { id: id('submission') }, data: { remindersPausedAt: new Date() } });
  const submissions = Array.from({ length: 51 }, (_, i) => ({ id: id(`bulk-${i}`), campaignId: id('campaign'), protocol: id(`bulk-protocol-${i}`), requestKey: id(`bulk-request-${i}`), payloadHash: 'hash', status: 'RECEIVED' as const, contactName: 'Teste', contactEmail: email, contactVerifiedAt: new Date(), submittedAt: new Date(Date.now() - 4 * 86400000), retentionUntil: new Date('2099-01-01') }));
  await db.registrationSubmission.createMany({ data: submissions });
  await db.registrationApplication.createMany({ data: submissions.map((v, i) => ({ id: id(`bulk-app-${i}`), submissionId: v.id, offeringId: id('offering'), kind: 'MINOR' as const, firstName: 'Sentinela', lastName: 'Teste', birthDate: new Date('2010-01-01'), ageAtCutoff: 16, preferences: [] })) });
  try { const result = await sendRegistrationRemindersJob(undefined, { entities }); expect(result.reserved).toBe(50); expect(await db.registrationSubmission.count({ where: { id: { in: submissions.map(v => v.id) }, reminderCount: 1 } })).toBe(50); } finally { await db.emailMessage.deleteMany({ where: { to: email } }); await db.registrationApplication.deleteMany({ where: { submissionId: { in: submissions.map(v => v.id) } } }); await db.registrationSubmission.deleteMany({ where: { id: { in: submissions.map(v => v.id) } } }); }
 });

});
