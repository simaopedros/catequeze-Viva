import { HttpError } from 'wasp/server';
import { MembershipStatus } from '@prisma/client';
import { logger } from '../logger';
import {
  assertClassInScope,
  assertDependentInScope,
  assertHasCapability,
  resolvePortalScope,
} from './portalScope';
import { resolveGuardianHouseholdIds } from '../auth/helpers';

function isCoordinatorOrAbove(role: string | null): boolean {
  if (!role) return false;
  return ['SUPER_ADMIN', 'DIOCESE_ADMIN', 'PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR', 'PERSONAL_OWNER'].includes(role);
}

function isCatechistOrAbove(role: string): boolean {
  return isCoordinatorOrAbove(role) || ['LEAD_CATECHIST', 'ASSISTANT_CATECHIST'].includes(role);
}

async function getUserRole(context: any): Promise<string> {
  if (context.user?.isAdmin) return 'SUPER_ADMIN';
  const m = await context.entities.Membership.findFirst({
    where: { userId: context.user.id, status: MembershipStatus.ACTIVE },
  });
  return m?.role || '';
}

/** Verifica se o usuário pertence à turma (por parish ou como catequista) */
async function assertUserBelongsToClass(context: any, classId: string): Promise<void> {
  if (context.user?.isAdmin) return;

  const classData = await context.entities.CatechesisClass.findUnique({
    where: { id: classId },
    select: { parishId: true, catechists: { select: { userId: true } } },
  });

  if (!classData) throw new HttpError(404, 'Turma não encontrada.');

  // Verificar membership na paróquia da turma
  const membership = await context.entities.Membership.findFirst({
    where: { userId: context.user.id, parishId: classData.parishId, status: MembershipStatus.ACTIVE },
  });

  if (!membership) {
    // Allow personal workspace owner
    const isPersonalOwner = await context.entities.Parish.findFirst({
      where: { id: classData.parishId, ownerId: context.user.id, type: 'PERSONAL' },
      select: { id: true },
    });
    if (isPersonalOwner) return; // Personal owner has full access
    throw new HttpError(403, 'Você não pertence a esta paróquia.');
  }

  // Coordenadores: acesso a qualquer turma da paróquia
  if (isCoordinatorOrAbove(membership.role)) return;

  // Catequistas: verificar se pertencem à turma
  if (isCatechistOrAbove(membership.role)) {
    const isClassCatechist = classData.catechists.some((cc: any) => cc.userId === context.user.id);
    if (!isClassCatechist) throw new HttpError(403, 'Você não é catequista desta turma.');
    return;
  }

  // Family roles: portal scope only (ENROLLED allowedClassIds). Fail closed when resolved & denied.
  if (membership.role === 'GUARDIAN' || membership.role === 'CATECHUMEN') {
    const portalScope = await resolvePortalScope(context, {
      surface: 'PORTAL',
      parishId: classData.parishId,
      preferRole: membership.role === 'GUARDIAN' ? 'GUARDIAN' : 'CATECHUMEN',
    });
    if (portalScope.mode === 'PORTAL') {
      const profileResolved =
        membership.role === 'GUARDIAN'
          ? Boolean(portalScope.guardianProfileId || portalScope.householdId)
          : Boolean(portalScope.catechumenProfileId);

      if (profileResolved) {
        // Scope resolved: allow only ENROLLED classes in scope — never widen via legacy
        assertHasCapability(portalScope, 'READ_MEETING');
        assertClassInScope(portalScope, classId);
        return;
      }

      // Profile not linked yet: legacy ENROLLED-only fallback (no non-ENROLLED reopen)
      if (membership.role === 'GUARDIAN') {
        const householdIds = await resolveGuardianHouseholdIds(context, context.user.id, {
          parishId: membership.parishId || null,
        });
        if (householdIds.length > 0) {
          const enrollment = await context.entities.ClassEnrollment.findFirst({
            where: {
              classId,
              status: 'ENROLLED',
              catechumenProfile: { householdId: { in: householdIds } },
            },
          });
          if (enrollment) return;
        }
        throw new HttpError(403, 'Seus dependentes não estão matriculados nesta turma.');
      }
      const enrollment = await context.entities.ClassEnrollment.findFirst({
        where: {
          classId,
          status: 'ENROLLED',
          catechumenProfile: { userId: context.user.id },
        },
      });
      if (enrollment) return;
      throw new HttpError(403, 'Você não está matriculado nesta turma.');
    }
    throw new HttpError(403, 'Você não tem acesso a esta turma.');
  }

  throw new HttpError(403, 'Você não tem acesso a esta turma.');
}

