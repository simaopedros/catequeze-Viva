import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import { createHash } from 'node:crypto';
vi.mock('wasp/server', async () => { const { PrismaClient } = await import('@prisma/client'); const url = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : undefined; url?.searchParams.set('connection_limit', '3'); return { prisma: new PrismaClient(url ? { datasources: { db: { url: url.toString() } } } : undefined), HttpError: class extends Error { constructor(public statusCode: number, message?: string) { super(message); } } }; });
import { prisma } from 'wasp/server';
const db = new PrismaClient();
const suffix = crypto.randomUUID(); const id = (s: string) => `doc-${s}-${suffix}`;
const entities = new Proxy(db as any, { get(target, key: string) { return Reflect.get(target, key.charAt(0).toLowerCase() + key.slice(1)); } });
const ctx = (role: string) => ({ user: { id: id(role), isAdmin: false }, entities });
const communityCoordinator = ctx('community-coordinator');
const coordinator = ctx('coordinator'), secretary = ctx('secretary'), priest = ctx('priest'), catechist = ctx('catechist'), other = ctx('other');
let upload: typeof import('../server/registrations/documentUpload').uploadRegistrationDocument;
let ops: typeof import('../server/operations/registrationDocumentOperations');
let api: typeof import('../server/api/registrationDocuments');
let temp: string; let cwd: string; let oldEnabled: string | undefined; let oldBunny: Record<string, string | undefined> = {};
const file = (content = '%PDF-test') => ({ buffer: Buffer.from(content), mimetype: 'application/pdf', size: Buffer.byteLength(content) } as Express.Multer.File);
const input = (f = file()) => ({ applicationId: id('application'), campaignId: id('campaign'), type: 'BIRTH_CERTIFICATE', file: f, source: 'STAFF' as const, userId: secretary.user.id, parishId: id('parish') });

