import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { createHash } from 'node:crypto';
import { Resend } from 'resend';
vi.mock('resend', () => ({ Resend: vi.fn() }));
vi.mock('wasp/server', async () => { const { PrismaClient } = await import('@prisma/client'); return { prisma: new PrismaClient(), HttpError: class extends Error { constructor(public statusCode: number) { super(); } } }; });
import { prisma } from 'wasp/server';
import { registrationFormToken, registrationSubmission } from '../server/api/registrationSubmission';
import express from 'express';
import { registrationConfirm, registrationResendConfirmation, registrationConfirmationMiddleware } from '../server/api/registrationConfirmation';
import { registrationSubmissionMiddleware } from '../server/api/registrationSubmission';
import { logger } from '../server/logger';
import { createRegistrationFormToken, hashRegistrationAccessToken } from '../server/security/registrationTokens';
import { getFakeSentEmails, resetFakeEmailAdapter } from '../server/email';
import { getEmailProvider } from '../server/email/factory';

const db = new PrismaClient();
const suffix = crypto.randomUUID().slice(0, 8);
const id = (s: string) => `regsub-${s}-${suffix}`;
const slug = `regsub-${suffix}`;
const entities = new Proxy(db as any, { get(target, key: string) { return Reflect.get(target, key.charAt(0).toLowerCase() + key.slice(1)); } });
const verifier = { verify: async () => 'valid' as const };
const secret = 'synthetic-secret-for-testing';
const formToken = () => createRegistrationFormToken(id('campaign'), secret, Date.now() - 9000);
const adult = () => ({ requestKey: crypto.randomUUID(), mode: 'ADULT', consent: true, formToken: formToken(), captchaToken: 'fake', applicant: { firstName: 'Pessoa', lastName: 'Exemplo', birthDate: '1990-01-01', offeringId: id('offering'), windows: ['sat'] } });
async function call(body: any, captcha: any = verifier) {
  const out: any = { headers: {} }; const res: any = { set(a: any, b?: string) { if (typeof a === 'string') out.headers[a] = b; else Object.assign(out.headers, a); return res; }, status(s: number) { out.status = s; return res; }, json(b: any) { out.body = b; return res; }, end() { return res; } };
  await registrationSubmission({ method: 'POST', params: { slug }, ip: '203.0.113.42', is: () => true, body } as any, res, { entities: Object.create(entities) }, captcha);
  return out;
}
async function confirmCall(token: string) {
  const out: any = { headers: {}, status: 200 }; const res: any = { set(a: any, b?: string) { if (typeof a === 'string') out.headers[a] = b; else Object.assign(out.headers, a); return res; }, status(s: number) { out.status = s; return res; }, json(b: any) { out.body = b; return res; }, end() { return res; } };
  await registrationConfirm({ method: 'POST', ip: '203.0.113.43', is: () => true, body: { token } } as any, res, { entities }); return out;
}
async function resendCall(protocol: string, email: string) {
  const out: any = { headers: {}, status: 200 }; const res: any = { set(a: any, b?: string) { if (typeof a === 'string') out.headers[a] = b; else Object.assign(out.headers, a); return res; }, status(s: number) { out.status = s; return res; }, json(b: any) { out.body = b; return res; }, end() { return res; } };
  await registrationResendConfirmation({ method: 'POST', params: { slug }, ip: '203.0.113.44', is: () => true, body: { protocol, email } } as any, res, { entities }); return out;
}
const lastToken = () => getFakeSentEmails().at(-1)!.text!.match(/#token=([^\s]+)/)![1];
describe.skipIf(!process.env.DATABASE_URL)('submissão pública com banco', () => {
  beforeAll(async () => {
    process.env.EMAIL_PROVIDER = 'fake'; process.env.REGISTRATIONS_ENABLED = 'true'; process.env.JWT_SECRET = secret; process.env.WASP_WEB_CLIENT_URL = 'https://example.invalid'; resetFakeEmailAdapter();
    await db.user.create({ data: { id: id('user'), email: `${suffix}@example.invalid` } });
    await db.parish.create({ data: { id: id('parish'), name: 'Paróquia Exemplo' } });
    await db.tenantBilling.create({ data: { parishId: id('parish'), plan: 'parish', status: 'ACTIVE' } });
    await db.catecheticalYear.create({ data: { id: id('year'), parishId: id('parish'), name: 'Ano', startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31') } });
    await db.stage.create({ data: { id: id('stage'), yearId: id('year'), name: 'Etapa' } });
    await db.registrationCampaign.create({ data: { id: id('campaign'), slug, title: 'Campanha', parishId: id('parish'), yearId: id('year'), createdById: id('user'), status: 'OPEN', opensAt: new Date('2020-01-01'), closesAt: new Date('2099-01-01'), ageCutoffDate: new Date('2026-01-01'), offeredWindows: [{ id: 'sat', weekday: 6, startTime: '09:00', endTime: '10:00', label: 'Sábado' }], offeredCommunityIds: [] } });
    await db.registrationOffering.create({ data: { id: id('offering'), campaignId: id('campaign'), stageId: id('stage'), documentStageKind: 'PRE_CATECHESIS', audience: 'BOTH', minAge: 40 } });
  });
  afterAll(async () => {
    await db.emailMessage.deleteMany({ where: { idempotencyKey: { startsWith: 'registration.' }, to: { endsWith: '@example.invalid' } } });
    const submissions = await db.registrationSubmission.findMany({ where: { campaignId: id('campaign') }, select: { id: true } }); const ids = submissions.map(s => s.id);
    await db.registrationConsent.deleteMany({ where: { application: { submissionId: { in: ids } } } }); await db.registrationApplication.deleteMany({ where: { submissionId: { in: ids } } }); await db.registrationAccessToken.deleteMany({ where: { submissionId: { in: ids } } }); await db.registrationSubmission.deleteMany({ where: { id: { in: ids } } });
    await db.registrationOffering.deleteMany({ where: { campaignId: id('campaign') } }); await db.registrationCampaign.deleteMany({ where: { id: id('campaign') } }); await db.stage.deleteMany({ where: { id: id('stage') } }); await db.catecheticalYear.deleteMany({ where: { id: id('year') } }); await db.tenantBilling.deleteMany({ where: { parishId: id('parish') } }); await db.parish.deleteMany({ where: { id: id('parish') } }); await db.user.deleteMany({ where: { id: id('user') } }); await db.$disconnect(); await prisma.$disconnect();
  });
  it('aceita adulto sem contato e marca idade para revisão', async () => {
    expect(getEmailProvider().name).toBe('fake'); expect(Resend).not.toHaveBeenCalled(); const body = adult(); const r = await call({ ...body, applicant: { ...body.applicant, sponsor: { role: 'PADRINHO', name: 'José', fromOtherParish: true, parishName: 'Outra' } } }); expect(r.status).toBe(201); expect(Object.keys(r.body).sort()).toEqual(['emailConfirmationRequired', 'protocol', 'status']); expect(r.body.status).toBe('RECEIVED');
    const s = await db.registrationSubmission.findUniqueOrThrow({ where: { protocol: r.body.protocol }, include: { applications: true, tokens: true } }); expect(s.applications[0]).toMatchObject({ needsReview: true, sponsorName: 'José', sponsorRole: 'PADRINHO', sponsorFromOtherParish: true, sponsorParishName: 'Outra' }); expect(s.tokens).toHaveLength(0);
  });
  it('cria uma submissão e um email em envios concorrentes', async () => {
    const body = { ...adult(), contactEmail: `familia-${suffix}@example.invalid` };
    const results = await Promise.all(Array.from({ length: 10 }, () => call(body))); expect(results.map(r => r.status)).toEqual(Array(10).fill(201)); expect(new Set(results.map(r => r.body.protocol)).size).toBe(1);
    const s = await db.registrationSubmission.findUniqueOrThrow({ where: { protocol: results[0].body.protocol }, include: { tokens: true } }); expect(s.status).toBe('PENDING_EMAIL'); expect(s.tokens).toHaveLength(1); expect(getFakeSentEmails()).toHaveLength(1);
    const sent = getFakeSentEmails()[0]; const token = sent.text!.match(/#token=([^\s]+)/)?.[1]; expect(token).toBeTruthy(); expect(s.tokens[0].tokenHash).toBe(hashRegistrationAccessToken(token!)); expect(sent.text).not.toContain('1990-01-01');
    expect((await call({ ...body, applicant: { ...body.applicant, firstName: 'Outra' }, formToken: formToken() })).status).toBe(409);
  });
  it('rejeita captcha, honeypot e opções inválidas', async () => {
    expect((await call(adult(), { verify: async () => 'invalid' })).status).toBe(400); expect((await call(adult(), { verify: async () => 'unavailable' })).status).toBe(503); expect((await call({ ...adult(), honeypot: 'spam' })).status).toBe(400); expect((await call({ ...adult(), formToken: 'invalid' })).status).toBe(400);
    const body = adult(); expect((await call({ ...body, applicant: { ...body.applicant, windows: ['missing'] } })).status).toBe(400);
  });
  it('registra dois menores e consentimentos, sem expor dados pessoais no email', async () => {
    resetFakeEmailAdapter();
    const person = { firstName: 'Menor', lastName: 'Exemplo', birthDate: '2017-01-01', offeringId: id('offering'), windows: ['sat'] };
    const body = { requestKey: crypto.randomUUID(), mode: 'FAMILY', contactName: 'Responsável Exemplo', relationship: 'Mãe', contactEmail: `responsavel-${suffix}@example.invalid`, consent: true, formToken: formToken(), captchaToken: 'fake', applicants: [person, { ...person, firstName: 'Irmão' }] };
    const r = await call(body); expect(r.status).toBe(201);
    const submission = await db.registrationSubmission.findUniqueOrThrow({ where: { protocol: r.body.protocol }, include: { applications: { include: { consents: true } } } });
    expect(submission.applications).toHaveLength(2); expect(submission.applications.every(a => a.consents.length === 1 && a.kind === 'MINOR')).toBe(true);
    const sent = getFakeSentEmails()[0]; expect(sent.text).not.toContain('Menor'); expect(sent.text).not.toContain('2017-01-01');
  });
  it('recusa tokens prematuros, expirados, adulterados ou de outra campanha', async () => {
    for (const token of [createRegistrationFormToken(id('campaign'), secret), createRegistrationFormToken(id('campaign'), secret, Date.now() - 7200001), createRegistrationFormToken('other', secret, Date.now() - 9000), `${formToken()}x`]) {
      expect((await call({ ...adult(), formToken: token })).status).toBe(400);
    }
  });
  it('recusa oferta e público incompatíveis, sem registrar dados', async () => {
    const body = adult(); const count = await db.registrationSubmission.count({ where: { campaignId: id('campaign') } });
    expect((await call({ ...body, applicant: { ...body.applicant, offeringId: 'outra' } })).status).toBe(400);
    await db.registrationOffering.update({ where: { id: id('offering') }, data: { audience: 'MINOR' } });
    try { expect((await call(adult())).status).toBe(400); } finally { await db.registrationOffering.update({ where: { id: id('offering') }, data: { audience: 'BOTH' } }); }
    expect(await db.registrationSubmission.count({ where: { campaignId: id('campaign') } })).toBe(count);
  });
  it('fecha acesso para campanha encerrada, rascunho e flag desligada', async () => {
    const outcomes: any[] = [];
    for (const status of ['CLOSED', 'DRAFT'] as const) { await db.registrationCampaign.update({ where: { id: id('campaign') }, data: { status } }); outcomes.push(await call(adult())); }
    await db.registrationCampaign.update({ where: { id: id('campaign') }, data: { status: 'OPEN' } });
    process.env.REGISTRATIONS_ENABLED = 'false'; outcomes.push(await call(adult())); process.env.REGISTRATIONS_ENABLED = 'true';
    await db.tenantBilling.delete({ where: { parishId: id('parish') } });
    try { outcomes.push(await call(adult())); } finally { await db.tenantBilling.create({ data: { parishId: id('parish'), plan: 'parish', status: 'ACTIVE' } }); }
    for (const r of outcomes) { expect(r.status).toBe(404); expect(r.body).toEqual({ error: 'Link indisponível.' }); }
  });
  it('não registra dados pessoais em falhas', async () => {
    const spy = vi.spyOn(logger, 'warn'); const body = { ...adult(), contactEmail: `sentinela-${suffix}@example.invalid`, honeypot: 'spam' };
    await call(body); expect(JSON.stringify(spy.mock.calls)).not.toContain(body.contactEmail); expect(JSON.stringify(spy.mock.calls)).not.toContain(body.applicant.firstName); expect(JSON.stringify(spy.mock.calls)).not.toContain(body.formToken); spy.mockRestore();
  });

  it('emite token apenas para campanha aberta e falha fechado se o limitador falhar', async () => {
    const out: any = {}; const res: any = { set() { return res; }, status(n: number) { out.status = n; return res; }, json(b: any) { out.body = b; return res; }, end() { return res; } };
    const req: any = { method: 'GET', params: { slug }, ip: '203.0.113.201', headers: { 'x-forwarded-for': '198.51.100.25' } };
    await registrationFormToken(req, res, { entities }); expect(out.body.formToken).toBeTruthy();
    const key = createHash('sha256').update(req.ip).digest('hex');
    expect(await db.rateLimitBucket.findUnique({ where: { key: `registration-token-ip:${key}` } })).not.toBeNull();
    const spy = vi.spyOn(prisma, '$queryRaw').mockRejectedValueOnce(new Error('falha sintética'));
    await registrationFormToken(req, res, { entities }); expect(out.status).toBe(503); spy.mockRestore();
  });

  it('confirma atomicamente, atualiza retenção e consentimento e envia recebimento', async () => {
    resetFakeEmailAdapter();
    const r = await call({ ...adult(), contactEmail: `confirm-${suffix}@example.invalid` });
    const token = lastToken();
    const submission = await db.registrationSubmission.findUniqueOrThrow({ where: { protocol: r.body.protocol }, include: { tokens: true } });
    expect(JSON.stringify(submission.tokens)).not.toContain(token);
    await db.registrationConsent.updateMany({ where: { application: { submissionId: submission.id } }, data: { verifiedContactHash: null } });
    const results = await Promise.all(Array.from({ length: 10 }, () => confirmCall(token)));
    expect(results.filter(x => x.status === 200)).toHaveLength(1);
    const failures = results.filter(x => x.status === 400); expect(failures).toHaveLength(9); expect(failures.every(x => JSON.stringify(x) === JSON.stringify(failures[0]))).toBe(true);
    const updated = await db.registrationSubmission.findUniqueOrThrow({ where: { id: submission.id }, include: { applications: { include: { consents: true } } } });
    expect(updated.status).toBe('RECEIVED'); expect(updated.contactVerifiedAt).toBeTruthy();
    expect(updated.retentionUntil.toISOString()).toBe(new Date(new Date('2099-01-01').getTime() + 180 * 86400000).toISOString());
    expect(updated.applications[0].consents[0].verifiedContactHash).toBe(submission.tokens[0].emailHash);
    expect(getFakeSentEmails()).toHaveLength(2); expect(getFakeSentEmails()[1].text).toContain(r.body.protocol);
    expect(await resendCall(r.body.protocol, `confirm-${suffix}@example.invalid`)).toEqual({ status: 202, headers: failures[0].headers, body: { status: 'accepted' } });
    expect(getFakeSentEmails()).toHaveLength(2); expect(Resend).not.toHaveBeenCalled();
  });
  it('uniformiza tokens inválidos, expirados, revogados e de campanha divergente', async () => {
    resetFakeEmailAdapter();
    const r = await call({ ...adult(), contactEmail: `invalid-${suffix}@example.invalid` }); const token = lastToken();
    const row = await db.registrationAccessToken.findUniqueOrThrow({ where: { tokenHash: hashRegistrationAccessToken(token) } });
    const outcomes = [await confirmCall('a'.repeat(43))];
    await db.registrationAccessToken.update({ where: { id: row.id }, data: { expiresAt: new Date('2020-01-01') } }); outcomes.push(await confirmCall(token));
    await db.registrationAccessToken.update({ where: { id: row.id }, data: { expiresAt: new Date('2099-01-01'), revokedAt: new Date() } }); outcomes.push(await confirmCall(token));
    await db.registrationAccessToken.update({ where: { id: row.id }, data: { revokedAt: null, campaignId: 'other-campaign' } }); outcomes.push(await confirmCall(token));
    process.env.REGISTRATIONS_ENABLED = 'false'; await db.registrationAccessToken.update({ where: { id: row.id }, data: { campaignId: id('campaign') } }); outcomes.push(await confirmCall(token)); process.env.REGISTRATIONS_ENABLED = 'true';
    expect(outcomes.every(x => JSON.stringify(x) === JSON.stringify(outcomes[0]))).toBe(true); expect(outcomes[0].body).toEqual({ error: 'Link inválido ou expirado.' });
    expect(r.status).toBe(201);
  });
  it('reenvia com resposta uniforme, revoga anterior e limita contato', async () => {
    resetFakeEmailAdapter(); const email = `resend-${suffix}@example.invalid`;
    const r = await call({ ...adult(), contactEmail: email }); const old = lastToken();
    const missing = await resendCall('INEXISTENTE', `missing-${suffix}@example.invalid`);
    const existing = await resendCall(r.body.protocol, email); expect(existing).toEqual(missing);
    const current = lastToken(); expect(current).not.toBe(old); expect((await confirmCall(old)).status).toBe(400);
    await resendCall(r.body.protocol, email); const before = getFakeSentEmails().length;
    expect(await resendCall(r.body.protocol, email)).toEqual(missing);
    expect(await resendCall(r.body.protocol, email)).toEqual(missing); expect(getFakeSentEmails()).toHaveLength(before);
    expect((await confirmCall(current)).status).toBe(400); expect((await confirmCall(lastToken())).status).toBe(200);
  });
  it('aplica parser Express e tipo de conteúdo antes do handler', async () => {
    const app = express(); const middleware = registrationSubmissionMiddleware(new Map() as any);
    for (const fn of middleware.values()) app.use(fn as any);
    app.post('/', (_req, res) => res.status(204).end());
    app.use((err: any, _req: any, res: any, _next: any) => res.status(err.status || 500).end());
    const server = app.listen(0); const address = server.address() as any; const url = `http://127.0.0.1:${address.port}/`;
    try {
      expect((await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ data: 'x'.repeat(65536) }) })).status).toBe(413);
      expect((await fetch(url, { method: 'POST', headers: { 'content-type': 'text/plain' }, body: 'x' })).status).toBe(415);
      expect(middleware.get('express.json')).toBeTruthy();
    } finally { server.close(); }
    const small = express(); for (const fn of registrationConfirmationMiddleware(new Map() as any).values()) small.use(fn as any);
    small.post('/', (_req, res) => res.status(204).end());
    small.use((err: any, _req: any, res: any, _next: any) => res.status(err.status || 500).end());
    const smallServer = small.listen(0); const smallAddress = smallServer.address() as any;
    try { expect((await fetch(`http://127.0.0.1:${smallAddress.port}/`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ data: 'x'.repeat(4096) }) })).status).toBe(413); } finally { smallServer.close(); }
  });
  it('falha fechado no limitador e no CAPTCHA sem criar submissão', async () => {
    const count = await db.registrationSubmission.count({ where: { campaignId: id('campaign') } });
    const spy = vi.spyOn(prisma, '$queryRaw').mockRejectedValueOnce(new Error('falha sintética'));
    try { expect((await call(adult())).status).toBe(503); } finally { spy.mockRestore(); }
    expect((await call(adult(), { verify: async () => 'unavailable' })).status).toBe(503);
    expect(await db.registrationSubmission.count({ where: { campaignId: id('campaign') } })).toBe(count);
  });

});
