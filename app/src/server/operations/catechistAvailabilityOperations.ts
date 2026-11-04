import { HttpError, prisma } from 'wasp/server';
import { z } from 'zod';
import { availabilitySchema, emptyAvailability } from '../../shared/scheduling';
import { access, audit, idSchema, parse, requirePermission, scoped } from './schedulingAccess';

const base = { parishId: idSchema, yearId: idSchema, userId: idSchema.optional() };
async function authorize(context: any, input: any, write: boolean) {
  const member = await access(context, input.parishId);
  if (!await context.entities.CatecheticalYear.findFirst({ where: { id: input.yearId, parishId: input.parishId }, select: { id: true } })) throw new HttpError(404);
  const userId = input.userId ?? context.user.id;
  const target = await context.entities.Membership.findFirst({ where: { parishId: input.parishId, userId, status: 'ACTIVE' } });
  if (!target) throw new HttpError(404);
  if (userId !== context.user.id || (write && !['LEAD_CATECHIST', 'ASSISTANT_CATECHIST'].includes(member?.role))) {
    await requirePermission(context, input.parishId, target.communityId, 'CONFIGURE_ROOMS');
  }
  return { member, userId };
}
export async function getCatechistAvailability(args: unknown, context: any) {
  const input = parse(z.object(base).strict(), args); const { userId } = await authorize(context, input, false);
  const row = await context.entities.CatechistAvailability.findUnique({ where: { userId_parishId_yearId: { userId, parishId: input.parishId, yearId: input.yearId } } });
  return { availability: row?.availability ?? emptyAvailability(), revision: row?.revision ?? 0, declared: !!row };
}
export async function setCatechistAvailability(args: unknown, context: any) {
  const input = parse(z.object({ ...base, revision: z.number().int().min(0).optional(), availability: availabilitySchema }).strict(), args); const { userId } = await authorize(context, input, true);
  try { return await prisma.$transaction(async (tx: any) => {
    const key = `${input.parishId}:${input.yearId}:${userId}`;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`;
    const where = { userId_parishId_yearId: { userId, parishId: input.parishId, yearId: input.yearId } };
    const existing = await tx.catechistAvailability.findUnique({ where });
    if ((existing?.revision ?? 0) !== (input.revision ?? 0)) throw new HttpError(409, 'Versão desatualizada.');
    const row = existing ? await tx.catechistAvailability.update({ where, data: { availability: input.availability, revision: { increment: 1 }, updatedByUserId: context.user.id } }) : await tx.catechistAvailability.create({ data: { parishId: input.parishId, yearId: input.yearId, userId, availability: input.availability, updatedByUserId: context.user.id } });
    await audit(tx, context, input.parishId, 'CatechistAvailability', row.id, existing ? 'UPDATE' : 'CREATE', { userId, yearId: input.yearId, revision: row.revision });
    return { availability: row.availability, revision: row.revision, declared: true };
  }); } catch (e: any) { if (e.code === 'P2002') throw new HttpError(409, 'Versão desatualizada.'); throw e; }
}
export async function listCatechistAvailability(args: unknown, context: any) {
  const input = parse(z.object({ parishId: idSchema, yearId: idSchema }).strict(), args); const member = await access(context, input.parishId);
  await requirePermission(context, input.parishId, scoped(member) ? member.communityId : null, 'CONFIGURE_ROOMS');
  if (!await context.entities.CatecheticalYear.findFirst({ where: { id: input.yearId, parishId: input.parishId }, select: { id: true } })) throw new HttpError(404);
  const members = await context.entities.Membership.findMany({ where: { parishId: input.parishId, status: 'ACTIVE', role: { in: ['LEAD_CATECHIST', 'ASSISTANT_CATECHIST'] }, ...(scoped(member) ? { communityId: member.communityId } : {}) }, include: { user: { select: { firstName: true, lastName: true } } }, orderBy: { userId: 'asc' } });
  const rows = await context.entities.CatechistAvailability.findMany({ where: { parishId: input.parishId, yearId: input.yearId, userId: { in: members.map((m: any) => m.userId) } } });
  return members.map((m: any) => { const row = rows.find((r: any) => r.userId === m.userId); const a = row?.availability ?? emptyAvailability(); return { userId: m.userId, name: [m.user.firstName, m.user.lastName].filter(Boolean).join(' '), declared: !!row, windows: a.windows, closures: a.closures }; });
}
