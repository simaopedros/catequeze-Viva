import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { Resend } from 'resend';
vi.mock('resend', () => ({ Resend: vi.fn() }));
vi.mock('wasp/server', async () => { const { PrismaClient } = await import('@prisma/client'); const url = new URL(process.env.DATABASE_URL!); url.searchParams.set('connection_limit', '2'); return { prisma: new PrismaClient({ datasources: { db: { url: url.toString() } } }), HttpError: class extends Error { constructor(public statusCode: number) { super(); } } }; });
import { prisma } from 'wasp/server';
import { registrationDocumentStatus } from '../server/api/registrationDocuments';
import { registrationFollowUpLink, registrationFollowUpSession } from '../server/api/registrationFollowUp';
import { getFakeSentEmails, resetFakeEmailAdapter } from '../server/email';
import { generateRegistrationAccessToken, hashRegistrationAccessToken } from '../server/security/registrationTokens';
import { resolveEmailProviderName } from '../server/email/config';
const db = new PrismaClient(); const suffix = crypto.randomUUID(); const id = (v: string) => `follow-${v}-${suffix}`;
const entities = new Proxy(db as any, { get(target, key: string) { return Reflect.get(target, key.charAt(0).toLowerCase() + key.slice(1)); } });
const email = `follow-${suffix}@example.invalid`;
async function call(fn: any, body: any) { const out: any = { status: 200, headers: {} }; const res: any = { set(a: any, b?: any) { if (typeof a === 'string') out.headers[a] = b; else Object.assign(out.headers, a); return res; }, status(s: number) { out.status = s; return res; }, json(b: any) { out.body = b; return res; }, end() { return res; } }; const start = Date.now(); await fn({ method: 'POST', ip: '203.0.113.200', is: () => true, body } as any, res, { entities }); out.elapsed = Date.now() - start; return out; }
const token = () => getFakeSentEmails().at(-1)!.text!.match(/#token=([^\s]+)/)![1];
describe.skipIf(!process.env.DATABASE_URL)('acompanhamento privado em Postgres', () => {
 beforeAll(async () => {
  process.env.EMAIL_PROVIDER = 'fake'; process.env.REGISTRATIONS_ENABLED = 'true'; process.env.JWT_SECRET = 'followup-test-secret'; process.env.WASP_WEB_CLIENT_URL = 'https://example.invalid'; resetFakeEmailAdapter();
  await db.user.create({ data: { id: id('user') } }); await db.parish.create({ data: { id: id('parish'), name: 'Paróquia' } }); await db.tenantBilling.create({ data: { parishId: id('parish'), plan: 'parish', status: 'ACTIVE' } });
  await db.catecheticalYear.create({ data: { id: id('year'), parishId: id('parish'), name: 'Ano', startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31') } }); await db.stage.create({ data: { id: id('stage'), yearId: id('year'), name: 'Etapa' } });
  await db.registrationCampaign.create({ data: { id: id('campaign'), slug: id('slug'), title: 'Campanha', parishId: id('parish'), yearId: id('year'), createdById: id('user'), status: 'CLOSED', opensAt: new Date('2020-01-01'), closesAt: new Date('2099-01-01'), ageCutoffDate: new Date('2026-01-01'), offeredWindows: [], offeredCommunityIds: [] } });
  await db.registrationOffering.create({ data: { id: id('offering'), campaignId: id('campaign'), stageId: id('stage'), documentStageKind: 'PRE_CATECHESIS', audience: 'BOTH' } });
  await db.registrationSubmission.create({ data: { id: id('submission'), campaignId: id('campaign'), protocol: id('protocol'), requestKey: id('request'), payloadHash: 'hash', status: 'RECEIVED', contactName: 'Segredo', contactEmail: email, contactVerifiedAt: new Date(), retentionUntil: new Date('2099-01-01') } });
  await db.registrationApplication.create({ data: { id: id('application'), submissionId: id('submission'), offeringId: id('offering'), kind: 'MINOR', firstName: 'Ana', lastName: 'Segredo', birthDate: new Date('2010-01-01'), ageAtCutoff: 16, preferences: [] } });
 });
 afterAll(async () => { await db.emailMessage.deleteMany({ where: { to: email } }); await db.registrationAccessToken.deleteMany({ where: { submissionId: id('submission') } }); await db.registrationApplication.deleteMany({ where: { submissionId: id('submission') } }); await db.registrationSubmission.deleteMany({ where: { id: id('submission') } }); await db.registrationOffering.deleteMany({ where: { campaignId: id('campaign') } }); await db.registrationCampaign.deleteMany({ where: { id: id('campaign') } }); await db.stage.deleteMany({ where: { id: id('stage') } }); await db.catecheticalYear.deleteMany({ where: { id: id('year') } }); await db.tenantBilling.deleteMany({ where: { parishId: id('parish') } }); await db.parish.deleteMany({ where: { id: id('parish') } }); await db.user.deleteMany({ where: { id: id('user') } }); await db.$disconnect(); await prisma.$disconnect(); });
 it('uniformiza a resposta e emite sessão de uso único sem dados privados', async () => {
  expect(resolveEmailProviderName()).toBe('fake'); expect(Resend).not.toHaveBeenCalled();
  const responses: any[] = []; for (const body of [{ protocol: 'inexistente', email }, { protocol: id('protocol'), email: 'wrong@example.invalid' }, { protocol: id('protocol'), email }]) responses.push(await call(registrationFollowUpLink, body));
  expect(responses.map(r => [r.status, r.body])).toEqual(Array(3).fill([202, { status: 'accepted' }])); expect(responses.every(r => r.elapsed >= 290)).toBe(true);
  const raw = token(); const result = await call(registrationFollowUpSession, { token: raw }); expect(result.status).toBe(200); expect(result.body.uploadSession.token).toBeTruthy(); expect(result.body.applicants[0]).toMatchObject({ firstName: 'Ana', status: 'SUBMITTED' }); expect(JSON.stringify(result.body)).not.toContain('Segredo'); expect(JSON.stringify(result.body)).not.toContain(email); expect(result.headers['Cache-Control']).toContain('no-store'); expect((await call(registrationFollowUpSession, { token: raw })).status).toBe(404); expect(Resend).not.toHaveBeenCalled();
  await call(registrationFollowUpLink, { protocol: id('protocol'), email }); const previous = token();
  await call(registrationFollowUpLink, { protocol: id('protocol'), email }); const latest = token();
  expect((await call(registrationFollowUpSession, { token: previous })).status).toBe(404);
  const next = await call(registrationFollowUpSession, { token: latest }); expect(next.status).toBe(200);
  const status = async (bearer: string) => { const out: any = { status: 200 }; const res: any = { set() { return res; }, status(v: number) { out.status = v; return res; }, json(v: any) { out.body = v; return res; }, end() { return res; } }; await registrationDocumentStatus({ ip: '203.0.113.201', get: () => `Bearer ${bearer}` } as any, res, { entities }); return out.status; };
  expect(await status(result.body.uploadSession.token)).toBe(401); expect(await status(next.body.uploadSession.token)).toBe(200);
  const oldUpload = await db.registrationAccessToken.findUniqueOrThrow({ where: { tokenHash: hashRegistrationAccessToken(result.body.uploadSession.token) } }); expect(oldUpload.revokedAt).not.toBeNull();
  const expired = generateRegistrationAccessToken(); await db.registrationAccessToken.create({ data: { submissionId: id('submission'), campaignId: id('campaign'), emailHash: 'hash', purpose: 'FOLLOW_UP', tokenHash: hashRegistrationAccessToken(expired), expiresAt: new Date(Date.now() - 1000) } });
  expect((await call(registrationFollowUpSession, { token: expired })).status).toBe(404);
  expect((await call(registrationFollowUpSession, { token: next.body.uploadSession.token })).status).toBe(404);
 });
 it('não emite sessão de envio para inscrições rejeitadas', async () => {
  await db.registrationApplication.update({ where: { id: id('application') }, data: { status: 'REJECTED' } });
  const raw = generateRegistrationAccessToken(); await db.registrationAccessToken.create({ data: { submissionId: id('submission'), campaignId: id('campaign'), emailHash: 'hash', purpose: 'FOLLOW_UP', tokenHash: hashRegistrationAccessToken(raw), expiresAt: new Date(Date.now() + 3600000) } });
  const result = await call(registrationFollowUpSession, { token: raw }); expect(result.status).toBe(200); expect(result.body.uploadSession).toBeNull(); expect(result.body.applicants[0].status).toBe('REJECTED');
 });

});