describe.skipIf(!process.env.DATABASE_URL)('documentos da inscrição com banco e armazenamento local', () => {
  beforeAll(async () => {
    cwd = process.cwd(); temp = fs.mkdtempSync(path.join(os.tmpdir(), 'registration-documents-')); process.chdir(temp);
    oldEnabled = process.env.REGISTRATIONS_ENABLED; process.env.REGISTRATIONS_ENABLED = 'true';
    for (const key of ['BUNNY_STORAGE_ZONE', 'BUNNY_STORAGE_API_KEY', 'BUNNY_STORAGE_HOSTNAME']) { oldBunny[key] = process.env[key]; delete process.env[key]; }
    upload = (await import('../server/registrations/documentUpload')).uploadRegistrationDocument;
    ops = await import('../server/operations/registrationDocumentOperations');
    api = await import('../server/api/registrationDocuments');
    await db.user.createMany({ data: [coordinator, secretary, priest, catechist, other, communityCoordinator].map(c => ({ id: c.user.id })) });
    await db.parish.createMany({ data: [{ id: id('parish'), name: 'Teste' }, { id: id('other'), name: 'Outra' }] });
    await db.community.create({ data: { id: id('community'), parishId: id('parish'), name: 'Comunidade' } });
    await db.membership.createMany({ data: [{ userId: coordinator.user.id, parishId: id('parish'), role: 'PARISH_COORDINATOR' }, { userId: secretary.user.id, parishId: id('parish'), role: 'PARISH_SECRETARY' }, { userId: priest.user.id, parishId: id('parish'), role: 'PARISH_PRIEST' }, { userId: catechist.user.id, parishId: id('parish'), role: 'LEAD_CATECHIST' }, { userId: other.user.id, parishId: id('other'), role: 'PARISH_COORDINATOR' }, { userId: communityCoordinator.user.id, parishId: id('parish'), role: 'COMMUNITY_COORDINATOR', communityId: id('community') }] });
    const membership = await db.membership.findFirstOrThrow({ where: { userId: communityCoordinator.user.id, parishId: id('parish') } });
    await db.registrationPermissionGrant.create({ data: { membershipId: membership.id, action: 'VERIFY_DOCUMENTS', grantedById: coordinator.user.id, reason: 'Teste' } });
    await db.tenantBilling.create({ data: { parishId: id('parish'), plan: 'parish', status: 'ACTIVE' } });
    await db.catecheticalYear.create({ data: { id: id('year'), parishId: id('parish'), name: 'Ano', startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31') } });
    await db.stage.create({ data: { id: id('stage'), yearId: id('year'), name: 'Etapa' } });
    await db.registrationCampaign.create({ data: { id: id('campaign'), slug: id('slug'), title: 'Teste', parishId: id('parish'), yearId: id('year'), createdById: coordinator.user.id, status: 'OPEN', opensAt: new Date('2020-01-01'), closesAt: new Date('2099-01-01'), ageCutoffDate: new Date('2026-01-01'), offeredWindows: [], offeredCommunityIds: [] } });
    await db.registrationOffering.create({ data: { id: id('offering'), campaignId: id('campaign'), stageId: id('stage'), documentStageKind: 'PRE_CATECHESIS', audience: 'BOTH' } });
    await db.registrationSubmission.create({ data: { id: id('submission'), campaignId: id('campaign'), protocol: id('protocol'), requestKey: id('request'), payloadHash: 'hash', status: 'RECEIVED', contactName: 'Sentinela', contactVerifiedAt: new Date(), retentionUntil: new Date('2099-01-01') } });
    await db.registrationApplication.create({ data: { id: id('application'), submissionId: id('submission'), offeringId: id('offering'), kind: 'ADULT', firstName: 'Sentinela', lastName: 'Pessoa', communityId: id('community'), birthDate: new Date('1990-01-01'), ageAtCutoff: 36, preferences: [] } });
  });
  afterAll(async () => {
    await db.auditLog.deleteMany({ where: { parishId: id('parish') } });
    await db.registrationDocument.deleteMany({ where: { campaignId: id('campaign') } });
    await db.registrationAccessToken.deleteMany({ where: { submissionId: { in: [id('submission'), id('foreign-submission')] } } });
    await db.registrationApplication.deleteMany({ where: { submissionId: { in: [id('submission'), id('foreign-submission')] } } }); await db.registrationSubmission.deleteMany({ where: { id: { in: [id('submission'), id('foreign-submission')] } } });
    await db.registrationOffering.deleteMany({ where: { campaignId: id('campaign') } }); await db.registrationCampaign.deleteMany({ where: { id: id('campaign') } }); await db.stage.deleteMany({ where: { id: id('stage') } }); await db.catecheticalYear.deleteMany({ where: { id: id('year') } });
    await db.registrationPermissionGrant.deleteMany({ where: { grantedById: coordinator.user.id } }); await db.membership.deleteMany({ where: { userId: { in: [coordinator, secretary, priest, catechist, other, communityCoordinator].map(c => c.user.id) } } }); await db.tenantBilling.deleteMany({ where: { parishId: id('parish') } }); await db.community.deleteMany({ where: { id: id('community') } }); await db.parish.deleteMany({ where: { id: { in: [id('parish'), id('other')] } } }); await db.user.deleteMany({ where: { id: { in: [coordinator, secretary, priest, catechist, other, communityCoordinator].map(c => c.user.id) } } });
    await db.$disconnect(); await prisma.$disconnect(); process.chdir(cwd); fs.rmSync(temp, { recursive: true, force: true });
    if (oldEnabled === undefined) delete process.env.REGISTRATIONS_ENABLED; else process.env.REGISTRATIONS_ENABLED = oldEnabled;
    for (const [key, value] of Object.entries(oldBunny)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  });
  it('isola e deduplica dez envios concorrentes', async () => {
    const results = await Promise.all(Array.from({ length: 10 }, () => upload(input(), { scan: async () => 'clean' })));
    expect(new Set(results.map(r => r.id)).size).toBe(1);
    expect(await db.registrationDocument.count({ where: { applicationId: id('application') } })).toBe(1);
    expect(JSON.stringify(results)).not.toContain('s3Key');
    expect((await db.registrationDocument.findUniqueOrThrow({ where: { id: results[0].id } })).status).toBe('PENDING');
  });
  it('entrega somente arquivos permitidos com cabeçalhos de proteção', async () => {
    const doc = await db.registrationDocument.findFirstOrThrow({ where: { applicationId: id('application'), status: 'PENDING' } });
    const call = async (user: any, documentId = doc.id) => { const out: any = { status: 200, headers: {} }; const res: any = { set(a: any) { Object.assign(out.headers, a); return res; }, status(v: number) { out.status = v; return res; }, json(v: any) { out.body = v; return res; }, send(v: any) { out.body = v; return res; } }; await api.registrationDocumentFile({ params: { id: documentId } } as any, res, user); return out; };
    const response = await call(secretary); expect(response.status).toBe(200); expect(response.headers['Cache-Control']).toBe('private, no-store'); expect(response.headers['Content-Disposition']).toBe('attachment; filename="documento"'); expect(response.headers['X-Content-Type-Options']).toBe('nosniff'); expect(response.headers['Content-Type']).toBe('application/pdf'); expect(response.headers['Referrer-Policy']).toBe('no-referrer');
    expect((await call(other)).status).toBe(404);
    await db.registrationDocument.update({ where: { id: doc.id }, data: { status: 'QUARANTINE' } }); expect((await call(secretary)).status).toBe(404);
    await db.registrationDocument.update({ where: { id: doc.id }, data: { status: 'VERIFIED' } }); expect((await call(secretary)).status).toBe(200);
    await db.registrationDocument.update({ where: { id: doc.id }, data: { status: 'REJECTED' } }); expect((await call(secretary)).status).toBe(404);
    await db.registrationDocument.update({ where: { id: doc.id }, data: { status: 'PENDING' } });
    process.env.REGISTRATIONS_ENABLED = 'false'; try { expect((await call(secretary)).status).toBe(404); } finally { process.env.REGISTRATIONS_ENABLED = 'true'; }
  });
  it('retém quarentena e apaga objeto infectado', async () => {
    const quarantine = await upload(input(file('%PDF-quarantine')), { scan: async () => 'unavailable' }); expect(quarantine.status).toBe('QUARANTINE');
    const infected = await upload(input(file('%PDF-infected')), { scan: async () => 'infected' }); expect(infected.status).toBe('REJECTED');
    const row = await db.registrationDocument.findUniqueOrThrow({ where: { id: infected.id } }); expect(row.rejectedReason).toBe('Arquivo recusado pela análise de segurança'); expect(fs.existsSync(path.join(temp, 'uploads', row.s3Key))).toBe(false);
  });
  it('valida arquivos e protege o envio da família por sessão', async () => {
    await expect(upload(input(file('inválido')), { scan: async () => 'clean' })).rejects.toMatchObject({ statusCode: 400 });
    await expect(upload({ ...input(), type: 'INVALID' }, { scan: async () => 'clean' })).rejects.toMatchObject({ statusCode: 400 });
    await db.registrationSubmission.create({ data: { id: id('foreign-submission'), campaignId: id('campaign'), protocol: id('foreign-protocol'), requestKey: id('foreign-request'), payloadHash: 'hash', status: 'RECEIVED', contactName: 'Teste', contactVerifiedAt: new Date(), retentionUntil: new Date('2099-01-01') } });
    await db.registrationApplication.create({ data: { id: id('foreign-application'), submissionId: id('foreign-submission'), offeringId: id('offering'), kind: 'ADULT', firstName: 'Teste', lastName: 'Pessoa', birthDate: new Date('1990-01-01'), ageAtCutoff: 36, preferences: [] } });
    const token = 'a'.repeat(43); const tokenHash = createHash('sha256').update(token).digest('hex');
    await db.registrationAccessToken.create({ data: { submissionId: id('submission'), campaignId: id('campaign'), emailHash: 'hash', tokenHash, purpose: 'DOCUMENT_UPLOAD', expiresAt: new Date(Date.now() + 3600000) } });
    await db.registrationAccessToken.create({ data: { submissionId: id('foreign-submission'), campaignId: id('campaign'), emailHash: 'hash', tokenHash: createHash('sha256').update('b'.repeat(43)).digest('hex'), purpose: 'DOCUMENT_UPLOAD', expiresAt: new Date(Date.now() + 3600000) } });
    const app = express(); app.post('/documents', (req, res) => { void api.publicRegistrationDocumentUpload(req, res, { entities }); });
    const server = app.listen(0, '127.0.0.1'); await new Promise<void>(resolve => server.once('listening', resolve));
    try {
      const address = server.address(); if (!address || typeof address === 'string') throw new Error('address');
      const send = async (applicationId: string, content = '%PDF-family', bearer = token) => { const form = new FormData(); form.set('applicationId', applicationId); form.set('type', 'OTHER'); form.set('file', new Blob([content], { type: 'application/pdf' }), 'private-name.pdf'); return fetch(`http://127.0.0.1:${address.port}/documents`, { method: 'POST', headers: { Authorization: `Bearer ${bearer}` }, body: form }); };
      expect((await send(id('foreign-application'))).status).toBe(404);
      expect((await send(id('application'), '%PDF-other', 'b'.repeat(43))).status).toBe(404);
      expect((await send(id('application'), '%PDF-' + 'x'.repeat(10 * 1024 * 1024))).status).toBe(400);
      const responses = await Promise.all(Array.from({ length: 10 }, () => send(id('application')))); expect(responses.every(r => r.status === 200)).toBe(true); const receipts = await Promise.all(responses.map(r => r.json())); expect(new Set(receipts.map(r => r.id)).size).toBe(1); const receipt = receipts[0]; expect(receipt.status).toBe('QUARANTINE'); expect(Object.keys(receipt).sort()).toEqual(['id', 'status', 'type']);
      expect((await send(id('application'), 'invalid')).status).toBe(400);
      for (const status of ['CLOSED', 'ORGANIZING'] as const) { await db.registrationCampaign.update({ where: { id: id('campaign') }, data: { status } }); expect((await send(id('application'), `%PDF-${status}`)).status).toBe(200); }
      await db.registrationApplication.update({ where: { id: id('application') }, data: { status: 'REJECTED' } }); expect((await send(id('application'), '%PDF-rejected')).status).toBe(404);
      await db.registrationApplication.update({ where: { id: id('application') }, data: { status: 'SUBMITTED' } }); await db.registrationCampaign.update({ where: { id: id('campaign') }, data: { status: 'OPEN' } });
      await db.registrationAccessToken.update({ where: { tokenHash }, data: { expiresAt: new Date('2020-01-01') } }); expect((await send(id('application'))).status).toBe(401);
      await db.registrationAccessToken.update({ where: { tokenHash }, data: { expiresAt: new Date(Date.now() + 3600000), revokedAt: new Date() } }); expect((await send(id('application'))).status).toBe(401);
      await db.registrationAccessToken.update({ where: { tokenHash }, data: { revokedAt: null } });
      const followToken = 'c'.repeat(43); await db.registrationAccessToken.create({ data: { submissionId: id('submission'), campaignId: id('campaign'), emailHash: 'hash', tokenHash: createHash('sha256').update(followToken).digest('hex'), purpose: 'FOLLOW_UP', expiresAt: new Date(Date.now() + 3600000) } });
      const follow = await import('../server/api/registrationFollowUp'); const result: any = { status: 200 }; const res: any = { set() { return res; }, status(v: number) { result.status = v; return res; }, json(v: any) { result.body = v; return res; }, end() { return res; } };
      await follow.registrationFollowUpSession({ method: 'POST', ip: '203.0.113.45', is: () => true, body: { token: followToken } } as any, res, { entities });
      expect(result.status).toBe(200); expect((await send(id('application'))).status).toBe(401); expect((await send(id('application'), '%PDF-reissued', result.body.uploadSession.token)).status).toBe(200);

    } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
  });
  it('limita documentos ativos e arquivos grandes', async () => {
    const tooLarge = file(); tooLarge.size = 10 * 1024 * 1024 + 1;
    await expect(upload(input(tooLarge), { scan: async () => 'clean' })).rejects.toMatchObject({ statusCode: 400 });
    const count = await db.registrationDocument.count({ where: { applicationId: id('application'), status: { not: 'REJECTED' } } });
    for (let i = count; i < 10; i++) await upload(input(file(`%PDF-limit-${i}`)), { scan: async () => 'unavailable' });
    await expect(upload(input(file('%PDF-over-limit')), { scan: async () => 'clean' })).rejects.toMatchObject({ statusCode: 400 });
  });
  it('aplica fila, decisão e papéis sem divulgar dados na auditoria', async () => {
    const args = { campaignId: id('campaign') }; const queue = await ops.listRegistrationDocumentQueue(args, coordinator); expect(queue).toHaveLength(1);
    expect(JSON.stringify(queue)).not.toContain('s3Key'); await expect(ops.listRegistrationDocumentQueue(args, secretary)).resolves.toHaveLength(1);
    for (const user of [priest, catechist, other]) await expect(ops.listRegistrationDocumentQueue(args, user)).rejects.toMatchObject({ statusCode: 403 });
    expect(await ops.listRegistrationDocumentQueue(args, communityCoordinator)).toHaveLength(1);
    await db.registrationApplication.update({ where: { id: id('application') }, data: { communityId: null } });
    expect(await ops.listRegistrationDocumentQueue(args, communityCoordinator)).toHaveLength(0);
    await expect(ops.reviewRegistrationDocument({ id: queue[0].id, decision: 'VERIFY' }, communityCoordinator)).rejects.toMatchObject({ statusCode: 403 });
    await db.registrationApplication.update({ where: { id: id('application') }, data: { communityId: id('community') } });
    await ops.reviewRegistrationDocument({ id: queue[0].id, decision: 'REJECT', reason: 'Sentinela Pessoa' }, secretary);
    await expect(ops.reviewRegistrationDocument({ id: queue[0].id, decision: 'VERIFY' }, secretary)).rejects.toMatchObject({ statusCode: 409 });
    expect(JSON.stringify(await db.auditLog.findMany({ where: { parishId: id('parish') } }))).not.toContain('Sentinela');
  });
});
