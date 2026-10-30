import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
vi.mock('wasp/server', async () => { const { PrismaClient } = await import('@prisma/client'); const url = new URL(process.env.DATABASE_URL!); url.searchParams.set('connection_limit', '2'); return { prisma: new PrismaClient({ datasources: { db: { url: url.toString() } } }), HttpError: class extends Error { constructor(public statusCode: number, message?: string, public data?: any) { super(message); } } }; });
import { prisma } from 'wasp/server';
import { createRoom, updateRoom, setRoomActive, setClassRoom, getClassCapacity, listRooms, listSchedulingConflicts } from '../server/operations/roomOperations';
import { getCatechistAvailability, setCatechistAvailability, listCatechistAvailability } from '../server/operations/catechistAvailabilityOperations';
import { assertCapacityOverride } from '../server/registrations/capacity';
const db = new PrismaClient();
const suffix = crypto.randomUUID(), id = (v: string) => `scheduling-${v}-${suffix}`;
const entities = new Proxy(db as any, { get(target, key: string) { return Reflect.get(target, key.charAt(0).toLowerCase() + key.slice(1)); } });
const ctx = (name: string) => ({ user: { id: id(name), isAdmin: false }, entities });
const coordinator = ctx('coordinator'), priest = ctx('priest'), secretary = ctx('secretary'), community = ctx('community'), catechist = ctx('catechist'), other = ctx('other');
const users = [coordinator, priest, secretary, community, catechist, other].map(v => v.user.id);
const empty = { version: 1 as const, windows: [], closures: [] };
const roomData = (name: string, communityId: string | null = null, capacity = 15) => ({ name, communityId, capacity, notes: null, availability: empty });
const create = (name: string, communityId: string | null = null, capacity = 15, context = coordinator) => createRoom({ parishId: id('parish'), data: roomData(name, communityId, capacity) }, context);
async function grant(context: typeof coordinator, action: string) { const member = await db.membership.findFirstOrThrow({ where: { userId: context.user.id } }); await db.registrationPermissionGrant.create({ data: { membershipId: member.id, action, grantedById: coordinator.user.id, reason: 'Teste' } }); }
describe.skipIf(!process.env.DATABASE_URL)('salas e disponibilidade com Postgres', () => {
  let enabled: string | undefined; let roomId: string; let raceRoomId: string;
  beforeAll(async () => {
    enabled = process.env.REGISTRATIONS_ENABLED; process.env.REGISTRATIONS_ENABLED = 'true';
    await db.user.createMany({ data: users.map(id => ({ id, firstName: 'Sentinela' })) });
    await db.parish.createMany({ data: [{ id: id('parish'), name: 'Teste' }, { id: id('foreign'), name: 'Outra' }] });
    await db.community.createMany({ data: [{ id: id('comm'), parishId: id('parish'), name: 'Um' }, { id: id('comm2'), parishId: id('parish'), name: 'Dois' }, { id: id('foreigncomm'), parishId: id('foreign'), name: 'Outra' }] });
    await db.membership.createMany({ data: [
      { userId: coordinator.user.id, parishId: id('parish'), role: 'PARISH_COORDINATOR' }, { userId: priest.user.id, parishId: id('parish'), role: 'PARISH_PRIEST' }, { userId: secretary.user.id, parishId: id('parish'), role: 'PARISH_SECRETARY' }, { userId: community.user.id, parishId: id('parish'), role: 'COMMUNITY_COORDINATOR', communityId: id('comm') }, { userId: catechist.user.id, parishId: id('parish'), role: 'LEAD_CATECHIST', communityId: id('comm') }, { userId: other.user.id, parishId: id('foreign'), role: 'PARISH_COORDINATOR' },
    ] });
    await db.tenantBilling.create({ data: { parishId: id('parish'), plan: 'parish', status: 'ACTIVE' } });
    await db.catecheticalYear.createMany({ data: ['year', 'year2'].map(v => ({ id: id(v), parishId: id('parish'), name: v, startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31') })) });
    await db.catechesisClass.createMany({ data: ['one', 'two', 'race1', 'race2', 'legacy', 'year2'].map(v => ({ id: id(v), name: v, parishId: id('parish'), communityId: id('comm'), yearId: id(v === 'year2' ? 'year2' : 'year'), dayOfWeek: v === 'legacy' ? null : 'SUNDAY', startTime: '08:00', endTime: '09:00', maxCapacity: 30 })) });
    await db.catechesisClass.create({ data: { id: id('foreignclass'), parishId: id('foreign'), name: 'Outra' } });
  });
  afterAll(async () => {
    await db.auditLog.deleteMany({ where: { parishId: id('parish') } });
    await db.classEnrollment.deleteMany({ where: { class: { parishId: id('parish') } } }); await db.classCatechist.deleteMany({ where: { class: { parishId: id('parish') } } });
    await db.catechistAvailability.deleteMany({ where: { parishId: id('parish') } }); await db.catechesisClass.deleteMany({ where: { parishId: { in: [id('parish'), id('foreign')] } } });
    await db.catechumenProfile.deleteMany({ where: { parishId: id('parish') } }); await db.room.deleteMany({ where: { parishId: { in: [id('parish'), id('foreign')] } } });
    await db.catecheticalYear.deleteMany({ where: { parishId: id('parish') } }); await db.registrationPermissionGrant.deleteMany({ where: { grantedById: coordinator.user.id } }); await db.membership.deleteMany({ where: { userId: { in: users } } }); await db.tenantBilling.deleteMany({ where: { parishId: id('parish') } }); await db.community.deleteMany({ where: { parishId: { in: [id('parish'), id('foreign')] } } }); await db.parish.deleteMany({ where: { id: { in: [id('parish'), id('foreign')] } } }); await db.user.deleteMany({ where: { id: { in: users } } });
    await db.$disconnect(); await prisma.$disconnect(); if (enabled === undefined) delete process.env.REGISTRATIONS_ENABLED; else process.env.REGISTRATIONS_ENABLED = enabled;
  });
  it('valida salas, autorização, revisão e escopo', async () => {
    const room = await create(' Salão   Azul '); roomId = room.id;
    await expect(create('salao azul')).rejects.toMatchObject({ statusCode: 409 });
    await expect(createRoom({ parishId: id('parish'), data: roomData('Invalida', null, 0) }, coordinator)).rejects.toMatchObject({ statusCode: 400 });
    await expect(create('Estrangeira', id('foreigncomm'))).rejects.toMatchObject({ statusCode: 400 });
    await expect(create('Sem delegação', null, 15, secretary)).rejects.toMatchObject({ statusCode: 403 });
    await expect(create('Catequista', null, 15, catechist)).rejects.toMatchObject({ statusCode: 403 });
    await expect(create('Outra paróquia', null, 15, other)).rejects.toMatchObject({ statusCode: 404 });
    await create('Padre', null, 15, priest); await grant(secretary, 'CONFIGURE_ROOMS'); await create('Secretaria', null, 15, secretary);
    await grant(community, 'CONFIGURE_ROOMS'); await create('Comunidade', id('comm'), 15, community);
    await expect(create('Outra comunidade', id('comm2'), 15, community)).rejects.toMatchObject({ statusCode: 403 });
    await expect(create('Paroquial', null, 15, community)).rejects.toMatchObject({ statusCode: 403 });
    expect(((await listRooms({ parishId: id('parish') }, catechist)) as any[]).some((r: any) => r.id === roomId && !r.canEdit)).toBe(true);
    await updateRoom({ id: roomId, revision: room.revision, data: roomData('Salão Azul', null, 10) }, coordinator);
    await expect(updateRoom({ id: roomId, revision: room.revision, data: roomData('Salão Azul') }, coordinator)).rejects.toMatchObject({ statusCode: 409 });
    process.env.REGISTRATIONS_ENABLED = 'false'; try { await expect(listRooms({ parishId: id('parish') }, coordinator)).rejects.toMatchObject({ statusCode: 404 }); } finally { process.env.REGISTRATIONS_ENABLED = 'true'; }
    await db.parish.update({ where: { id: id('parish') }, data: { type: 'PERSONAL' } }); try { await expect(listRooms({ parishId: id('parish') }, coordinator)).rejects.toMatchObject({ statusCode: 403 }); } finally { await db.parish.update({ where: { id: id('parish') }, data: { type: 'PARISH' } }); }
  });
  it('lista turmas do ano e permissões no retorno opcional', async () => {
    const result: any = await listRooms({ parishId: id('parish'), yearId: id('year') }, coordinator);
    expect(result.canCreate).toBe(true);
    expect(result.assignableClasses).toEqual(expect.arrayContaining([expect.objectContaining({ id: id('one'), name: 'one', canEdit: true })]));
    expect(result.assignableClasses.some((c: any) => c.id === id('year2'))).toBe(false);
    const readOnly: any = await listRooms({ parishId: id('parish'), yearId: id('year') }, catechist);
    expect(readOnly.canCreate).toBe(false);
    expect(readOnly.assignableClasses.every((c: any) => !c.canEdit)).toBe(true);
    await expect(listRooms({ parishId: id('parish'), yearId: 'invalid' }, coordinator)).rejects.toMatchObject({ statusCode: 404 });
  });
  it('atribui, impede conflitos e serializa concorrência', async () => {
    const foreignRoom = await db.room.create({ data: { parishId: id('foreign'), name: 'Outra', nameKey: 'outra', capacity: 10 } });
    await expect(setClassRoom({ classId: id('one'), roomId: foreignRoom.id }, coordinator)).rejects.toMatchObject({ statusCode: 404 });
    const assigned = await setClassRoom({ classId: id('one'), roomId }, coordinator); expect(assigned.warnings.some((w: any) => w.kind === 'ROOM_CAPACITY_BELOW_CLASS')).toBe(true);
    await expect(setClassRoom({ classId: id('two'), roomId }, coordinator)).rejects.toMatchObject({ statusCode: 409, data: { kind: expect.arrayContaining([expect.objectContaining({ kind: 'ROOM_DOUBLE_BOOKED', classIds: expect.arrayContaining([id('one'), id('two')]) })]) } });
    expect((await setClassRoom({ classId: id('legacy'), roomId }, coordinator)).warnings.some((w: any) => w.kind === 'CLASS_WITHOUT_SCHEDULE')).toBe(true);
    await setClassRoom({ classId: id('year2'), roomId }, coordinator); await setClassRoom({ classId: id('one'), roomId: null }, coordinator);
    const r = await create('Corrida'); raceRoomId = r.id;
    const results = await Promise.allSettled(['race1', 'race2'].map(v => setClassRoom({ classId: id(v), roomId: raceRoomId }, coordinator)));
    expect(results.filter(v => v.status === 'fulfilled')).toHaveLength(1); expect(results.filter(v => v.status === 'rejected')).toHaveLength(1);
    await setRoomActive({ id: raceRoomId, revision: r.revision, active: false }, coordinator);
    await expect(setClassRoom({ classId: id('two'), roomId: raceRoomId }, coordinator)).rejects.toMatchObject({ statusCode: 400 });
  });
  it('conta apenas catequizandos matriculados e verifica override', async () => {
    await db.catechumenProfile.createMany({ data: Array.from({ length: 18 }, (_, i) => ({ id: id(`profile${i}`), parishId: id('parish'), firstName: 'Sentinela', lastName: 'Pessoa' })) });
    await db.classEnrollment.createMany({ data: Array.from({ length: 18 }, (_, i) => ({ classId: id('legacy'), catechumenProfileId: id(`profile${i}`), status: i < 16 ? 'ENROLLED' as const : i === 16 ? 'DROPPED' as const : 'TRANSFERRED' as const })) });
    await db.classCatechist.createMany({ data: [{ classId: id('legacy'), userId: catechist.user.id }, { classId: id('legacy'), userId: coordinator.user.id }] });
    const updated = await updateRoom({ id: roomId, revision: 2, data: roomData('Salão Azul', null, 15) }, coordinator);
    await db.classEnrollment.updateMany({ where: { classId: id('legacy'), catechumenProfileId: id('profile15') }, data: { status: 'DROPPED' } });
    expect(await getClassCapacity({ classId: id('legacy') }, coordinator)).toMatchObject({ effective: 15, occupied: 15, free: 0, overBy: 0 });
    await db.classEnrollment.updateMany({ where: { classId: id('legacy'), catechumenProfileId: id('profile15') }, data: { status: 'ENROLLED' } });
    expect(await getClassCapacity({ classId: id('legacy') }, coordinator)).toMatchObject({ effective: 15, occupied: 16, overBy: 1 });
    const reduced = await updateRoom({ id: roomId, revision: updated.revision, data: roomData('Salão Azul', null, 10) }, coordinator);
    expect(reduced.affectedClasses).toEqual(expect.arrayContaining([expect.objectContaining({ classId: id('legacy'), overBy: 6 })]));
    expect(await getClassCapacity({ classId: id('legacy') }, coordinator)).toMatchObject({ effective: 10, occupied: 16, overBy: 6, canOverride: true });
    expect((await getClassCapacity({ classId: id('legacy') }, priest)).canOverride).toBe(true);
    expect((await getClassCapacity({ classId: id('legacy') }, secretary)).canOverride).toBe(false); expect((await getClassCapacity({ classId: id('legacy') }, catechist)).canOverride).toBe(false);
    const args = { parishId: id('parish'), communityId: id('comm'), classId: id('legacy'), roomId, occupied: 10, adding: 0 };
    expect(await assertCapacityOverride(catechist, args)).toMatchObject({ overBy: 0 });
    await expect(assertCapacityOverride(coordinator, { ...args, adding: 1 })).rejects.toMatchObject({ statusCode: 400, data: { reasonError: 'REASON_REQUIRED' } });
    await expect(assertCapacityOverride(coordinator, { ...args, adding: 1, reason: 'curto' })).rejects.toMatchObject({ statusCode: 400 });
    await expect(assertCapacityOverride(secretary, { ...args, adding: 1, reason: 'Motivo suficiente' })).rejects.toMatchObject({ statusCode: 403 });
    await expect(assertCapacityOverride(priest, { ...args, adding: 1, reason: 'Motivo suficiente' })).resolves.toMatchObject({ overBy: 1 });
    await grant(secretary, 'OVERRIDE_CAPACITY'); expect((await getClassCapacity({ classId: id('legacy') }, secretary)).canOverride).toBe(true);
  });
  it('revisa disponibilidade e retorna conflitos sem nomes pessoais', async () => {
    const args = { parishId: id('parish'), yearId: id('year') };
    expect(await getCatechistAvailability(args, catechist)).toMatchObject({ declared: false, revision: 0 });
    await setCatechistAvailability({ ...args, availability: empty }, catechist);
    await expect(setCatechistAvailability({ ...args, revision: 0, availability: empty }, catechist)).rejects.toMatchObject({ statusCode: 409 });
    await expect(setCatechistAvailability({ ...args, userId: coordinator.user.id, availability: empty }, catechist)).rejects.toMatchObject({ statusCode: 403 });
    await setCatechistAvailability({ ...args, userId: catechist.user.id, revision: 1, availability: empty }, coordinator);
    await expect(listCatechistAvailability(args, catechist)).rejects.toMatchObject({ statusCode: 403 });
    expect(await listCatechistAvailability(args, coordinator)).toEqual(expect.arrayContaining([expect.objectContaining({ userId: catechist.user.id, declared: true })]));
    await db.classCatechist.createMany({ data: [{ classId: id('one'), userId: catechist.user.id }, { classId: id('two'), userId: catechist.user.id }] });
    await db.classEnrollment.createMany({ data: [{ classId: id('one'), catechumenProfileId: id('profile0') }, { classId: id('two'), catechumenProfileId: id('profile0') }] });
    const conflicts = await listSchedulingConflicts(args, coordinator); expect(conflicts).toEqual(await listSchedulingConflicts(args, coordinator));
    expect(conflicts.map((c: any) => c.kind)).toEqual(expect.arrayContaining(['CATECHIST_UNAVAILABLE', 'CATECHIST_DOUBLE_BOOKED', 'PERSON_DOUBLE_BOOKED']));
    expect(JSON.stringify(conflicts)).not.toContain('Sentinela');
    expect(JSON.stringify(await db.auditLog.findMany({ where: { parishId: id('parish') } }))).not.toContain('Sentinela');
    expect(await db.emailMessage.count({ where: { to: 'sentinela@example.invalid' } })).toBe(0);
  });
});
