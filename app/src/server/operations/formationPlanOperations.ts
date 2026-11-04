import { HttpError, prisma } from 'wasp/server';
import { z } from 'zod';
import { assertRegistrationPermission, assertRegistrationsEnabled } from '../auth/registrationPermissions';
import { assertRegistrationsPlan } from './registrationCampaignOperations';
import { computeInputHash } from '../registrations/formationHash';
import { ALGORITHM_VERSION, buildInputSnapshot, generateFormationPlan, validatePlan, type FormationInput } from '../../shared/formationEngine';
import { classSlot, emptyAvailability, fitsWindows, closuresOnWeekday, timeToMinutes } from '../../shared/scheduling';
import { formationSchedulesOverlap, reviewCapacity } from '../../shared/formationReview';

const id = z.string().min(1).max(200);
const previewSchema = z.object({ campaignId: id, policy: z.object({ balanceOccupancy: z.boolean().optional(), siblingsSameClass: z.boolean().optional(), classCapacityDefault: z.number().int().min(1).max(2000).optional() }).strict().optional(), limits: z.object({ maxPlannedClasses: z.number().int().min(0).max(2000).optional(), maxClassesByPlan: z.number().int().min(0).max(2000).optional() }).strict().optional() }).strict();
const planSchema = z.object({ planId: id }).strict();
const campaignSchema = z.object({ campaignId: id }).strict();
// Motivos estruturados permitem auditá-los sem incluir texto livre ou dados pessoais.
const placementSchema = z.object({ planId: id, applicationId: id, expectedRevision: z.number().int().positive(), plannedClassId: id.nullable(), locked: z.boolean(), reason: z.enum(['PASTORAL_DECISION', 'FAMILY_REQUEST', 'SCHEDULE_CONFLICT', 'OTHER']), confirmOverCapacity: z.boolean().optional() }).strict();
function parse<T>(schema: z.ZodType<T>, value: unknown): T { const parsed = schema.safeParse(value); if (!parsed.success) throw new HttpError(400, 'Dados inválidos.'); return parsed.data; }

async function authorize(context: any, parishId: string) {
  assertRegistrationsEnabled();
  if (!context.user) throw new HttpError(401);
  const member = await context.entities.Membership.findFirst({ where: { parishId, userId: context.user.id, status: 'ACTIVE' }, select: { role: true } });
  if (member?.role === 'COMMUNITY_COORDINATOR') throw new HttpError(403);
  try {
    // A matriz permite publicação ao pároco diretamente; a prévia tem a mesma autorização.
    await assertRegistrationPermission(context, { parishId, action: member?.role === 'PARISH_PRIEST' ? 'PUBLISH_CLASSES' : 'EDIT_PREVIEW' });
  } catch (error: any) { if (error.statusCode === 403 && !member) throw new HttpError(404); throw error; }
  await assertRegistrationsPlan(context, parishId);
}
async function authorizedCampaign(context: any, campaignId: string) {
  assertRegistrationsEnabled(); if (!context.user) throw new HttpError(401);
  const campaign = await context.entities.RegistrationCampaign.findUnique({ where: { id: campaignId }, select: { id: true, parishId: true } });
  if (!campaign) throw new HttpError(404);
  await authorize(context, campaign.parishId); return campaign;
}
const detailInclude = { plannedClasses: { include: { catechists: true } }, placements: { include: { application: { select: { offeringId: true } } } } };
function response(plan: any) {
  return { id: plan.id, campaignId: plan.campaignId, status: plan.status, revision: plan.revision, sourceRevision: plan.sourceRevision, algorithmVersion: plan.algorithmVersion, hashShort: plan.inputHash.slice(0, 12), summary: plan.resultSummary,
    plannedClasses: plan.plannedClasses.map((c: any) => ({ id: c.id, offeringId: c.offeringId, roomId: c.roomId, communityId: c.communityId, schedule: c.schedule, capacity: c.maxCapacity, occupied: plan.placements.filter((p: any) => p.plannedClassId === c.id && p.status === 'ALLOCATED').length, catechistIds: c.catechists.map((t: any) => t.userId).sort() })).sort((a: any, b: any) => a.id.localeCompare(b.id)),
    placements: plan.placements.map((p: any) => ({ applicationId: p.applicationId, offeringId: p.application.offeringId, plannedClassId: p.plannedClassId, status: p.status, reasonCodes: p.reasonCodes, waitlistOrder: p.waitlistOrder, overCapacity: p.overCapacity, manual: p.manual, locked: p.locked, manualReasonCode: ['PASTORAL_DECISION', 'FAMILY_REQUEST', 'SCHEDULE_CONFLICT', 'OTHER'].includes(p.manualReason) ? p.manualReason : null })).sort((a: any, b: any) => a.applicationId.localeCompare(b.applicationId)) };
}

