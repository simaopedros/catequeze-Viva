import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
vi.mock('wasp/server', async () => { const { PrismaClient } = await import('@prisma/client'); const url = new URL(process.env.DATABASE_URL!); url.searchParams.set('connection_limit', '2'); return { prisma: new PrismaClient({ datasources: { db: { url: url.toString() } } }), HttpError: class extends Error { constructor(public statusCode: number, message?: string) { super(message); } } }; });
import { prisma } from 'wasp/server';
import { generateFormationPreview, getFormationPlan, listFormationPlans } from '../server/operations/formationPlanOperations';
const db = new PrismaClient();
const suffix = crypto.randomUUID(), id = (v: string) => `formation-${v}-${suffix}`;
const entities = new Proxy(db as any, { get(target, key: string) { return Reflect.get(target, key.charAt(0).toLowerCase() + key.slice(1)); } });
const ctx = (v: string) => ({ user: { id: id(v), isAdmin: false }, entities });
const coordinator = ctx('coordinator'), priest = ctx('priest'), secretary = ctx('secretary'), catechist = ctx('catechist'), other = ctx('other');
const users = [coordinator, priest, secretary, catechist, other, ctx('assistant')].map(c => c.user.id);
const window = { id: 'sat', weekday: 6, startTime: '09:00', endTime: '10:00', label: 'Sábado' };
const availability = { version: 1, windows: [{ weekday: 6, startTime: '09:00', endTime: '10:00' }], closures: [] };
const generate = (context = coordinator) => generateFormationPreview({ campaignId: id('campaign') }, context);
describe.skipIf(!process.env.DATABASE_URL)('prévia de formação com Postgres', () => {
 let enabled: string | undefined;
 beforeAll(async () => {
  enabled = process.env.REGISTRATIONS_ENABLED; process.env.REGISTRATIONS_ENABLED = 'true';
  await db.user.createMany({ data: users.map(id => ({ id, firstName: 'Pessoa Sentinela' })) });
  await db.parish.createMany({ data: [{ id: id('parish'), name: 'Teste' }, { id: id('foreign'), name: 'Outra' }] });
  await db.membership.createMany({ data: [{ userId: coordinator.user.id, parishId: id('parish'), role: 'PARISH_COORDINATOR' }, { userId: priest.user.id, parishId: id('parish'), role: 'PARISH_PRIEST' }, { userId: secretary.user.id, parishId: id('parish'), role: 'PARISH_SECRETARY' }, { userId: catechist.user.id, parishId: id('parish'), role: 'LEAD_CATECHIST' }, { userId: id('assistant'), parishId: id('parish'), role: 'ASSISTANT_CATECHIST' }, { userId: other.user.id, parishId: id('foreign'), role: 'PARISH_COORDINATOR' }] });
  await db.tenantBilling.create({ data: { parishId: id('parish'), plan: 'parish', status: 'ACTIVE' } });
  await db.catecheticalYear.create({ data: { id: id('year'), parishId: id('parish'), name: 'Ano', startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31') } });
  await db.stage.create({ data: { id: id('stage'), yearId: id('year'), name: 'Etapa' } });
  await db.registrationCampaign.create({ data: { id: id('campaign'), slug: id('slug'), title: 'Campanha', parishId: id('parish'), yearId: id('year'), createdById: coordinator.user.id, status: 'CLOSED', opensAt: new Date('2020-01-01'), closesAt: new Date('2099-01-01'), ageCutoffDate: new Date('2026-01-01'), offeredWindows: [window], offeredCommunityIds: [] } });
  await db.registrationOffering.create({ data: { id: id('offering'), campaignId: id('campaign'), stageId: id('stage'), documentStageKind: 'PRE_CATECHESIS', audience: 'MINOR', minAge: 7, maxAge: 12 } });
  await db.room.create({ data: { id: id('room'), parishId: id('parish'), name: 'Sala', nameKey: id('room'), capacity: 15 } });
  await db.catechistAvailability.createMany({ data: [catechist.user.id, id('assistant')].map(userId => ({ parishId: id('parish'), yearId: id('year'), userId, availability })) });
  await db.catechumenProfile.createMany({ data: Array.from({ length: 16 }, (_, i) => ({ id: id(`profile${i}`), parishId: id('parish'), firstName: 'NomeSentinela', lastName: 'Pessoa' })) });
  for (let i = 0; i < 16; i++) {
   await db.registrationSubmission.create({ data: { id: id(`submission${i}`), campaignId: id('campaign'), protocol: id(`protocol${i}`), requestKey: id(`request${i}`), payloadHash: 'hash', status: 'RECEIVED', contactName: 'NomeSentinela', submittedAt: new Date(Date.UTC(2026, 0, 1, 0, i)), retentionUntil: new Date('2099-01-01') } });
   await db.registrationApplication.create({ data: { id: id(`app${i}`), submissionId: id(`submission${i}`), offeringId: id('offering'), kind: 'MINOR', firstName: 'NomeSentinela', lastName: 'Pessoa', birthDate: new Date('2016-01-01'), ageAtCutoff: 10, preferences: [{ windowId: 'sat', rank: 1 }], status: 'APPROVED', catechumenProfileId: id(`profile${i}`) } });
  }
 });
 afterAll(async () => {
  await db.auditLog.deleteMany({ where: { parishId: { in: [id('parish'), id('foreign')] } } }); await db.classFormationPlan.deleteMany({ where: { campaignId: id('foreign-campaign') } });
  await db.registrationApplication.deleteMany({ where: { offeringId: id('foreign-offering') } }); await db.registrationSubmission.deleteMany({ where: { campaignId: id('foreign-campaign') } }); await db.registrationOffering.deleteMany({ where: { campaignId: id('foreign-campaign') } }); await db.registrationCampaign.deleteMany({ where: { id: id('foreign-campaign') } }); await db.catechistAvailability.deleteMany({ where: { parishId: id('foreign') } }); await db.room.deleteMany({ where: { parishId: id('foreign') } }); await db.catechumenProfile.deleteMany({ where: { parishId: id('foreign') } }); await db.stage.deleteMany({ where: { yearId: id('foreign-year') } }); await db.catecheticalYear.deleteMany({ where: { id: id('foreign-year') } }); await db.tenantBilling.deleteMany({ where: { parishId: id('foreign') } }); await db.household.deleteMany({ where: { id: id('household') } });
  await db.auditLog.deleteMany({ where: { parishId: id('parish') } }); await db.classFormationPlan.deleteMany({ where: { campaignId: id('campaign') } });
  await db.registrationApplication.deleteMany({ where: { offeringId: id('offering') } }); await db.registrationSubmission.deleteMany({ where: { campaignId: id('campaign') } }); await db.registrationOffering.deleteMany({ where: { campaignId: id('campaign') } }); await db.registrationCampaign.deleteMany({ where: { id: id('campaign') } });
  await db.catechistAvailability.deleteMany({ where: { parishId: id('parish') } }); await db.room.deleteMany({ where: { parishId: id('parish') } }); await db.catechumenProfile.deleteMany({ where: { parishId: id('parish') } }); await db.stage.deleteMany({ where: { yearId: id('year') } }); await db.catecheticalYear.deleteMany({ where: { id: id('year') } }); await db.registrationPermissionGrant.deleteMany({ where: { grantedById: coordinator.user.id } }); await db.membership.deleteMany({ where: { userId: { in: users } } }); await db.tenantBilling.deleteMany({ where: { parishId: id('parish') } }); await db.parish.deleteMany({ where: { id: { in: [id('parish'), id('foreign')] } } }); await db.user.deleteMany({ where: { id: { in: users } } });
  await db.$disconnect(); await prisma.$disconnect(); if (enabled === undefined) delete process.env.REGISTRATIONS_ENABLED; else process.env.REGISTRATIONS_ENABLED = enabled;
 });
 it('mantém hash e colocações ao recriar os mesmos dados em ordem inversa e com outro criador', async () => {
  const first = await generate();
  const firstPlan = await db.classFormationPlan.findUniqueOrThrow({ where: { id: first.id }, include: { placements: { include: { plannedClass: true } } } });
  const normalize = (plan: typeof firstPlan) => plan.placements.map(p => ({ applicationId: p.applicationId, status: p.status, waitlistOrder: p.waitlistOrder, reasonCodes: p.reasonCodes, classKey: p.plannedClass?.candidateKey ?? null })).sort((a, b) => a.applicationId.localeCompare(b.applicationId));
  const submissions = await db.registrationSubmission.findMany({ where: { campaignId: id('campaign') }, orderBy: { id: 'asc' } });
  const applications = await db.registrationApplication.findMany({ where: { offeringId: id('offering') }, orderBy: { id: 'asc' } });
  const team = await db.catechistAvailability.findMany({ where: { parishId: id('parish') }, orderBy: { userId: 'asc' } });
  await db.classFormationPlan.deleteMany({ where: { campaignId: id('campaign') } });
  await db.registrationApplication.deleteMany({ where: { offeringId: id('offering') } });
  await db.registrationSubmission.deleteMany({ where: { campaignId: id('campaign') } });
  await db.catechistAvailability.deleteMany({ where: { parishId: id('parish') } });
  for (const row of submissions.reverse()) await db.registrationSubmission.create({ data: { ...row, createdByUserId: priest.user.id } });
  for (const row of applications.reverse()) await db.registrationApplication.create({ data: { ...row, preferences: row.preferences as any } });
  for (const row of team.reverse()) await db.catechistAvailability.create({ data: { ...row, availability: row.availability as any } });
  const second = await generate(priest);
  const secondPlan = await db.classFormationPlan.findUniqueOrThrow({ where: { id: second.id }, include: { placements: { include: { plannedClass: true } } } });
  expect(secondPlan.inputHash).toBe(firstPlan.inputHash);
  expect(normalize(secondPlan)).toEqual(normalize(firstPlan));
 });
 it('aplica o corte de idade de cada campanha em paróquias diferentes', async () => {
  await db.tenantBilling.create({ data: { parishId: id('foreign'), plan: 'parish', status: 'ACTIVE' } });
  await db.catecheticalYear.create({ data: { id: id('foreign-year'), parishId: id('foreign'), name: 'Ano', startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31') } });
  await db.stage.create({ data: { id: id('foreign-stage'), yearId: id('foreign-year'), name: 'Etapa' } });
  await db.registrationCampaign.create({ data: { id: id('foreign-campaign'), slug: id('foreign-slug'), title: 'Campanha', parishId: id('foreign'), yearId: id('foreign-year'), createdById: other.user.id, status: 'CLOSED', opensAt: new Date('2020-01-01'), closesAt: new Date('2099-01-01'), ageCutoffDate: new Date('2025-12-31'), offeredWindows: [window], offeredCommunityIds: [] } });
  await db.registrationOffering.create({ data: { id: id('foreign-offering'), campaignId: id('foreign-campaign'), stageId: id('foreign-stage'), documentStageKind: 'PRE_CATECHESIS', audience: 'MINOR', minAge: 10, maxAge: 12 } });
  await db.room.create({ data: { id: id('foreign-room'), parishId: id('foreign'), name: 'Sala', nameKey: id('foreign-room'), capacity: 15 } });
  await db.membership.create({ data: { userId: id('assistant'), parishId: id('foreign'), role: 'ASSISTANT_CATECHIST' } });
  await db.catechistAvailability.create({ data: { parishId: id('foreign'), yearId: id('foreign-year'), userId: id('assistant'), availability } });
  await db.catechumenProfile.create({ data: { id: id('foreign-profile'), parishId: id('foreign'), firstName: 'Criança', lastName: 'Teste' } });
  await db.registrationSubmission.create({ data: { id: id('foreign-submission'), campaignId: id('foreign-campaign'), protocol: id('foreign-protocol'), requestKey: id('foreign-request'), payloadHash: 'hash', status: 'RECEIVED', contactName: 'Teste', retentionUntil: new Date('2099-01-01') } });
  await db.registrationApplication.create({ data: { id: id('foreign-app'), submissionId: id('foreign-submission'), offeringId: id('foreign-offering'), kind: 'MINOR', firstName: 'Criança', lastName: 'Teste', birthDate: new Date('2016-01-01'), ageAtCutoff: 9, preferences: [{ windowId: 'sat', rank: 1 }], status: 'APPROVED', catechumenProfileId: id('foreign-profile') } });
  await db.registrationOffering.update({ where: { id: id('offering') }, data: { minAge: 10 } });
  const eligible = await generate();
  const ineligible = await generateFormationPreview({ campaignId: id('foreign-campaign') }, other);
  expect(eligible.placements.find((p: any) => p.applicationId === id('app0'))).toMatchObject({ status: 'ALLOCATED' });
  expect(ineligible.placements[0]).toMatchObject({ status: 'NEEDS_REVIEW', reasonCodes: ['AGE_OUT_OF_RANGE'] });
  await db.registrationOffering.update({ where: { id: id('offering') }, data: { minAge: 7 } });
 });
 it('respeita a ordem das janelas e mantém irmãos no mesmo horário', async () => {
  const secondWindow = { id: 'sun', weekday: 0, startTime: '09:00', endTime: '10:00', label: 'Domingo' };
  const unavailableWindow = { id: 'fri', weekday: 5, startTime: '09:00', endTime: '10:00', label: 'Sexta' };
  await db.classFormationPlan.deleteMany({ where: { campaignId: id('campaign') } });
  await db.registrationCampaign.update({ where: { id: id('campaign') }, data: { offeredWindows: [window, secondWindow, unavailableWindow] } });
  await db.catechistAvailability.updateMany({ where: { parishId: id('parish') }, data: { availability: { version: 1, windows: [availability.windows[0], { weekday: 0, startTime: '09:00', endTime: '10:00' }], closures: [] } } });
  await db.room.update({ where: { id: id('room') }, data: { capacity: 2 } });
  await db.household.create({ data: { id: id('household'), parishId: id('parish') } });
  await db.registrationApplication.updateMany({ where: { id: { in: Array.from({ length: 12 }, (_, i) => id(`app${i + 4}`)) } }, data: { status: 'SUBMITTED' } });
  await db.registrationApplication.updateMany({ where: { id: { in: [id('app0'), id('app1')] } }, data: { householdId: id('household'), preferences: [{ windowId: 'sun', rank: 2 }, { windowId: 'sat', rank: 1 }] } });
  await db.registrationApplication.update({ where: { id: id('app2') }, data: { preferences: [{ windowId: 'sun', rank: 2 }, { windowId: 'sat', rank: 1 }] } });
  await db.registrationApplication.update({ where: { id: id('app3') }, data: { preferences: [{ windowId: 'fri', rank: 1 }] } });
  const plan = await generate();
  const placement = (n: number) => plan.placements.find((p: any) => p.applicationId === id(`app${n}`));
  const slot = (n: number) => (plan.plannedClasses.find((c: any) => c.id === placement(n).plannedClassId) as any)?.schedule.windowId;
  expect(slot(0)).toBe('sat'); expect(slot(1)).toBe('sat'); expect(placement(1).reasonCodes).toContain('SIBLING_SAME_SLOT');
  expect(slot(2)).toBe('sun');
  expect(placement(3)).toMatchObject({ status: 'NEEDS_REVIEW', reasonCodes: ['NO_CHOSEN_WINDOW_FITS'] });
  await db.registrationApplication.updateMany({ where: { offeringId: id('offering') }, data: { householdId: null, status: 'APPROVED', preferences: [{ windowId: 'sat', rank: 1 }] } });
  await db.registrationCampaign.update({ where: { id: id('campaign') }, data: { offeredWindows: [window] } });
  await db.catechistAvailability.updateMany({ where: { parishId: id('parish') }, data: { availability } });
  await db.room.update({ where: { id: id('room') }, data: { capacity: 15 } });
  await db.classFormationPlan.deleteMany({ where: { campaignId: id('campaign') } });
 });
 it('cria novo plano e substitui o anterior quando muda a disponibilidade da equipe', async () => {
  const old = await generate();
  await db.catechistAvailability.updateMany({ where: { parishId: id('parish') }, data: { availability: { version: 1, windows: [], closures: [] } } });
  const next = await generate();
  expect(next.id).not.toBe(old.id); expect(next.summary).toMatchObject({ allocated: 0, needsReview: 16 });
  expect((await db.classFormationPlan.findUniqueOrThrow({ where: { id: old.id } })).status).toBe('SUPERSEDED');
  await db.catechistAvailability.updateMany({ where: { parishId: id('parish') }, data: { availability } });
  await db.classFormationPlan.deleteMany({ where: { campaignId: id('campaign') } });
 });
 it('serializa concorrência, preserva ordem e não expõe dados pessoais', async () => {
  const [a, b] = await Promise.all([generate(), generate()]); expect(a.id).toBe(b.id); expect([a.reused, b.reused].sort()).toEqual([false, true]);
  expect(await db.catechistAvailability.count({ where: { parishId: id('parish') } })).toBe(2);
  expect(a.plannedClasses[0]).toMatchObject({ capacity: 15, occupied: 15 }); expect(a.plannedClasses[0].catechistIds).toHaveLength(1);
  expect(a.summary).toMatchObject({ allocated: 15, waitlisted: 1, classes: 1 }); expect(a.placements.find((p: any) => p.applicationId === id('app15'))).toMatchObject({ status: 'WAITLISTED', waitlistOrder: 1 });
  const plan = await db.classFormationPlan.findUniqueOrThrow({ where: { id: a.id } });
  const snapshot: any = JSON.parse(JSON.stringify(plan.inputSnapshot).replaceAll(suffix, 'UUID'));
  expect({ keys: Object.keys(snapshot).sort(), application: snapshot.applications.find((v: any) => v.id === 'formation-app0-UUID'), applicationCount: snapshot.applications.length, windowIds: snapshot.windowIds }).toMatchInlineSnapshot(`
    {
      "application": {
        "communityId": null,
        "householdKey": null,
        "id": "formation-app0-UUID",
        "offeringId": "formation-offering-UUID",
        "personId": "formation-profile0-UUID",
        "preferredWindows": [
          "sat",
        ],
      },
      "applicationCount": 16,
      "keys": [
        "applications",
        "catechists",
        "existingClassIds",
        "offerings",
        "preservedClassKeys",
        "rooms",
        "windowIds",
      ],
      "windowIds": [
        "sat",
      ],
    }
  `);
  const body = JSON.stringify([a, await getFormationPlan({ planId: a.id }, coordinator), await listFormationPlans({ campaignId: id('campaign') }, coordinator), plan.inputSnapshot, await db.auditLog.findMany({ where: { entityId: a.id } })]);
  expect(body).not.toContain('NomeSentinela'); expect(body).not.toContain('2016-01-01');
  expect(await db.catechesisClass.count({ where: { parishId: id('parish') } })).toBe(0); expect(await db.meeting.count({ where: { class: { parishId: id('parish') } } })).toBe(0);
 });
 it('autoriza e invalida a prévia quando a sala muda', async () => {
  const old = await generate(); expect((await generate(priest)).reused).toBe(true);
  await expect(generate(secretary)).rejects.toMatchObject({ statusCode: 403 }); await expect(generate(catechist)).rejects.toMatchObject({ statusCode: 403 }); await expect(generate(other)).rejects.toMatchObject({ statusCode: 404 });
  const member = await db.membership.findFirstOrThrow({ where: { userId: secretary.user.id } }); await db.registrationPermissionGrant.create({ data: { membershipId: member.id, action: 'EDIT_PREVIEW', grantedById: coordinator.user.id, reason: 'Teste' } }); expect((await generate(secretary)).reused).toBe(true);
  await db.room.update({ where: { id: id('room') }, data: { capacity: 14 } }); const next = await generate(); expect(next.id).not.toBe(old.id); expect((await db.classFormationPlan.findUniqueOrThrow({ where: { id: old.id } })).status).toBe('SUPERSEDED');
  await db.registrationCampaign.update({ where: { id: id('campaign') }, data: { status: 'OPEN' } }); await expect(generate()).rejects.toMatchObject({ statusCode: 409 }); await db.registrationCampaign.update({ where: { id: id('campaign') }, data: { status: 'CLOSED' } });
  process.env.REGISTRATIONS_ENABLED = 'false'; try { await expect(generate()).rejects.toMatchObject({ statusCode: 404 }); } finally { process.env.REGISTRATIONS_ENABLED = 'true'; }
 });
 it('preserva colocações bloqueadas acima da capacidade sem adicionar automaticamente', async () => {
  const old = await generate();
  const cls = await db.plannedClass.findFirstOrThrow({ where: { planId: old.id } });
  const assigned = await db.formationPlacement.findMany({ where: { planId: old.id, status: 'ALLOCATED' } });
  await db.formationPlacement.updateMany({ where: { id: { in: assigned.map(p => p.id) } }, data: { manual: true, locked: true } });
  const waiting = await db.formationPlacement.findFirstOrThrow({ where: { planId: old.id, status: 'WAITLISTED' }, orderBy: { waitlistOrder: 'asc' } });
  await db.formationPlacement.update({ where: { id: waiting.id }, data: { status: 'ALLOCATED', plannedClassId: cls.id, manual: true, locked: true, overCapacity: true, manualReason: 'NomeSentinela' } });
  const second = [catechist.user.id, id('assistant')].find(v => v !== (old.plannedClasses[0] as any).catechistIds[0])!;
  await db.plannedClassCatechist.create({ data: { plannedClassId: cls.id, userId: second, role: 'ASSISTANT' } });
  const next = await generate(); expect(next.id).not.toBe(old.id);
  expect(next.plannedClasses[0]).toMatchObject({ capacity: 14, occupied: 15 }); expect(next.plannedClasses[0].catechistIds).toHaveLength(2);
  expect(next.placements.filter((p: any) => p.status === 'ALLOCATED')).toHaveLength(15); expect(next.placements.filter((p: any) => p.status === 'ALLOCATED').every((p: any) => p.manual && p.locked && p.overCapacity)).toBe(true);
  expect(JSON.stringify(next)).not.toContain('NomeSentinela'); expect((await generate()).id).toBe(next.id);
 });
 it('exige plano institucional e valida argumentos estritos', async () => {
  await expect(generateFormationPreview({ campaignId: id('campaign'), extra: true }, coordinator)).rejects.toMatchObject({ statusCode: 400 });
  await db.tenantBilling.update({ where: { parishId: id('parish') }, data: { status: 'CANCELED' } });
  try { await expect(generate({ ...coordinator, entities: new Proxy(entities, {}) })).rejects.toMatchObject({ statusCode: 403 }); } finally { await db.tenantBilling.update({ where: { parishId: id('parish') }, data: { status: 'ACTIVE' } }); }
 });

});
