import { HttpError, prisma } from 'wasp/server';
import { z } from 'zod';
import { availabilitySchema, detectConflicts, evaluateCapacity, evaluateRoomAssignment, normalizeRoomName } from '../../shared/scheduling';
import { access, audit, idSchema, level, parse, permitted, requirePermission, scoped } from './schedulingAccess';

const revision = z.number().int().min(1);
const roomData = z.object({ name: z.string().min(1).max(200), communityId: idSchema.nullable(), capacity: z.number().int().min(1).max(100000), notes: z.string().max(2000).nullable().optional(), availability: availabilitySchema }).strict();
const roomSelect = { id: true, name: true, communityId: true, capacity: true, active: true, notes: true, availability: true, revision: true };
const classInclude = { enrollments: { where: { status: 'ENROLLED', catechumenProfileId: { not: null } }, select: { catechumenProfileId: true } }, catechists: { select: { userId: true } } };
function schedulingClass(c: any) { return { ...c, catechistIds: c.catechists.map((v: any) => v.userId), enrolledProfileIds: c.enrollments.map((v: any) => v.catechumenProfileId) }; }
function capacity(c: any, roomCapacity?: number | null, adding = 0) { return evaluateCapacity({ classMax: c.maxCapacity, roomCapacity, occupied: c.enrollments.length, adding }); }
async function room(context: any, id: string) {
  const value = await context.entities.Room.findUnique({ where: { id } }); if (!value) throw new HttpError(404);
  const member = await access(context, value.parishId); return { value, member };
}
async function validateCommunity(context: any, parishId: string, communityId: string | null) {
  if (communityId && !await context.entities.Community.findFirst({ where: { id: communityId, parishId }, select: { id: true } })) throw new HttpError(400, 'Comunidade inválida.');
}
function normalized(data: any) { try { return { ...data, ...normalizeRoomName(data.name) }; } catch { throw new HttpError(400, 'Nome inválido.'); } }
function duplicate(error: any): never { if (error.code === 'P2002') throw new HttpError(409, 'Nome de sala já existe.'); throw error; }
export async function listRooms(args: unknown, context: any) {
  const input = parse(z.object({ parishId: idSchema, includeInactive: z.boolean().optional(), yearId: idSchema.optional() }).strict(), args);
  const member = await access(context, input.parishId);
  if (level(context, member, 'CONFIGURE_ROOMS') === 'N') throw new HttpError(403);
  const rooms = await context.entities.Room.findMany({ where: { parishId: input.parishId, ...(input.includeInactive ? {} : { active: true }), ...(scoped(member) ? { OR: [{ communityId: member.communityId }, { communityId: null }] } : {}) }, select: roomSelect, orderBy: { name: 'asc' }, take: 200 });
  const classes = await context.entities.CatechesisClass.findMany({ where: { roomId: { in: rooms.map((r: any) => r.id) }, ...(input.yearId ? { yearId: input.yearId } : {}), ...(scoped(member) ? { communityId: member.communityId } : {}) }, include: classInclude, orderBy: { id: 'asc' }, take: 300 });
  const editable = new Map<string, boolean>();
  for (const communityId of new Set<string | null>(rooms.map((r: any) => r.communityId ?? null))) editable.set(communityId ?? '', await permitted(context, input.parishId, communityId, 'CONFIGURE_ROOMS'));
  const result = rooms.map((r: any) => ({ ...r, canEdit: editable.get(r.communityId ?? '') === true, classes: classes.filter((c: any) => c.roomId === r.id).map((c: any) => ({ id: c.id, name: c.name, status: c.status, dayOfWeek: c.dayOfWeek, startTime: c.startTime, endTime: c.endTime, maxCapacity: c.maxCapacity, enrolled: c.enrollments.length, capacity: capacity(c, r.capacity) })) }));
  if (!input.yearId) return result;
  if (!await context.entities.CatecheticalYear.findFirst({ where: { id: input.yearId, parishId: input.parishId } })) throw new HttpError(404);
  const assignable = await context.entities.CatechesisClass.findMany({ where: { parishId: input.parishId, yearId: input.yearId, ...(scoped(member) ? { communityId: member.communityId } : {}) }, select: { id: true, name: true, communityId: true, dayOfWeek: true, startTime: true, endTime: true, roomId: true }, orderBy: { name: 'asc' }, take: 500 });
  const scopeFlags = new Map<string, { canEdit: boolean; canOverride: boolean }>();
  for (const communityId of new Set<string | null>(assignable.map((c: any) => c.communityId ?? null))) scopeFlags.set(communityId ?? '', { canEdit: await permitted(context, input.parishId, communityId, 'CONFIGURE_ROOMS'), canOverride: await permitted(context, input.parishId, communityId, 'OVERRIDE_CAPACITY') });
  return { rooms: result, canCreate: await permitted(context, input.parishId, scoped(member) ? member.communityId : null, 'CONFIGURE_ROOMS'), assignableClasses: assignable.map((c: any) => ({ ...c, ...scopeFlags.get(c.communityId ?? '') })) };
}
export async function createRoom(args: unknown, context: any) {
  const input = parse(z.object({ parishId: idSchema, data: roomData }).strict(), args); await access(context, input.parishId);
  await requirePermission(context, input.parishId, input.data.communityId, 'CONFIGURE_ROOMS'); await validateCommunity(context, input.parishId, input.data.communityId);
  const data = normalized(input.data);
  try { return await prisma.$transaction(async (tx: any) => { const result = await tx.room.create({ data: { ...data, parishId: input.parishId, createdByUserId: context.user.id, updatedByUserId: context.user.id }, select: roomSelect }); await audit(tx, context, input.parishId, 'Room', result.id, 'CREATE', { communityId: result.communityId, capacity: result.capacity }); return result; }); } catch (e) { return duplicate(e); }
}
export async function updateRoom(args: unknown, context: any) {
  const input = parse(z.object({ id: idSchema, revision, data: roomData }).strict(), args); const { value } = await room(context, input.id);
  await requirePermission(context, value.parishId, value.communityId, 'CONFIGURE_ROOMS'); await requirePermission(context, value.parishId, input.data.communityId, 'CONFIGURE_ROOMS'); await validateCommunity(context, value.parishId, input.data.communityId);
  const data = normalized(input.data);
  try { return await prisma.$transaction(async (tx: any) => {
    const updated = await tx.room.updateMany({ where: { id: value.id, revision: input.revision }, data: { ...data, revision: { increment: 1 }, updatedByUserId: context.user.id } }); if (!updated.count) throw new HttpError(409, 'Versão desatualizada.');
    const classes = await tx.catechesisClass.findMany({ where: { roomId: value.id }, include: classInclude });
    const affectedClasses = classes.map((c: any) => ({ classId: c.id, name: c.name, overBy: capacity(c, data.capacity).overBy })).filter((c: any) => c.overBy > 0);
    await audit(tx, context, value.parishId, 'Room', value.id, 'UPDATE', { previousCapacity: value.capacity, capacity: data.capacity, communityId: data.communityId });
    return { ...(await tx.room.findUnique({ where: { id: value.id }, select: roomSelect })), affectedClasses };
  }); } catch (e) { return duplicate(e); }
}
export async function setRoomActive(args: unknown, context: any) {
  const input = parse(z.object({ id: idSchema, revision, active: z.boolean() }).strict(), args); const { value } = await room(context, input.id); await requirePermission(context, value.parishId, value.communityId, 'CONFIGURE_ROOMS');
  return prisma.$transaction(async (tx: any) => { const result = await tx.room.updateMany({ where: { id: value.id, revision: input.revision }, data: { active: input.active, revision: { increment: 1 }, updatedByUserId: context.user.id } }); if (!result.count) throw new HttpError(409, 'Versão desatualizada.'); await audit(tx, context, value.parishId, 'Room', value.id, 'UPDATE', { active: Number(input.active) }); return tx.room.findUnique({ where: { id: value.id }, select: roomSelect }); });
}
export async function setClassRoom(args: unknown, context: any) {
  const input = parse(z.object({ classId: idSchema, roomId: idSchema.nullable() }).strict(), args);
  const cls = await context.entities.CatechesisClass.findUnique({ where: { id: input.classId } }); if (!cls) throw new HttpError(404); await access(context, cls.parishId); await requirePermission(context, cls.parishId, cls.communityId, 'CONFIGURE_ROOMS');
  return prisma.$transaction(async (tx: any) => {
    // Lock the class as well, so concurrent moves of one class cannot overwrite each other.
    await tx.$queryRaw`SELECT "id" FROM "CatechesisClass" WHERE "id" = ${cls.id} FOR UPDATE`;
    const current = await tx.catechesisClass.findUnique({ where: { id: cls.id }, include: classInclude });
    let warnings: any[] = []; let resultCapacity = capacity(current, null);
    if (input.roomId) {
      await tx.$queryRaw`SELECT "id" FROM "Room" WHERE "id" = ${input.roomId} FOR UPDATE`;
      const selected = await tx.room.findUnique({ where: { id: input.roomId } });
      if (!selected || selected.parishId !== cls.parishId) throw new HttpError(404);
      if (!selected.active) throw new HttpError(400, 'Sala inativa.');
      if (selected.communityId && selected.communityId !== current.communityId) throw new HttpError(400, 'Comunidade incompatível.');
      const others = await tx.catechesisClass.findMany({ where: { roomId: selected.id, yearId: current.yearId, id: { not: current.id } }, include: classInclude });
      const evaluation = evaluateRoomAssignment({ cls: schedulingClass(current), room: selected, otherClasses: others.map(schedulingClass) });
      if (evaluation.blocking.length) throw new HttpError(409, 'Conflito de horário.', { code: 'SCHEDULING_CONFLICT', kind: evaluation.blocking });
      warnings = evaluation.warnings; resultCapacity = evaluation.capacity;
    }
    await tx.catechesisClass.update({ where: { id: cls.id }, data: { roomId: input.roomId } }); await audit(tx, context, cls.parishId, 'CatechesisClass', cls.id, 'UPDATE', { roomId: input.roomId });
    return { classId: cls.id, roomId: input.roomId, warnings, capacity: resultCapacity };
  });
}
export async function getClassCapacity(args: unknown, context: any) {
  const input = parse(z.object({ classId: idSchema, adding: z.number().int().min(0).max(100000).optional() }).strict(), args);
  const cls = await context.entities.CatechesisClass.findUnique({ where: { id: input.classId }, include: { ...classInclude, room: true } }); if (!cls) throw new HttpError(404);
  const member = await access(context, cls.parishId); if (scoped(member) && member.communityId !== cls.communityId) throw new HttpError(403);
  if (level(context, member, 'CONFIGURE_ROOMS') === 'N' && level(context, member, 'REVIEW_REGISTRATION') === 'N') throw new HttpError(403);
  return { ...capacity(cls, cls.room?.capacity, input.adding), canOverride: await permitted(context, cls.parishId, cls.communityId, 'OVERRIDE_CAPACITY') };
}
export async function listSchedulingConflicts(args: unknown, context: any) {
  const input = parse(z.object({ parishId: idSchema, yearId: idSchema }).strict(), args); const member = await access(context, input.parishId);
  if (level(context, member, 'CONFIGURE_ROOMS') === 'N') throw new HttpError(403);
  if (!await context.entities.CatecheticalYear.findFirst({ where: { id: input.yearId, parishId: input.parishId } })) throw new HttpError(404);
  const classes = await context.entities.CatechesisClass.findMany({ where: { parishId: input.parishId, yearId: input.yearId, status: { notIn: ['ARCHIVED', 'CONCLUDED'] }, ...(scoped(member) ? { communityId: member.communityId } : {}) }, include: classInclude, take: 501 });
  if (classes.length > 500) throw new HttpError(400, 'Limite de 500 turmas excedido.');
  const rooms = await context.entities.Room.findMany({ where: { parishId: input.parishId, id: { in: classes.map((c: any) => c.roomId).filter(Boolean) } } });
  const availability = await context.entities.CatechistAvailability.findMany({ where: { parishId: input.parishId, yearId: input.yearId } });
  const conflicts = detectConflicts({ classes: classes.map(schedulingClass), rooms, availabilityByUser: Object.fromEntries(availability.map((a: any) => [a.userId, a.availability])) });
  return conflicts.map(c => ({ ...c, classNames: c.classIds.map(id => classes.find((v: any) => v.id === id)?.name), ...(c.roomId ? { roomName: rooms.find((r: any) => r.id === c.roomId)?.name } : {}) }));
}