/** Edits only the current draft, under the same campaign lock used by recalculation. */
export async function updateFormationPlacement(args: unknown, context: any) {
  const data = parse(placementSchema, args);
  assertRegistrationsEnabled(); if (!context.user) throw new HttpError(401);
  const initial = await context.entities.ClassFormationPlan.findUnique({ where: { id: data.planId }, select: { parishId: true, campaignId: true } });
  if (!initial) throw new HttpError(404);
  await authorize(context, initial.parishId);
  return prisma.$transaction(async (tx: any) => {
    await tx.$queryRaw`SELECT id FROM "RegistrationCampaign" WHERE id = ${initial.campaignId} FOR UPDATE`;
    const plan = await tx.classFormationPlan.findUnique({ where: { id: data.planId }, include: { ...detailInclude, campaign: true } });
    if (!plan || plan.status !== 'DRAFT' || plan.revision !== data.expectedRevision || plan.sourceRevision !== plan.campaign.revision) throw new HttpError(409, 'Prévia desatualizada.');
    const placement = plan.placements.find((p: any) => p.applicationId === data.applicationId);
    if (!placement) throw new HttpError(404);
    const application = await tx.registrationApplication.findFirst({ where: { id: data.applicationId, offering: { campaignId: plan.campaignId }, status: 'APPROVED', needsReview: false, catechumenProfileId: { not: null } } });
    if (!application) throw new HttpError(409, 'Inscrição indisponível para alocação.');
    let excess = 0;
    const warnings: string[] = [];
    if (data.plannedClassId) {
      const target = plan.plannedClasses.find((c: any) => c.id === data.plannedClassId);
      if (!target || target.offeringId !== application.offeringId) throw new HttpError(400, 'Turma incompatível.');
      if ((target.minAge != null && application.ageAtCutoff < target.minAge) || (target.maxAge != null && application.ageAtCutoff > target.maxAge)) throw new HttpError(409, 'Idade incompatível.');
      const preferences = Array.isArray(application.preferences) ? [...application.preferences].sort((a: any, b: any) => a.rank - b.rank) : [];
      if (preferences[0]?.windowId !== target.schedule.windowId) warnings.push('PREFERENCE_NOT_FIRST');
      const earlier = await tx.formationPlacement.findFirst({ where: { planId: plan.id, status: 'WAITLISTED', applicationId: { not: application.id }, application: { offeringId: application.offeringId, submission: { submittedAt: { lt: (await tx.registrationSubmission.findUniqueOrThrow({ where: { id: application.submissionId }, select: { submittedAt: true } })).submittedAt } } } } });
      if (earlier) warnings.push('EARLIER_APPLICATION_WAITING');
      const room = await tx.room.findFirst({ where: { id: target.roomId, parishId: plan.parishId, active: true } });
      if (!room) throw new HttpError(409, 'Sala indisponível.');
      const start = timeToMinutes(target.schedule.startTime), end = timeToMinutes(target.schedule.endTime);
      if (start == null || end == null || !room.availability || !Array.isArray(room.availability.windows)) throw new HttpError(409, 'Horário indisponível.');
      const slot = { weekday: target.schedule.weekday, start, end };
      if ((room.availability.windows.length && !fitsWindows(slot, room.availability.windows)) || closuresOnWeekday(room.availability.closures ?? [], slot.weekday).length) throw new HttpError(409, 'Sala indisponível.');
      for (const teacher of target.catechists) {
        const member = await tx.membership.findFirst({ where: { parishId: plan.parishId, userId: teacher.userId, status: 'ACTIVE', role: { in: ['LEAD_CATECHIST', 'ASSISTANT_CATECHIST'] } } });
        const available = await tx.catechistAvailability.findFirst({ where: { parishId: plan.parishId, yearId: plan.campaign.yearId, userId: teacher.userId } });
        if (!member || !available || !fitsWindows(slot, available.availability.windows) || closuresOnWeekday(available.availability.closures, slot.weekday).length) throw new HttpError(409, 'Catequista indisponível.');
      }
      if (!target.catechists.length) throw new HttpError(409, 'Catequista indisponível.');
      const existing = await tx.catechesisClass.findMany({ where: { parishId: plan.parishId, yearId: plan.campaign.yearId, status: { notIn: ['ARCHIVED', 'CONCLUDED'] } }, include: { catechists: true, enrollments: { where: { status: 'ENROLLED' } } } });
      const conflict = (schedule: any, roomId: string | null, teachers: string[], people: string[]) => formationSchedulesOverlap(target.schedule, schedule) && (roomId === target.roomId || target.catechists.some((t: any) => teachers.includes(t.userId)) || people.includes(application.catechumenProfileId));
      if (plan.plannedClasses.some((c: any) => c.id !== target.id && conflict(c.schedule, c.roomId, c.catechists.map((t: any) => t.userId), [])) || existing.some((c: any) => { const slot = classSlot(c); return slot && conflict({ weekday: slot.weekday, startTime: c.startTime, endTime: c.endTime }, c.roomId, c.catechists.map((t: any) => t.userId), c.enrollments.map((e: any) => e.catechumenProfileId)); })) throw new HttpError(409, 'Conflito de horário.');
      const samePerson = await tx.formationPlacement.findMany({ where: { planId: plan.id, applicationId: { not: application.id }, status: 'ALLOCATED', application: { catechumenProfileId: application.catechumenProfileId } }, include: { plannedClass: true } });
      if (samePerson.some((p: any) => p.plannedClass && formationSchedulesOverlap(target.schedule, p.plannedClass.schedule))) throw new HttpError(409, 'Conflito de horário.');
      const occupied = plan.placements.filter((p: any) => p.applicationId !== application.id && p.plannedClassId === target.id && p.status === 'ALLOCATED').length + 1;
      excess = reviewCapacity(Math.min(target.maxCapacity, room.capacity), occupied).excess;
      if (excess) {
        await assertRegistrationPermission(context, { parishId: plan.parishId, action: 'OVERRIDE_CAPACITY' });
        if (!data.confirmOverCapacity) throw new HttpError(409, 'Confirme o excesso de capacidade.');
      }
    }
    await tx.formationPlacement.update({ where: { id: placement.id }, data: { plannedClassId: data.plannedClassId, status: data.plannedClassId ? 'ALLOCATED' : 'NEEDS_REVIEW', waitlistOrder: null, manual: true, locked: data.locked, overCapacity: excess > 0, manualReason: data.reason, changedById: context.user.id, reasonCodes: [excess ? 'MANUAL_OVER_CAPACITY' : 'MANUAL_PLACEMENT', ...warnings], scoreDetails: { explanation: { code: excess ? 'MANUAL_OVER_CAPACITY' : 'MANUAL_PLACEMENT', params: { excess } }, score: {} } } });
    const waiting = await tx.formationPlacement.findMany({ where: { planId: plan.id, status: 'WAITLISTED' }, include: { application: { include: { submission: true } } } });
    waiting.sort((a: any, b: any) => a.application.submission.submittedAt.getTime() - b.application.submission.submittedAt.getTime() || a.applicationId.localeCompare(b.applicationId));
    for (let i = 0; i < waiting.length; i++) await tx.formationPlacement.update({ where: { id: waiting[i].id }, data: { waitlistOrder: i + 1 } });
    const placements = await tx.formationPlacement.findMany({ where: { planId: plan.id } });
    const reasons: Record<string, number> = {}; for (const p of placements) if (p.status !== 'ALLOCATED') for (const code of p.reasonCodes) reasons[code] = (reasons[code] ?? 0) + 1;
    await tx.classFormationPlan.update({ where: { id: plan.id }, data: { revision: { increment: 1 }, resultSummary: { allocated: placements.filter((p: any) => p.status === 'ALLOCATED').length, waitlisted: waiting.length, needsReview: placements.filter((p: any) => p.status === 'NEEDS_REVIEW').length, classes: plan.plannedClasses.length, unallocatedReasons: reasons } } });
    const reasonCode = ['PASTORAL_DECISION', 'FAMILY_REQUEST', 'SCHEDULE_CONFLICT', 'OTHER'].indexOf(data.reason) + 1;
    await tx.auditLog.create({ data: { action: 'UPDATE', entityType: 'FormationPlacement', entityId: placement.id, parishId: plan.parishId, userId: context.user.id, metadata: JSON.stringify({ planId: plan.id, applicationId: application.id, plannedClassId: data.plannedClassId, revision: plan.revision + 1, excess, reasonCode }) } });
    return response(await tx.classFormationPlan.findUnique({ where: { id: plan.id }, include: detailInclude }));
  }, { timeout: 30000 });
}
export async function getFormationPlan(args: unknown, context: any) {
  const { planId } = parse(planSchema, args); assertRegistrationsEnabled(); if (!context.user) throw new HttpError(401);
  const plan = await context.entities.ClassFormationPlan.findUnique({ where: { id: planId }, include: detailInclude }); if (!plan) throw new HttpError(404);
  await authorize(context, plan.parishId); return response(plan);
}
export async function listFormationPlans(args: unknown, context: any) {
  const { campaignId } = parse(campaignSchema, args); await authorizedCampaign(context, campaignId);
  const plans = await context.entities.ClassFormationPlan.findMany({ where: { campaignId }, include: detailInclude, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] }); return plans.map(response);
}