/** Exported for unit tests of family class ACL (fail-closed portal scope). */
export const __test__ = {
  assertUserBelongsToClass,
};

export const listMeetings = async (args: { classId: string }, context: any) => {
  if (!context.user) throw new HttpError(401);
  await assertUserBelongsToClass(context, args.classId);

  return context.entities.Meeting.findMany({
    where: { classId: args.classId },
    orderBy: { date: 'desc' },
    include: {
      content: { select: { id: true, title: true } },
      _count: { select: { attendance: true } },
    },
  });
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

export const getMeetingAttendance = async (args: { meetingId: string }, context: any) => {
  if (!context.user) throw new HttpError(401);

  // Verificar acesso ao meeting através da turma
  const meeting = await context.entities.Meeting.findUnique({
    where: { id: args.meetingId },
    select: { classId: true },
  });
  if (!meeting) throw new HttpError(404, 'Encontro não encontrado.');
  await assertUserBelongsToClass(context, meeting.classId);

  return context.entities.AttendanceRecord.findMany({
    where: { meetingId: args.meetingId },
    include: {
      catechumenProfile: { select: { id: true, firstName: true, lastName: true, photoUrl: true } },
    },
  });
};

export const getClassAttendanceMatrix = async (args: { classId: string }, context: any) => {
  if (!context.user) throw new HttpError(401);
  const role = await getUserRole(context);
  if (!isCatechistOrAbove(role)) {
    throw new HttpError(403, 'Apenas catequistas e coordenadores podem ver a matriz de presença.');
  }
  await assertUserBelongsToClass(context, args.classId);

  return context.entities.Meeting.findMany({
    where: { classId: args.classId },
    orderBy: { date: 'desc' },
    include: {
      attendance: {
        include: {
          catechumenProfile: { select: { id: true, firstName: true, lastName: true, photoUrl: true } },
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
  args: { classId: string; meetingId?: string },
  context: any,
): Promise<any> => {
  if (!context.user) throw new HttpError(401);
  const role = await getUserRole(context);
  if (!isCatechistOrAbove(role)) {
    throw new HttpError(403, 'Apenas catequistas e coordenadores podem ver a folha de chamada.');
  }
  if (!args.classId) throw new HttpError(400, 'classId é obrigatório.');

  await assertUserBelongsToClass(context, args.classId);

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
    const portalScope = await resolvePortalScope(context, {
      surface: 'PORTAL',
      preferRole: 'GUARDIAN',
    });
    assertHasCapability(portalScope, 'JUSTIFY_ABSENCE');
    assertDependentInScope(portalScope, attendance.catechumenProfileId);
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

  if (!context.user.isAdmin) {
    const portalScope = await resolvePortalScope(context, {
      surface: 'PORTAL',
      preferRole: 'GUARDIAN',
    });
    assertHasCapability(portalScope, 'JUSTIFY_ABSENCE');
    assertDependentInScope(portalScope, args.catechumenProfileId);
    assertClassInScope(portalScope, meeting.classId);
  } else {
    await assertUserBelongsToClass(context, meeting.classId);
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

export const getMeeting = async (args: { id: string }, context: any): Promise<any> => {
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

  // Family: assertUserBelongsToClass already enforces allowedClassIds + READ_MEETING
  await assertUserBelongsToClass(context, meeting.classId);

  const role = await getUserRole(context);
  const isStaff = isCatechistOrAbove(role);
  const isAdmin = Boolean(context.user.isAdmin);

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

    const householdIds = await resolveGuardianHouseholdIds(context, context.user.id, {
      parishId: meeting.class?.parishId || meeting.parishId || null,
    });

    if (householdIds.length > 0) {
      const dependents = await context.entities.CatechumenProfile.findMany({
        where: {
          householdId: { in: householdIds },
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
