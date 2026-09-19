import type { Request, Response } from 'express';
import { HttpError } from 'wasp/server';

import {
  addAssistantCatechist,
  bulkEnrollCatechumens,
  cancelEnrollment,
  createClass,
  enrollCatechumen,
  listParishCatechists,
  removeCatechistFromClass,
  updateClass,
} from '../operations/classOperations';
import { listCommunities } from '../operations/communityOperations';
import { getOrCreateClassChat } from '../operations/conversationOperations';
import { getMonthlyPlan } from '../operations/monthlyPlanOperations';
import {
  createMeeting,
  deleteMeeting,
  getClassAttendanceMatrix,
  getMeetingAttendance,
  getMeetingAttendanceSheet,
  justifyAbsence,
  justifyAbsenceByMeeting,
  saveAttendanceBatch,
  updateMeeting,
} from '../operations/meetingOperations';
import { createCatechumen, deleteCatechumen, updateCatechumen } from '../operations/catechumenOperations';
import { getCatechumenAttendanceReport } from '../operations/catechumenReportOperations';
import { generateCatechumenUploadToken } from '../operations/uploadTokenOperations';
import {
  addGuardianToHousehold,
  createHousehold,
  removeGuardianFromHousehold,
  updateGuardianProfile,
  updateHousehold,
} from '../operations/familyOperations';
import { listConsents, saveConsent } from '../operations/consentOperations';
import { parseOptionalString, parseRequiredString, requireMobileSessionVerification, toOperationContext } from './mobile';

type Handler = (req: Request, res: Response, context: any) => Promise<Response>;

/**
 * Wrapper fino: verifica a sessão (2FA) e delega na operação Wasp existente,
 * reutilizando o mesmo RBAC da web. `build` extrai os args do pedido.
 */
function mobileOp<TArgs>(op: (args: TArgs, context: any) => Promise<unknown>, build: (req: Request) => TArgs): Handler {
  return async (req, res, context) => {
    const opCtx = toOperationContext(context);
    await requireMobileSessionVerification(opCtx);
    const result = await op(build(req), opCtx);
    return res.json(result ?? { success: true });
  };
}

function body(req: Request): Record<string, any> {
  return (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, any>;
}

function optionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.length > 0) : [];
}

function omitUndefined<T extends Record<string, unknown>>(input: T): T {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as T;
}

// ─────────────────────────────────────────────────────────────────────────────
// Turmas
// ─────────────────────────────────────────────────────────────────────────────

export const mobileCreateClass = mobileOp(createClass, (req) => {
  const b = body(req);
  return omitUndefined({
    name: parseRequiredString(b.name, 'name'),
    parishId: parseOptionalString(b.workspaceId ?? b.parishId),
    communityId: parseOptionalString(b.communityId),
    stageId: parseOptionalString(b.stageId),
    sacramentId: parseOptionalString(b.sacramentId),
    yearId: parseOptionalString(b.yearId),
    dayOfWeek: parseOptionalString(b.dayOfWeek),
    startTime: parseOptionalString(b.startTime),
    endTime: parseOptionalString(b.endTime),
    location: parseOptionalString(b.location),
    maxCapacity: optionalNumber(b.maxCapacity),
  });
});

export const mobileUpdateClass = mobileOp(updateClass, (req) => {
  const b = body(req);
  return omitUndefined({
    id: parseRequiredString(req.params.id, 'id'),
    name: parseOptionalString(b.name),
    communityId: b.communityId === null ? null : parseOptionalString(b.communityId),
    stageId: parseOptionalString(b.stageId),
    sacramentId: parseOptionalString(b.sacramentId),
    yearId: parseOptionalString(b.yearId),
    dayOfWeek: parseOptionalString(b.dayOfWeek),
    startTime: parseOptionalString(b.startTime),
    endTime: parseOptionalString(b.endTime),
    location: parseOptionalString(b.location),
    maxCapacity: optionalNumber(b.maxCapacity),
    status: parseOptionalString(b.status),
  });
});

export const mobileEnrollCatechumens: Handler = async (req, res, context) => {
  const opCtx = toOperationContext(context);
  await requireMobileSessionVerification(opCtx);
  const classId = parseRequiredString(req.params.id, 'id');
  const b = body(req);
  const ids = stringArray(b.catechumenProfileIds);
  const single = parseOptionalString(b.catechumenProfileId);
  if (single) ids.push(single);
  if (ids.length === 0) throw new HttpError(400, 'Indique pelo menos um catequizando.');
  if (ids.length === 1) {
    return res.json(await enrollCatechumen({ classId, catechumenProfileId: ids[0] }, opCtx));
  }
  return res.json(await bulkEnrollCatechumens({ classId, catechumenProfileIds: ids }, opCtx));
};

