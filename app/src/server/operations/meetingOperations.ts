import { HttpError } from 'wasp/server';
import { MembershipStatus } from '@prisma/client';
import { logger } from '../logger';
import {
  isFamilyPortalRole,
  isFamilySurface,
  loadActiveRoles,
  rolesAreFamilyOnly,
} from '../auth/familySurface';
import {
  dateIdCursorWhere,
  mergeWhere,
  pageParams,
  wrapDateIdPage,
} from './listCursor';

function isCoordinatorOrAbove(role: string | null): boolean {
  if (!role) return false;
  return ['SUPER_ADMIN', 'DIOCESE_ADMIN', 'PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR', 'PERSONAL_OWNER'].includes(role);
}

function isCatechistOrAbove(role: string): boolean {
  return isCoordinatorOrAbove(role) || ['LEAD_CATECHIST', 'ASSISTANT_CATECHIST'].includes(role);
}

const STAFF_ROLE_RANK = [
  'SUPER_ADMIN',
  'DIOCESE_ADMIN',
  'PARISH_COORDINATOR',
  'COMMUNITY_COORDINATOR',
  'PERSONAL_OWNER',
  'LEAD_CATECHIST',
  'ASSISTANT_CATECHIST',
];

async function getUserRole(
  context: any,
  parishId?: string | null,
  surface?: string | null,
): Promise<string> {
  if (context.user?.isAdmin && surface !== 'PORTAL') return 'SUPER_ADMIN';
  const roles = await loadActiveRoles(context, parishId);
  if (
    isFamilySurface({ context, roles, surface }) ||
    rolesAreFamilyOnly(roles)
  ) {
    if (roles.includes('GUARDIAN')) return 'GUARDIAN';
    if (roles.includes('CATECHUMEN')) return 'CATECHUMEN';
    return roles.find(isFamilyPortalRole) || 'GUARDIAN';
  }
  if (!roles.length) return '';
  let best = roles[0];
  let bestRank = STAFF_ROLE_RANK.indexOf(best);
  if (bestRank < 0) bestRank = 999;
  for (const role of roles) {
    const r = STAFF_ROLE_RANK.indexOf(role);
    if (r >= 0 && r < bestRank) {
      best = role;
      bestRank = r;
    }
  }
  return best || '';
}

/** Verifica se o usuário pertence à turma (por parish ou como catequista) */
async function assertUserBelongsToClass(context: any, classId: string): Promise<void> {
  if (context.user?.isAdmin) return;

  if (!context.entities?.CatechesisClass) {
    throw new HttpError(500, 'Entidade de turma indisponível nesta operação.');
  }

  const classData = await context.entities.CatechesisClass.findUnique({
    where: { id: classId },
    select: { parishId: true, catechists: { select: { userId: true } } },
  });

  if (!classData) throw new HttpError(404, 'Turma não encontrada.');

  // All ACTIVE memberships on this parish (multi-role safe)
  const memberships = await context.entities.Membership.findMany({
    where: {
      userId: context.user.id,
      parishId: classData.parishId,
      status: MembershipStatus.ACTIVE,
    },
    select: { role: true },
  });

  if (!memberships.length) {
    const isPersonalOwner = await context.entities.Parish.findFirst({
      where: { id: classData.parishId, ownerId: context.user.id, type: 'PERSONAL' },
      select: { id: true },
    });
    if (isPersonalOwner) return;
    throw new HttpError(403, 'Você não pertence a esta paróquia.');
  }

  const roles = memberships.map((m: { role: string }) => m.role);

  if (roles.some((r: string) => isCoordinatorOrAbove(r))) return;

  if (roles.some((r: string) => isCatechistOrAbove(r))) {
    const isClassCatechist = classData.catechists.some(
      (cc: any) => cc.userId === context.user.id,
    );
    if (isClassCatechist) return;
    // Fall through: may also be guardian of enrolled dependents
  }

  if (roles.includes('GUARDIAN')) {
    const guardians = await context.entities.GuardianProfile.findMany({
      where: { userId: context.user.id },
      select: { householdId: true },
    });
    const householdIds = guardians
      .map((g: { householdId: string | null }) => g.householdId)
      .filter(Boolean) as string[];
    if (householdIds.length) {
      const enrollment = await context.entities.ClassEnrollment.findFirst({
        where: {
          classId,
          status: 'ENROLLED',
          catechumenProfile: { householdId: { in: householdIds } },
        },
      });
      if (enrollment) return;
    }
  }

  if (roles.includes('CATECHUMEN')) {
    const enrollment = await context.entities.ClassEnrollment.findFirst({
      where: {
        classId,
        status: 'ENROLLED',
        catechumenProfile: { userId: context.user.id },
      },
    });
    if (enrollment) return;
  }

  throw new HttpError(403, 'Você não tem acesso a esta turma.');
}

