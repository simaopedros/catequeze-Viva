import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
vi.mock('wasp/server', async () => {
  const { PrismaClient } = await import('@prisma/client');
  return { prisma: new PrismaClient(), HttpError: class extends Error { constructor(public statusCode: number, message?: string) { super(message); } } };
});
import { prisma as opPrisma } from 'wasp/server';
import { publicRegistrationCampaign } from '../server/api/publicRegistrationCampaign';

const db = new PrismaClient();
const suffix = crypto.randomUUID().slice(0, 8);
const id = (s: string) => `pubcamp-${s}-${suffix}`;
const entities = new Proxy(db as any, { get(target, key: string) { return Reflect.get(target, key.charAt(0).toLowerCase() + key.slice(1)); } });
const context = { entities };
const windows = [{ id: 'sat', weekday: 6, startTime: '09:00', endTime: '10:30', label: 'Sábado de manhã' }];
const SENTINEL_EMAIL = `sentinela-${suffix}@example.invalid`;

function call(slug: string, ip = '203.0.113.9', method = 'GET') {
  const out: { status?: number; headers: Record<string, string>; body?: string } = { headers: {} };
  const res: any = {
    set(a: any, b?: string) { if (typeof a === 'string') out.headers[a.toLowerCase()] = String(b); else for (const k of Object.keys(a)) out.headers[k.toLowerCase()] = String(a[k]); return res; },
    status(s: number) { out.status = s; return res; },
    type() { return res; },
    json(b: any) { out.body = JSON.stringify(b); return res; },
    send(b: any) { out.body = String(b); return res; },
    end() { return res; },
  };
  return publicRegistrationCampaign({ method, params: { slug }, ip, headers: { 'x-forwarded-for': '198.51.100.77' }, socket: {} } as any, res, context).then(() => out);
}

describe.skipIf(!process.env.DATABASE_URL)('API pública de campanha com banco', () => {
  beforeAll(async () => {
    process.env.REGISTRATIONS_ENABLED = 'true';
    await db.user.create({ data: { id: id('user'), email: SENTINEL_EMAIL } });
    await db.parish.createMany({ data: [{ id: id('parish'), name: 'Paróquia Pública Teste' }, { id: id('noplan'), name: 'Sem plano' }] });
    await db.tenantBilling.create({ data: { parishId: id('parish'), plan: 'parish', status: 'ACTIVE' } });
    await db.catecheticalYear.createMany({ data: [
      { id: id('year'), parishId: id('parish'), name: 'Ano', startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31') },
      { id: id('year2'), parishId: id('noplan'), name: 'Ano', startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31') },
    ] });
    await db.stage.create({ data: { id: id('stage'), yearId: id('year'), name: 'Etapa Pública' } });
    const base = { yearId: id('year'), parishId: id('parish'), createdById: id('user'), timezone: 'America/Sao_Paulo', opensAt: new Date('2020-01-01'), closesAt: new Date('2099-01-01'), ageCutoffDate: new Date('2026-03-31'), offeredWindows: windows, offeredCommunityIds: [] as string[] };
    await db.registrationCampaign.createMany({ data: [
      { ...base, id: id('open'), slug: `pc-open-${suffix}`, title: 'Aberta', status: 'OPEN', publicContact: 'secretaria@paroquia.example' },
      { ...base, id: id('draft'), slug: `pc-draft-${suffix}`, title: 'Rascunho', status: 'DRAFT' },
      { ...base, id: id('closed'), slug: `pc-closed-${suffix}`, title: 'Encerrada', status: 'CLOSED' },
      { ...base, id: id('noplan'), parishId: id('noplan'), yearId: id('year2'), slug: `pc-noplan-${suffix}`, title: 'Sem plano', status: 'OPEN' },
    ] });
    await db.registrationOffering.create({ data: { id: id('offering'), campaignId: id('open'), stageId: id('stage'), documentStageKind: 'PRE_CATECHESIS', plannedSeats: 7, minAge: 7, maxAge: 9, audience: 'MINOR' } });
  });
  afterAll(async () => {
    await db.registrationOffering.deleteMany({ where: { campaignId: { startsWith: 'pubcamp-' } , id: { endsWith: suffix } } });
    await db.registrationCampaign.deleteMany({ where: { id: { endsWith: suffix }, slug: { startsWith: 'pc-' } } });
    await db.stage.deleteMany({ where: { id: id('stage') } });
    await db.catecheticalYear.deleteMany({ where: { id: { in: [id('year'), id('year2')] } } });
    await db.tenantBilling.deleteMany({ where: { parishId: id('parish') } });
    await db.parish.deleteMany({ where: { id: { in: [id('parish'), id('noplan')] } } });
    await db.user.deleteMany({ where: { id: id('user') } });
    await db.rateLimitBucket.deleteMany({ where: { key: { startsWith: 'registration-public' } } });
    await db.$disconnect(); await opPrisma.$disconnect(); delete process.env.REGISTRATIONS_ENABLED;
  });

  it('abre a campanha com a lista branca e sem dados internos', async () => {
    const r = await call(`pc-open-${suffix}`, '203.0.113.1');
    expect(r.status ?? 200).toBe(200);
    expect(r.headers['cache-control']).toBe('public, max-age=60');
    expect(r.headers['referrer-policy']).toBe('no-referrer');
    const body = JSON.parse(r.body!);
    expect(Object.keys(body).sort()).toEqual(['closesAt', 'opensAt', 'parishName', 'publicContact', 'publicDescription', 'stages', 'status', 'timezone', 'title', 'windows']);
    expect(body.stages).toEqual(['Etapa Pública']);
    for (const forbidden of [SENTINEL_EMAIL, id('user'), id('parish'), id('year'), id('stage'), 'plannedSeats', 'createdById', 'revision', 'seatPolicy', 'offeredCommunityIds']) expect(r.body).not.toContain(forbidden);
  });

  it('encerrada devolve só o mínimo e sem janelas', async () => {
    const r = await call(`pc-closed-${suffix}`, '203.0.113.2');
    expect(Object.keys(JSON.parse(r.body!)).sort()).toEqual(['parishName', 'publicContact', 'status', 'title']);
  });

  it('devolve 404 idêntico para desconhecido, rascunho, sem plano e flag desligada', async () => {
    const cases = [`pc-nope-${suffix}`, `pc-draft-${suffix}`, `pc-noplan-${suffix}`];
    const results: Awaited<ReturnType<typeof call>>[] = [];
    for (const [i, slug] of cases.entries()) results.push(await call(slug, `203.0.113.${10 + i}`));
    process.env.REGISTRATIONS_ENABLED = 'false';
    results.push(await call(`pc-open-${suffix}`, '203.0.113.20'));
    process.env.REGISTRATIONS_ENABLED = 'true';
    for (const r of results) { expect(r.status).toBe(404); expect(r.body).toBe(results[0].body); expect(r.headers).toEqual(results[0].headers); expect(r.headers['cache-control']).toBe('no-store'); }
  });

  it('limita por IP com 429 e Retry-After, ignorando X-Forwarded-For forjado', async () => {
    let last: Awaited<ReturnType<typeof call>> | undefined;
    for (let i = 0; i < 31; i++) last = await call(`pc-open-${suffix}`, '203.0.113.200');
    expect(last!.status).toBe(429);
    expect(Number(last!.headers['retry-after'])).toBeGreaterThan(0);
    const another = await call(`pc-open-${suffix}`, '203.0.113.201');
    expect(another.status ?? 200).toBe(200);
  });
});