export const mobileCancelEnrollment = mobileOp(cancelEnrollment, (req) => ({
  enrollmentId: parseRequiredString(req.params.enrollmentId, 'enrollmentId'),
}));

export const mobileAddClassCatechist = mobileOp(addAssistantCatechist, (req) => ({
  classId: parseRequiredString(req.params.id, 'id'),
  userId: parseRequiredString(body(req).userId, 'userId'),
}));

export const mobileRemoveClassCatechist = mobileOp(removeCatechistFromClass, (req) => ({
  classId: parseRequiredString(req.params.id, 'id'),
  userId: parseRequiredString(req.params.userId, 'userId'),
}));

export const mobileClassPlan = mobileOp(getMonthlyPlan, (req) => ({
  classId: parseRequiredString(req.params.id, 'id'),
  month: optionalNumber(req.query.month),
  year: optionalNumber(req.query.year),
}));

export const mobileClassChat = mobileOp(getOrCreateClassChat, (req) => ({
  classId: parseRequiredString(req.params.id, 'id'),
}));

export const mobileClassAttendanceMatrix = mobileOp(getClassAttendanceMatrix, (req) => ({
  classId: parseRequiredString(req.params.id, 'id'),
  surface: 'mobile',
  fromDate: parseOptionalString(req.query.fromDate),
  toDate: parseOptionalString(req.query.toDate),
  take: optionalNumber(req.query.take),
}));

export const mobileCommunities = mobileOp(listCommunities, (req) => ({
  workspaceId: parseOptionalString(req.query.workspaceId),
  parishId: parseOptionalString(req.query.parishId),
}));

export const mobileCatechists = mobileOp(listParishCatechists, (req) => ({
  parishId: parseRequiredString(req.query.workspaceId ?? req.query.parishId, 'workspaceId'),
}));

// ─────────────────────────────────────────────────────────────────────────────
// Encontros e presenças
// ─────────────────────────────────────────────────────────────────────────────

export const mobileCreateMeeting = mobileOp(createMeeting, (req) => {
  const b = body(req);
  return omitUndefined({
    classId: parseRequiredString(b.classId, 'classId'),
    title: parseRequiredString(b.title, 'title'),
    theme: parseOptionalString(b.theme),
    date: parseRequiredString(b.date, 'date'),
    notes: parseOptionalString(b.notes),
    contentId: parseOptionalString(b.contentId),
  });
});

export const mobileUpdateMeeting = mobileOp(updateMeeting, (req) => {
  const b = body(req);
  return omitUndefined({
    id: parseRequiredString(req.params.id, 'id'),
    title: parseOptionalString(b.title),
    theme: parseOptionalString(b.theme),
    date: parseOptionalString(b.date),
    notes: parseOptionalString(b.notes),
    contentId: b.contentId === null ? null : parseOptionalString(b.contentId),
    status: parseOptionalString(b.status),
  });
});

export const mobileDeleteMeeting = mobileOp(deleteMeeting, (req) => ({
  id: parseRequiredString(req.params.id, 'id'),
}));

export const mobileMeetingAttendanceSheet = mobileOp(getMeetingAttendanceSheet, (req) => ({
  classId: parseRequiredString(req.query.classId, 'classId'),
  meetingId: parseRequiredString(req.params.id, 'id'),
  surface: 'mobile',
}));

export const mobileMeetingAttendance = mobileOp(getMeetingAttendance, (req) => ({
  meetingId: parseRequiredString(req.params.id, 'id'),
  surface: 'mobile',
}));

export const mobileJustifyAbsenceByMeeting = mobileOp(justifyAbsenceByMeeting, (req) => ({
  meetingId: parseRequiredString(req.params.id, 'id'),
  catechumenProfileId: parseRequiredString(body(req).catechumenProfileId, 'catechumenProfileId'),
  note: parseRequiredString(body(req).note, 'note'),
}));

export const mobileSaveAttendanceBatch = mobileOp(saveAttendanceBatch, (req) => {
  const b = body(req);
  const changes = Array.isArray(b.changes) ? b.changes : Array.isArray(b.entries) ? b.entries : [];
  return {
    meetingId: parseRequiredString(b.meetingId, 'meetingId'),
    changes: changes
      .filter((item: any) => item && typeof item.catechumenProfileId === 'string' && typeof item.status === 'string')
      .map((item: any) => ({
        catechumenProfileId: item.catechumenProfileId,
        status: item.status,
        note: typeof item.note === 'string' ? item.note : undefined,
        clientUpdatedAt: typeof item.clientUpdatedAt === 'string' ? item.clientUpdatedAt : undefined,
      })),
  };
});