/** Staff-only ops: class roster / attendance sheet / matrix */
async function assertCanTakeAttendance(
  context: any,
  classId: string,
  surface?: string | null,
): Promise<void> {
  await assertUserBelongsToClass(context, classId);
  const classData = await context.entities.CatechesisClass.findUnique({
    where: { id: classId },
    select: { parishId: true, catechists: { select: { userId: true } } },
  });
  if (!classData) throw new HttpError(404, 'Turma não encontrada.');

  const roles = await loadActiveRoles(context, classData.parishId);
  if (
    isFamilySurface({ context, roles, surface }) ||
    rolesAreFamilyOnly(roles)
  ) {
    throw new HttpError(
      403,
      'Lista de presença completa é exclusiva da equipe pastoral.',
    );
  }

  if (context.user.isAdmin) return;
  if (roles.some(isCoordinatorOrAbove)) return;
  if (roles.some((r) => isCatechistOrAbove(r))) {
    const ok = classData.catechists.some(
      (cc: any) => cc.userId === context.user.id,
    );
    if (ok) return;
  }
  throw new HttpError(403, 'Apenas catequistas da turma podem gerir a chamada.');
}

/** Returns array (legacy) or { items, nextCursor } when paginated/cursor. */
export const listMeetings = async (
  args: {
    classId: string;
    take?: number;
    skip?: number;
    cursor?: string | null;
    paginated?: boolean;
  },
  context: any,
): Promise<any> => {
  if (!context.user) throw new HttpError(401);
  if (!args.classId) throw new HttpError(400, 'classId é obrigatório.');
  await assertUserBelongsToClass(context, args.classId);

  const { useCursorPage, pageSize, take, skip } = pageParams(args);
  const where = mergeWhere(
    { classId: args.classId },
    dateIdCursorWhere(args.cursor, 'date'),
  );

  const rows = await context.entities.Meeting.findMany({
    where,
    orderBy: [{ date: 'desc' }, { id: 'desc' }],
    take: useCursorPage ? pageSize + 1 : take,
    skip: useCursorPage ? 0 : skip,
    include: {
      content: { select: { id: true, title: true } },
      _count: { select: { attendance: true } },
    },
  });

  return wrapDateIdPage(rows, pageSize, useCursorPage, 'date');
};

export const createMeeting = async (args: any, context: any) => {
  if (!context.user) throw new HttpError(401);
  const role = await getUserRole(context);
  if (!isCatechistOrAbove(role)) throw new HttpError(403, 'Apenas catequistas e coordenadores podem criar encontros.');

  // Verificar pertencimento à turma
  await assertUserBelongsToClass(context, args.classId);

  try {
    return await context.entities.Meeting.create({
      data: {
        classId: args.classId, title: args.title, theme: args.theme,
        date: new Date(args.date), notes: args.notes,
        contentId: args.contentId || null, status: 'NOT_STARTED',
      },
    });
  } catch (e: any) {
    logger.warn('[meetingOps] createMeeting error', { error: e.message });
    throw new HttpError(500, 'Erro ao criar encontro: ' + e.message);
  }
};

export const getMeetingAttendance = async (
  args: { meetingId: string; surface?: string },
  context: any,
) => {
  if (!context.user) throw new HttpError(401);

  const meeting = await context.entities.Meeting.findUnique({
    where: { id: args.meetingId },
    select: { classId: true },
  });
  if (!meeting) throw new HttpError(404, 'Encontro não encontrado.');
  await assertCanTakeAttendance(context, meeting.classId, args.surface);

  return context.entities.AttendanceRecord.findMany({
    where: { meetingId: args.meetingId },
    include: {
      catechumenProfile: { select: { id: true, firstName: true, lastName: true, photoUrl: true } },
    },
  });
};