/** Heurística determinística e limitada; não garante o ótimo global. Só produz prévias. */
export async function generateFormationPreview(args: unknown, context: any) {
  const data = parse(previewSchema, args); await authorizedCampaign(context, data.campaignId);
  return prisma.$transaction(async (tx: any) => {
    await tx.$queryRaw`SELECT id FROM "RegistrationCampaign" WHERE id = ${data.campaignId} FOR UPDATE`;
    const campaign = await tx.registrationCampaign.findUnique({ where: { id: data.campaignId }, include: { offerings: true } });
    if (!campaign) throw new HttpError(404);
    if (!['CLOSED', 'ORGANIZING'].includes(campaign.status)) throw new HttpError(409, 'Campanha ainda não está encerrada.');
    const [applications, rooms, members, availability, existing, previous] = await Promise.all([
      tx.registrationApplication.findMany({ where: { offering: { campaignId: campaign.id }, status: 'APPROVED', catechumenProfileId: { not: null } }, include: { submission: { select: { submittedAt: true } } }, take: 2001 }),
      tx.room.findMany({ where: { parishId: campaign.parishId, active: true }, take: 201 }),
      tx.membership.findMany({ where: { parishId: campaign.parishId, status: 'ACTIVE', role: { in: ['LEAD_CATECHIST', 'ASSISTANT_CATECHIST'] } }, take: 301 }),
      tx.catechistAvailability.findMany({ where: { parishId: campaign.parishId, yearId: campaign.yearId } }),
      tx.catechesisClass.findMany({ where: { parishId: campaign.parishId, yearId: campaign.yearId, status: { notIn: ['ARCHIVED', 'CONCLUDED'] } }, include: { catechists: true, enrollments: { where: { status: 'ENROLLED' } } } }),
      tx.classFormationPlan.findFirst({ where: { campaignId: campaign.id }, include: detailInclude, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] }),
    ]);
    if (applications.length > 2000 || rooms.length > 200 || members.length > 300) throw new HttpError(400, 'Limite de recursos excedido.');
    const preserved = previous?.placements.filter((p: any) => p.manual || p.locked) ?? [];
    const preservedIds = new Set(preserved.filter((p: any) => p.plannedClassId).map((p: any) => p.plannedClassId));
    const oldClasses = (previous?.plannedClasses ?? []).filter((c: any) => preservedIds.has(c.id));
    const input: FormationInput = {
      campaign: { cutoffDate: campaign.ageCutoffDate.toISOString().slice(0, 10), offeredWindows: campaign.offeredWindows, seatPolicy: campaign.seatPolicy, allowWaitlist: campaign.allowWaitlist },
      offerings: campaign.offerings.map((o: any) => ({ id: o.id, stageId: o.stageId, minAge: o.minAge, maxAge: o.maxAge, plannedSeats: o.plannedSeats, audience: o.audience })),
      applications: applications.map((a: any) => ({ id: a.id, offeringId: a.offeringId, submittedAt: a.submission.submittedAt.toISOString(), birthDate: a.birthDate.toISOString().slice(0, 10), status: a.status, needsReview: a.needsReview, identityResolved: true, personId: a.catechumenProfileId, communityId: a.communityId, householdKey: a.householdId, kind: a.kind, preferredWindows: [...a.preferences].sort((x: any, y: any) => x.rank - y.rank).map((p: any) => p.windowId) })),
      rooms: rooms.map((r: any) => ({ id: r.id, capacity: r.capacity, active: r.active, communityId: r.communityId, availability: r.availability })),
      catechists: members.map((m: any) => ({ userId: m.userId, communityId: m.communityId, role: m.role, availability: availability.find((a: any) => a.userId === m.userId)?.availability ?? emptyAvailability() })),
      existingClasses: existing.flatMap((c: any) => { const s = classSlot(c); return s ? [{ id: c.id, roomId: c.roomId, schedule: { weekday: s.weekday, startTime: c.startTime, endTime: c.endTime }, catechistIds: c.catechists.map((t: any) => t.userId), personIds: c.enrollments.map((e: any) => e.catechumenProfileId).filter(Boolean) }] : []; }),
      preservedClasses: oldClasses.map((c: any) => ({ candidateKey: c.candidateKey, offeringId: c.offeringId, roomId: c.roomId, communityId: c.communityId, windowId: c.schedule.windowId, schedule: { weekday: c.schedule.weekday, startTime: c.schedule.startTime, endTime: c.schedule.endTime }, minAge: c.minAge, maxAge: c.maxAge, capacity: c.maxCapacity, catechistIds: c.catechists.map((t: any) => t.userId) })),
      preservedPlacements: preserved.map((p: any) => ({ applicationId: p.applicationId, status: p.status, ...(p.plannedClassId ? { plannedClassKey: oldClasses.find((c: any) => c.id === p.plannedClassId)?.candidateKey } : {}), ...(p.status !== 'WAITLISTED' || p.waitlistOrder == null ? {} : { waitlistOrder: p.waitlistOrder }), reasonCodes: ['MANUAL_PLACEMENT'], explanation: { code: 'MANUAL_PLACEMENT', params: {} }, score: {}, manual: p.manual, locked: p.locked, overCapacity: p.status === 'ALLOCATED' && !!p.plannedClassId && preserved.filter((q: any) => q.status === 'ALLOCATED' && q.plannedClassId === p.plannedClassId).length > (oldClasses.find((c: any) => c.id === p.plannedClassId)?.maxCapacity ?? Infinity) })),
      policy: { balanceOccupancy: data.policy?.balanceOccupancy ?? false, siblingsSameClass: data.policy?.siblingsSameClass ?? false, ...(data.policy?.classCapacityDefault == null ? {} : { classCapacityDefault: data.policy.classCapacityDefault }) }, limits: data.limits,
    };
    const hash = computeInputHash(input);
    const old = await tx.classFormationPlan.findUnique({ where: { campaignId_inputHash_algorithmVersion: { campaignId: campaign.id, inputHash: hash, algorithmVersion: ALGORITHM_VERSION } }, include: detailInclude });
    if (old) return { ...response(old), reused: true };
    let output; try { output = generateFormationPlan(input); } catch { throw new HttpError(409, 'Os dados atuais não permitem preservar e validar a prévia.'); }
    if (validatePlan(input, output).length) throw new HttpError(409, 'Prévia inválida.');
    await tx.classFormationPlan.updateMany({ where: { campaignId: campaign.id, status: 'DRAFT' }, data: { status: 'SUPERSEDED' } });
    const plan = await tx.classFormationPlan.create({ data: { parishId: campaign.parishId, campaignId: campaign.id, inputHash: hash, algorithmVersion: ALGORITHM_VERSION, sourceRevision: campaign.revision, policySnapshot: input.policy, inputSnapshot: buildInputSnapshot(input), resultSummary: output.summary, createdById: context.user.id } });
    const classIds = new Map<string, string>();
    for (const c of output.plannedClasses) { const row = await tx.plannedClass.create({ data: { planId: plan.id, offeringId: c.offeringId, roomId: c.roomId, communityId: c.communityId, candidateKey: c.candidateKey, name: 'Turma planejada', minAge: c.minAge, maxAge: c.maxAge, maxCapacity: c.capacity, schedule: { ...c.schedule, windowId: c.windowId }, catechists: { create: c.catechistIds.map(userId => ({ userId })) } } }); classIds.set(c.candidateKey, row.id); }
    if (output.placements.length) await tx.formationPlacement.createMany({ data: output.placements.map(p => { const prior = preserved.find((x: any) => x.applicationId === p.applicationId); return { planId: plan.id, applicationId: p.applicationId, plannedClassId: p.plannedClassKey ? classIds.get(p.plannedClassKey) : null, status: p.status, waitlistOrder: p.waitlistOrder, reasonCodes: p.reasonCodes, scoreDetails: { explanation: p.explanation, score: p.score }, manual: p.manual, locked: p.locked, overCapacity: p.overCapacity, manualReason: prior?.manualReason ?? null, changedById: prior?.changedById ?? null }; }) });
    await tx.auditLog.create({ data: { action: 'CREATE', entityType: 'ClassFormationPlan', entityId: plan.id, parishId: campaign.parishId, userId: context.user.id, metadata: JSON.stringify({ campaignId: campaign.id, planId: plan.id, classes: output.summary.classes, allocated: output.summary.allocated, waitlisted: output.summary.waitlisted, needsReview: output.summary.needsReview }) } });
    return { ...response(await tx.classFormationPlan.findUnique({ where: { id: plan.id }, include: detailInclude })), reused: false };
  }, { timeout: 30000 });
}