// ─────────────────────────────────────────────────────────────────────────────
// Catequizandos
// ─────────────────────────────────────────────────────────────────────────────

export const mobileCreateCatechumen = mobileOp(createCatechumen, (req) => {
  const b = body(req);
  return omitUndefined({
    firstName: parseRequiredString(b.firstName, 'firstName'),
    lastName: parseRequiredString(b.lastName, 'lastName'),
    email: parseOptionalString(b.email),
    birthDate: parseOptionalString(b.birthDate),
    householdId: parseOptionalString(b.householdId),
    photoUrl: parseOptionalString(b.photoUrl),
    workspaceId: parseOptionalString(b.workspaceId),
  });
});

export const mobileUpdateCatechumen = mobileOp(updateCatechumen, (req) => {
  const b = body(req);
  return omitUndefined({
    id: parseRequiredString(req.params.id, 'id'),
    firstName: parseOptionalString(b.firstName),
    lastName: parseOptionalString(b.lastName),
    email: b.email === null ? null : parseOptionalString(b.email),
    birthDate: b.birthDate === null ? null : parseOptionalString(b.birthDate),
    householdId: b.householdId === null ? null : parseOptionalString(b.householdId),
    photoUrl: b.photoUrl === null ? null : parseOptionalString(b.photoUrl),
  });
});

export const mobileDeleteCatechumen = mobileOp(deleteCatechumen, (req) => ({
  id: parseRequiredString(req.params.id, 'id'),
}));

export const mobileJustifyAbsence = mobileOp(justifyAbsence, (req) => ({
  attendanceId: parseRequiredString(body(req).attendanceId, 'attendanceId'),
  note: parseRequiredString(body(req).note, 'note'),
}));

export const mobileCatechumenAttendanceReport = mobileOp(getCatechumenAttendanceReport, (req) => ({
  catechumenId: parseRequiredString(req.params.id, 'id'),
}));

export const mobileCatechumenUploadToken = mobileOp(generateCatechumenUploadToken, (req) => ({
  catechumenProfileId: parseRequiredString(req.params.id, 'id'),
  workspaceId: parseOptionalString(body(req).workspaceId),
}));

// ─────────────────────────────────────────────────────────────────────────────
// Famílias, responsáveis e consentimentos
// ─────────────────────────────────────────────────────────────────────────────

export const mobileCreateFamily = mobileOp(createHousehold, (req) => {
  const b = body(req);
  return omitUndefined({
    name: parseRequiredString(b.name, 'name'),
    address: parseOptionalString(b.address),
    phone: parseOptionalString(b.phone),
    parishId: parseOptionalString(b.workspaceId ?? b.parishId),
    communityId: parseOptionalString(b.communityId),
  });
});

export const mobileUpdateFamily = mobileOp(updateHousehold, (req) => {
  const b = body(req);
  return omitUndefined({
    id: parseRequiredString(req.params.id, 'id'),
    name: parseOptionalString(b.name),
    address: parseOptionalString(b.address),
    phone: parseOptionalString(b.phone),
  });
});

export const mobileAddGuardian = mobileOp(addGuardianToHousehold, (req) => {
  const b = body(req);
  return omitUndefined({
    householdId: parseRequiredString(req.params.id, 'id'),
    userId: parseOptionalString(b.userId),
    firstName: parseOptionalString(b.firstName),
    lastName: parseOptionalString(b.lastName),
    email: parseOptionalString(b.email),
    relationship: parseOptionalString(b.relationship),
    phone: parseOptionalString(b.phone),
  });
});

export const mobileUpdateGuardian = mobileOp(updateGuardianProfile, (req) => {
  const b = body(req);
  return omitUndefined({
    guardianProfileId: parseRequiredString(req.params.guardianId, 'guardianId'),
    firstName: parseOptionalString(b.firstName),
    lastName: parseOptionalString(b.lastName),
    relationship: parseOptionalString(b.relationship),
    phone: parseOptionalString(b.phone),
  });
});

export const mobileRemoveGuardian = mobileOp(removeGuardianFromHousehold, (req) => ({
  guardianProfileId: parseRequiredString(req.params.guardianId, 'guardianId'),
}));

export const mobileConsents = mobileOp(listConsents, () => undefined as void);

export const mobileSaveConsent = mobileOp(saveConsent, (req) => {
  const b = body(req);
  if (typeof b.granted !== 'boolean') throw new HttpError(400, 'Missing or invalid granted.');
  return { type: parseRequiredString(b.type, 'type'), granted: b.granted };
});