/**
 * Attendance history matrix for a class.
 * Limited by date window (default last 90 days) and max meetings to avoid unbounded loads.
 */
export const getClassAttendanceMatrix = async (
  args: {
    classId: string;
    surface?: string;
    /** ISO date — inclusive lower bound (default: 90 days ago) */
    fromDate?: string;
    /** ISO date — exclusive upper bound (default: now + 1 day) */
    toDate?: string;
    /** Cap number of meetings (default 40, max 80) */
    take?: number;
  },
  context: any,
) => {
  if (!context.user) throw new HttpError(401);
  await assertCanTakeAttendance(context, args.classId, args.surface);

  const take = Math.min(Math.max(args.take || 40, 1), 80);
  const now = new Date();
  const defaultFrom = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const fromDate = args.fromDate ? new Date(args.fromDate) : defaultFrom;
  const toDate = args.toDate
    ? new Date(args.toDate)
    : new Date(now.getTime() + 24 * 60 * 60 * 1000);

  if (Number.isNaN(+fromDate) || Number.isNaN(+toDate)) {
    throw new HttpError(400, 'fromDate/toDate inválidos.');
  }

  return context.entities.Meeting.findMany({
    where: {
      classId: args.classId,
      date: { gte: fromDate, lt: toDate },
    },
    orderBy: { date: 'desc' },
    take,
    include: {
      attendance: {
        include: {
          catechumenProfile: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              photoUrl: true,
            },
          },
        },
      },
    },
  });
};

const ATTENDANCE_STATUSES = new Set(['PRESENT', 'ABSENT', 'LATE', 'JUSTIFIED']);
const MAX_BATCH_CHANGES = 100;

/**
 * Single-meeting attendance sheet for mobile operational flow.
 * Staff-only — never return full roster to GUARDIAN/CATECHUMEN.
 */
export const getMeetingAttendanceSheet = async (
  args: { classId: string; meetingId?: string; surface?: string },
  context: any,
): Promise<any> => {
  if (!context.user) throw new HttpError(401);
  if (!args.classId) throw new HttpError(400, 'classId é obrigatório.');
  await assertCanTakeAttendance(context, args.classId, args.surface);

  const siblingMeetings = await context.entities.Meeting.findMany({
    where: { classId: args.classId },
    orderBy: { date: 'desc' },
    take: 40,
    select: { id: true, date: true, title: true, status: true, theme: true },
  });

  if (siblingMeetings.length === 0) {
    return {
      meeting: null,
      participants: [],
      summary: { registered: 0, total: 0, present: 0, absent: 0, late: 0, justified: 0 },
      siblingMeetings: [],
      fetchedAt: new Date().toISOString(),
    };
  }

  let meetingId = args.meetingId;
  if (meetingId) {
    const ok = siblingMeetings.some((m: any) => m.id === meetingId);
    if (!ok) throw new HttpError(404, 'Encontro não encontrado nesta turma.');
  } else {
    const { pickFocusMeeting } = await import('../../shared/encounter');
    const picked = pickFocusMeeting(siblingMeetings as any[], new Date());
    meetingId = picked?.meeting.id || siblingMeetings[0].id;
  }

  const meeting = await context.entities.Meeting.findUnique({
    where: { id: meetingId },
    select: {
      id: true,
      title: true,
      theme: true,
      date: true,
      status: true,
      classId: true,
      class: { select: { id: true, name: true } },
    },
  });
  if (!meeting) throw new HttpError(404, 'Encontro não encontrado.');
  if (meeting.status === 'CANCELLED') {
    // Still return sheet (read-only UX on client)
  }

  const enrollments = await context.entities.ClassEnrollment.findMany({
    where: {
      classId: args.classId,
      status: 'ENROLLED',
      catechumenProfileId: { not: null },
    },
    include: {
      catechumenProfile: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          photoUrl: true,
        },
      },
    },
    orderBy: { catechumenProfile: { firstName: 'asc' } },
  });

  const attendance = await context.entities.AttendanceRecord.findMany({
    where: { meetingId: meeting.id },
    select: {
      id: true,
      catechumenProfileId: true,
      status: true,
      note: true,
      updatedAt: true,
    },
  });
  const byProfile = new Map<
    string,
    { id: string; status: string; note: string | null; updatedAt: Date | string }
  >(
    attendance.map((a: any) => [
      a.catechumenProfileId as string,
      {
        id: a.id,
        status: a.status,
        note: a.note ?? null,
        updatedAt: a.updatedAt,
      },
    ]),
  );

  const participants = enrollments
    .filter((e: any) => e.catechumenProfile?.id)
    .map((e: any) => {
      const p = e.catechumenProfile;
      const rec = byProfile.get(p.id as string);
      return {
        catechumenProfileId: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        photoUrl: p.photoUrl ?? null,
        enrollmentStatus: e.status,
        attendanceId: rec?.id ?? null,
        status: rec?.status ?? null,
        note: rec?.note ?? null,
        updatedAt: rec?.updatedAt ?? null,
      };
    });

  const summary = {
    registered: participants.filter((p: any) => p.status).length,
    total: participants.length,
    present: participants.filter((p: any) => p.status === 'PRESENT').length,
    absent: participants.filter((p: any) => p.status === 'ABSENT').length,
    late: participants.filter((p: any) => p.status === 'LATE').length,
    justified: participants.filter((p: any) => p.status === 'JUSTIFIED').length,
  };

  return {
    meeting: {
      id: meeting.id,
      title: meeting.title,
      theme: meeting.theme,
      date: meeting.date,
      status: meeting.status,
      class: meeting.class,
    },
    participants,
    summary,
    siblingMeetings: siblingMeetings.map((s: any) => ({
      id: s.id,
      date: s.date,
      title: s.title,
      status: s.status,
    })),
    fetchedAt: new Date().toISOString(),
  };
};

/**
 * Online batch attendance save — LWW by clientUpdatedAt when provided.
 * Max 100 changes; cancelled meetings rejected; per-row results.
 */
export const saveAttendanceBatch = async (
  args: {
    meetingId: string;
    changes: Array<{
      catechumenProfileId: string;
      status: string;
      note?: string | null;
      clientUpdatedAt?: string;
    }>;
  },
  context: any,
): Promise<any> => {
  if (!context.user) throw new HttpError(401);
  const role = await getUserRole(context);
  if (!isCatechistOrAbove(role)) {
    throw new HttpError(403, 'Apenas catequistas e coordenadores podem registrar presença.');
  }

  const changes = args.changes || [];
  if (changes.length === 0) {
    return { serverTime: new Date().toISOString(), results: [] };
  }
  if (changes.length > MAX_BATCH_CHANGES) {
    throw new HttpError(400, `Máximo de ${MAX_BATCH_CHANGES} alterações por lote.`);
  }

  const meeting = await context.entities.Meeting.findUnique({
    where: { id: args.meetingId },
    select: { classId: true, status: true },
  });
  if (!meeting) throw new HttpError(404, 'Encontro não encontrado.');
  if (meeting.status === 'CANCELLED') {
    throw new HttpError(400, 'Não é possível registar presença em encontro cancelado.');
  }
  await assertUserBelongsToClass(context, meeting.classId);

  const serverTime = new Date();
  const results: any[] = [];

  for (const change of changes) {
    const profileId = change.catechumenProfileId;
    const status = change.status;

    if (!profileId || !ATTENDANCE_STATUSES.has(status)) {
      results.push({
        catechumenProfileId: profileId || '',
        outcome: 'skipped',
        reason: 'invalid_status',
        status: null,
        updatedAt: null,
      });
      continue;
    }

    if (change.note != null && String(change.note).length > 500) {
      results.push({
        catechumenProfileId: profileId,
        outcome: 'skipped',
        reason: 'invalid_note',
        status: null,
        updatedAt: null,
      });
      continue;
    }

    const enrolled = await context.entities.ClassEnrollment.findFirst({
      where: {
        classId: meeting.classId,
        catechumenProfileId: profileId,
        status: 'ENROLLED',
      },
      select: { id: true },
    });
    if (!enrolled) {
      results.push({
        catechumenProfileId: profileId,
        outcome: 'skipped',
        reason: 'unenrolled',
        status: null,
        updatedAt: null,
      });
      continue;
    }

    const existing = await context.entities.AttendanceRecord.findFirst({
      where: { meetingId: args.meetingId, catechumenProfileId: profileId },
    });

    let clientAt = change.clientUpdatedAt
      ? new Date(change.clientUpdatedAt)
      : serverTime;
    if (Number.isNaN(+clientAt)) clientAt = serverTime;
    // Clamp future skew > 5 min
    if (+clientAt > +serverTime + 5 * 60 * 1000) clientAt = serverTime;

    if (existing && change.clientUpdatedAt) {
      if (+clientAt < +new Date(existing.updatedAt)) {
        results.push({
          catechumenProfileId: profileId,
          outcome: 'conflict',
          reason: 'stale_client',
          status: existing.status,
          updatedAt: existing.updatedAt,
          serverStatus: existing.status,
          serverUpdatedAt: existing.updatedAt,
        });
        continue;
      }
    }

    const data = {
      status,
      note: change.note ?? existing?.note ?? null,
      recordedById: context.user.id,
    };

    const saved = existing
      ? await context.entities.AttendanceRecord.update({
          where: { id: existing.id },
          data,
        })
      : await context.entities.AttendanceRecord.create({
          data: {
            meetingId: args.meetingId,
            catechumenProfileId: profileId,
            ...data,
          },
        });

    results.push({
      catechumenProfileId: profileId,
      outcome: 'applied',
      status: saved.status,
      updatedAt: saved.updatedAt,
    });
  }

  return { serverTime: serverTime.toISOString(), results };
};

export const listMeetingsForClasses = async (args: { classIds: string[] }, context: any) => {
  if (!context.user) throw new HttpError(401);

  // Verify access for all requested classes in parallel
  await Promise.all(args.classIds.map(classId => assertUserBelongsToClass(context, classId)));

  return context.entities.Meeting.findMany({
    where: { classId: { in: args.classIds } },
    orderBy: { date: 'desc' },
  });
};

export const saveAttendance = async (args: any, context: any) => {
  if (!context.user) throw new HttpError(401);
  const role = await getUserRole(context);
  if (!isCatechistOrAbove(role)) throw new HttpError(403, 'Apenas catequistas e coordenadores podem registrar presença.');

  // Verificar pertencimento à turma através do meeting
  const meeting = await context.entities.Meeting.findUnique({
    where: { id: args.meetingId },
    select: { classId: true },
  });
  if (!meeting) throw new HttpError(404, 'Encontro não encontrado.');
  await assertUserBelongsToClass(context, meeting.classId);

  // Validate catechumen is enrolled in this class
  const isEnrolled = await context.entities.ClassEnrollment.findFirst({
    where: { classId: meeting.classId, catechumenProfileId: args.catechumenProfileId, status: 'ENROLLED' },
    select: { id: true },
  });
  if (!isEnrolled) throw new HttpError(400, 'Catequizando não está inscrito nesta turma.');

  const existing = await context.entities.AttendanceRecord.findFirst({
    where: { meetingId: args.meetingId, catechumenProfileId: args.catechumenProfileId },
  });

  if (existing) {
    return context.entities.AttendanceRecord.update({
      where: { id: existing.id },
      data: { status: args.status, note: args.note, recordedById: context.user.id },
    });
  }
  return context.entities.AttendanceRecord.create({
    data: {
      meetingId: args.meetingId, catechumenProfileId: args.catechumenProfileId,
      status: args.status, note: args.note, recordedById: context.user.id,
    },
  });
};

export const justifyAbsence = async (args: { attendanceId: string; note: string }, context: any) => {
  if (!context.user) throw new HttpError(401);

  // Verificar se o attendance record existe e o usuário é guardian do catequizando
  const attendance = await context.entities.AttendanceRecord.findUnique({
    where: { id: args.attendanceId },
    select: { catechumenProfileId: true },
  });
  if (!attendance) throw new HttpError(404, 'Registro de presença não encontrado.');

  if (!context.user.isAdmin) {
    const guardian = await context.entities.GuardianProfile.findUnique({ where: { userId: context.user.id } });
    if (!guardian?.householdId) throw new HttpError(403, 'Acesso negado.');

    const catechumen = await context.entities.CatechumenProfile.findUnique({
      where: { id: attendance.catechumenProfileId },
      select: { householdId: true },
    });
    if (catechumen?.householdId !== guardian.householdId) {
      throw new HttpError(403, 'Você não é responsável por este catequizando.');
    }
  }

  return context.entities.AttendanceRecord.update({
    where: { id: args.attendanceId },
    data: { status: 'JUSTIFIED', note: args.note },
  });
};

/**
 * Family-facing justify without requiring a pre-existing AttendanceRecord.
 * Upserts JUSTIFIED for an enrolled household dependent.
 */
export const justifyAbsenceByMeeting = async (
  args: { meetingId: string; catechumenProfileId: string; note: string },
  context: any,
) => {
  if (!context.user) throw new HttpError(401);

  const note = (args.note || '').trim();
  if (note.length < 3 || note.length > 500) {
    throw new HttpError(400, 'Justificativa deve ter entre 3 e 500 caracteres.');
  }

  const meeting = await context.entities.Meeting.findUnique({
    where: { id: args.meetingId },
    select: { id: true, classId: true, status: true },
  });
  if (!meeting) throw new HttpError(404, 'Encontro não encontrado.');
  if (meeting.status === 'CANCELLED') {
    throw new HttpError(400, 'Não é possível justificar falta em encontro cancelado.');
  }

  await assertUserBelongsToClass(context, meeting.classId);

  if (!context.user.isAdmin) {
    const guardian = await context.entities.GuardianProfile.findUnique({
      where: { userId: context.user.id },
      select: { householdId: true },
    });
    if (!guardian?.householdId) throw new HttpError(403, 'Acesso negado.');

    const catechumen = await context.entities.CatechumenProfile.findUnique({
      where: { id: args.catechumenProfileId },
      select: { householdId: true },
    });
    if (!catechumen || catechumen.householdId !== guardian.householdId) {
      throw new HttpError(403, 'Você não é responsável por este catequizando.');
    }
  }

  const enrolled = await context.entities.ClassEnrollment.findFirst({
    where: {
      classId: meeting.classId,
      catechumenProfileId: args.catechumenProfileId,
      status: 'ENROLLED',
    },
    select: { id: true },
  });
  if (!enrolled) {
    throw new HttpError(400, 'Catequizando não está inscrito nesta turma.');
  }

  const existing = await context.entities.AttendanceRecord.findFirst({
    where: {
      meetingId: args.meetingId,
      catechumenProfileId: args.catechumenProfileId,
    },
  });

  if (existing) {
    return context.entities.AttendanceRecord.update({
      where: { id: existing.id },
      data: { status: 'JUSTIFIED', note, recordedById: context.user.id },
    });
  }

  return context.entities.AttendanceRecord.create({
    data: {
      meetingId: args.meetingId,
      catechumenProfileId: args.catechumenProfileId,
      status: 'JUSTIFIED',
      note,
      recordedById: context.user.id,
    },
  });
};

/** Server-enforced meeting status transitions (staff only). */
export function isAllowedMeetingStatusTransition(
  from: string,
  to: string,
): boolean {
  if (from === to) return true;
  const allowed: Record<string, string[]> = {
    NOT_STARTED: ['IN_PROGRESS', 'CANCELLED'],
    IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
    COMPLETED: [],
    CANCELLED: [],
  };
  return (allowed[from] || []).includes(to);
}

export const updateMeeting = async (args: any, context: any) => {
  if (!context.user) throw new HttpError(401);

  const role = await getUserRole(context);
  if (!isCatechistOrAbove(role)) {
    throw new HttpError(403, 'Apenas catequistas e coordenadores podem editar encontros.');
  }

  const meeting = await context.entities.Meeting.findUnique({
    where: { id: args.id },
    select: { classId: true, status: true },
  });
  if (!meeting) throw new HttpError(404, 'Encontro não encontrado.');

  // Check access: must belong to the class (catechist or coordinator)
  await assertUserBelongsToClass(context, meeting.classId);

  if (args.status !== undefined && args.status !== meeting.status) {
    if (!isAllowedMeetingStatusTransition(meeting.status, args.status)) {
      throw new HttpError(
        400,
        `Transição de status inválida: ${meeting.status} → ${args.status}.`,
      );
    }
  }

  // Validate contentId belongs to the same parish if provided
  if (args.contentId) {
    const classData = await context.entities.CatechesisClass.findUnique({
      where: { id: meeting.classId },
      select: { parishId: true },
    });
    const content = await context.entities.ContentItem.findUnique({
      where: { id: args.contentId },
      select: { parishId: true },
    });
    if (!content || content.parishId !== classData?.parishId) {
      throw new HttpError(400, 'O conteúdo não pertence à mesma paróquia da turma.');
    }
  }

  // Unlink content by passing null contentId — handled by the spread below

  const { id, ...data } = args;

  // Convert date string to Date object if present
  if (data.date) {
    data.date = new Date(data.date);
  }

  return context.entities.Meeting.update({
    where: { id },
    data,
    include: {
      content: { select: { id: true, title: true, theme: true } },
    },
  });
};

function shapeContentForRole(content: any, isStaff: boolean) {
  if (!content) return null;
  if (isStaff) {
    return {
      id: content.id,
      title: content.title,
      theme: content.theme,
      status: content.status,
      pastoralObjective: content.pastoralObjective,
      biblicalRef: content.biblicalRef,
      catechismRef: content.catechismRef,
      openingPrayer: content.openingPrayer,
      closingPrayer: content.closingPrayer,
      dynamic: content.dynamic,
      materials: content.materials,
      mainContent: content.mainContent,
      activity: content.activity,
      familyTask: content.familyTask,
      estimatedTime: content.estimatedTime,
    };
  }
  // Learners: only published materials
  if (content.status !== 'PUBLISHED') return null;
  return {
    id: content.id,
    title: content.title,
    theme: content.theme,
    mainContent: content.mainContent,
    materials: content.materials,
    openingPrayer: content.openingPrayer,
    closingPrayer: content.closingPrayer,
    activity: content.activity,
    biblicalRef: content.biblicalRef,
  };
}

export const getMeeting = async (
  args: { id: string; surface?: string },
  context: any,
): Promise<any> => {
  if (!context.user) throw new HttpError(401);

  const meeting = await context.entities.Meeting.findUnique({
    where: { id: args.id },
    include: {
      content: true,
      class: {
        select: {
          id: true,
          name: true,
          location: true,
          community: { select: { name: true, location: true } },
        },
      },
    },
  });

  if (!meeting) throw new HttpError(404, 'Encontro não encontrado.');
  if (!meeting.class) {
    throw new HttpError(404, 'Turma do encontro não encontrada.');
  }

  await assertUserBelongsToClass(context, meeting.classId);

  const classParish = await context.entities.CatechesisClass.findUnique({
    where: { id: meeting.classId },
    select: { parishId: true },
  });
  const role = await getUserRole(context, classParish?.parishId, args.surface);
  // After getUserRole family-surface resolution, only catechist+ roles are staff.
  const isStaff = isCatechistOrAbove(role);
  const isAdmin = Boolean(context.user.isAdmin) && isStaff;

  const locationHint =
    meeting.class?.location ||
    meeting.class?.community?.location ||
    meeting.class?.community?.name ||
    null;

  const base = {
    id: meeting.id,
    title: meeting.title,
    theme: meeting.theme,
    date: meeting.date,
    status: meeting.status,
    kind: meeting.kind,
    notes: isStaff ? meeting.notes : null,
    details: isStaff ? meeting.details : null,
    class: {
      id: meeting.class.id,
      name: meeting.class.name,
      location: meeting.class.location ?? null,
    },
    locationHint,
    content: shapeContentForRole(meeting.content, isStaff),
    permissions: {
      canEdit: isStaff,
      canTakeAttendance: isStaff,
      canChangeStatus: isStaff,
      canJustify: false,
    },
    fetchedAt: new Date().toISOString(),
  };

  if (isStaff) {
    const [totalActive, registered] = await Promise.all([
      context.entities.ClassEnrollment.count({
        where: { classId: meeting.classId, status: 'ENROLLED' },
      }),
      context.entities.AttendanceRecord.count({
        where: { meetingId: meeting.id },
      }),
    ]);
    return {
      ...base,
      attendanceSummary: { registered, totalActive },
    };
  }

  // Catechumen: own attendance only — never roster
  if (role === 'CATECHUMEN' || (!isStaff && !isAdmin)) {
    const ownProfile = await context.entities.CatechumenProfile.findFirst({
      where: { userId: context.user.id },
      select: { id: true },
    });
    let myAttendance: {
      id: string | null;
      status: string | null;
      note: string | null;
    } | null = null;
    if (ownProfile) {
      const rec = await context.entities.AttendanceRecord.findFirst({
        where: {
          meetingId: meeting.id,
          catechumenProfileId: ownProfile.id,
        },
        select: { id: true, status: true, note: true },
      });
      myAttendance = rec
        ? { id: rec.id, status: rec.status, note: rec.note }
        : { id: null, status: null, note: null };
    }

    // Guardian: dependents enrolled in this class
    let dependentsOnMeeting:
      | Array<{
          catechumenProfileId: string;
          firstName: string;
          lastName: string;
          attendanceId: string | null;
          status: string | null;
          note: string | null;
        }>
      | undefined;

    const guardian = await context.entities.GuardianProfile.findUnique({
      where: { userId: context.user.id },
      select: { householdId: true },
    });

    if (guardian?.householdId) {
      const dependents = await context.entities.CatechumenProfile.findMany({
        where: {
          householdId: guardian.householdId,
          enrollments: {
            some: { classId: meeting.classId, status: 'ENROLLED' },
          },
        },
        select: { id: true, firstName: true, lastName: true },
        orderBy: { firstName: 'asc' },
      });
      const depIds = dependents.map((d: { id: string }) => d.id);
      const records =
        depIds.length === 0
          ? []
          : await context.entities.AttendanceRecord.findMany({
              where: {
                meetingId: meeting.id,
                catechumenProfileId: { in: depIds },
              },
              select: {
                id: true,
                catechumenProfileId: true,
                status: true,
                note: true,
              },
            });
      const byProfile = new Map<
        string,
        { id: string; status: string; note: string | null }
      >(
        records.map((r: any) => [
          r.catechumenProfileId as string,
          { id: r.id, status: r.status, note: r.note ?? null },
        ]),
      );
      dependentsOnMeeting = dependents.map((d: any) => {
        const rec = byProfile.get(d.id as string);
        return {
          catechumenProfileId: d.id,
          firstName: d.firstName,
          lastName: d.lastName,
          attendanceId: rec?.id ?? null,
          status: rec?.status ?? null,
          note: rec?.note ?? null,
        };
      });
    }

    const canJustify = Boolean(
      dependentsOnMeeting?.some(
        (d) => !d.status || d.status === 'ABSENT' || d.status === 'LATE' || d.status === 'JUSTIFIED',
      ),
    );

    return {
      ...base,
      myAttendance: ownProfile ? myAttendance : undefined,
      dependentsOnMeeting,
      permissions: {
        ...base.permissions,
        canJustify,
      },
    };
  }

  return base;
};

export const deleteMeeting = async (args: { id: string }, context: any) => {
  if (!context.user) throw new HttpError(401);

  const meeting = await context.entities.Meeting.findUnique({
    where: { id: args.id },
    select: { classId: true },
  });
  if (!meeting) throw new HttpError(404, 'Encontro não encontrado.');

  await assertUserBelongsToClass(context, meeting.classId);

  await context.entities.AttendanceRecord.deleteMany({ where: { meetingId: args.id } });
  await context.entities.Meeting.delete({ where: { id: args.id } });

  return { success: true };
};
