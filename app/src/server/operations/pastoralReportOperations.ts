import { HttpError } from 'wasp/server';
import { assertCanAccessClass, getUserParishRoles, isCoordinatorOrAboveRole } from '../auth/helpers';
import { requireWorkspaceAccess, resolveWorkspaceAccess } from './sharedScope';
import { buildDisplayName } from './conversationPolicies';
import {
  NOT_FILLED_STATUS,
  addStatus,
  ageFromBirthDate,
  computeAttendanceRate,
  emptyAttendanceCounts,
  isCountableMeeting,
  resolveMeetingStatus,
  riskLevelFromRate,
  type AttendanceRiskLevel,
} from '../../shared/attendanceMetrics';

/** Pastoral report window: meetings older than this are not loaded. */
const PASTORAL_REPORT_WINDOW_MONTHS = 24;
const PASTORAL_REPORT_MAX_MEETINGS = 300;

/** Sensitive signals (risk, streaks, notes) are limited to the team of the class's own workspace. */
async function canViewSensitiveCatechumenSignals(context: any, parishId: string): Promise<boolean> {
  if (context.user?.isAdmin) return true;
  const access = await resolveWorkspaceAccess(context, parishId, { required: false });
  return Boolean(access?.isCoordinatorOrAbove || access?.isCatechist);
}

async function getBirthdayScope(context: any): Promise<{ parishIds: string[]; classIds: string[] }> {
  if (context.user?.isAdmin) {
    return { parishIds: [], classIds: [] };
  }

  const parishRoles = await getUserParishRoles(context);
  const parishIds: string[] = [];
  const scopedClassIds: string[] = [];
  for (const r of parishRoles as { parishId: string; role: string }[]) {
    if (!isCoordinatorOrAboveRole(r.role)) continue;
    // Scoped community coordinators (vice) contribute their classes, not the parish
    const access = await resolveWorkspaceAccess(context, r.parishId, { required: false });
    if (access?.isScopedCoordinator && access.allowedClassIds !== 'ALL') {
      scopedClassIds.push(...access.allowedClassIds);
    } else {
      parishIds.push(r.parishId);
    }
  }

  const catechistAssignments = await context.entities.ClassCatechist.findMany({
    where: { userId: context.user.id },
    select: { classId: true, class: { select: { parishId: true } } },
  });
  const classIds: string[] = catechistAssignments.map((a: any) => a.classId);
  const assignedParishIds: string[] = catechistAssignments.map((a: any) => a.class?.parishId).filter(Boolean);

  return {
    parishIds: [...new Set([...parishIds, ...assignedParishIds])],
    classIds: [...new Set([...classIds, ...scopedClassIds])],
  };
}

export const getClassPastoralReport = async (args: { classId: string }, context: any) => {
  if (!context.user) throw new HttpError(401);
  if (!args.classId?.trim()) {
    throw new HttpError(400, 'classId é obrigatório.');
  }

  const { parishId } = await assertCanAccessClass(context, args.classId.trim());

  if (!context.user.isAdmin) {
    const access = await requireWorkspaceAccess(context, parishId);
    if (!access.isCoordinatorOrAbove && !access.isCatechist) {
      throw new HttpError(403, 'Apenas coordenadores e catequistas podem aceder ao relatório pastoral.');
    }
  }

  const cls = await context.entities.CatechesisClass.findUnique({
    where: { id: args.classId },
    select: {
      id: true, name: true,
      catechists: { select: { user: { select: { id: true, firstName: true, lastName: true, email: true } }, role: true } },
      enrollments: {
        select: {
          id: true, status: true, startedAt: true, endedAt: true, notes: true, origin: true,
          catechumenProfile: {
            select: { id: true, firstName: true, lastName: true, photoUrl: true, birthDate: true },
          },
        },
      },
    },
  });

  if (!cls) throw new HttpError(404, 'Turma não encontrada.');

  // Meetings: bounded window, flat rows (no nested attendance trees).
  const windowStart = new Date();
  windowStart.setMonth(windowStart.getMonth() - PASTORAL_REPORT_WINDOW_MONTHS);
  const meetingRows = await context.entities.Meeting.findMany({
    where: { classId: cls.id, date: { gte: windowStart }, status: { not: 'CANCELLED' } },
    orderBy: { date: 'desc' },
    take: PASTORAL_REPORT_MAX_MEETINGS,
    select: { id: true, date: true, status: true, title: true, theme: true, kind: true, sequenceNumber: true },
  });
  meetingRows.reverse();

  const attendanceRows: { meetingId: string; catechumenProfileId: string; status: string }[] =
    meetingRows.length > 0
      ? await context.entities.AttendanceRecord.findMany({
          where: { meetingId: { in: meetingRows.map((m: any) => m.id) } },
          select: { meetingId: true, catechumenProfileId: true, status: true },
        })
      : [];

  // meetingId -> (catechumenProfileId -> status), O(1) lookups in the loops below.
  const attendanceByMeeting = new Map<string, Map<string, string>>();
  for (const row of attendanceRows) {
    let perMeeting = attendanceByMeeting.get(row.meetingId);
    if (!perMeeting) {
      perMeeting = new Map();
      attendanceByMeeting.set(row.meetingId, perMeeting);
    }
    perMeeting.set(row.catechumenProfileId, row.status);
  }
  const statusCountsFor = (meetingId: string) => {
    const counts = { PRESENT: 0, ABSENT: 0, LATE: 0, JUSTIFIED: 0 } as Record<string, number>;
    for (const status of attendanceByMeeting.get(meetingId)?.values() ?? []) {
      counts[status] = (counts[status] ?? 0) + 1;
    }
    return counts;
  };
  const now = new Date();
  cls.meetings = meetingRows.filter((m: any) =>
    isCountableMeeting(m, { now, hasAttendance: attendanceByMeeting.has(m.id) }),
  );

  const activeEnrollments = cls.enrollments.filter((e: any) => e.status === 'ENROLLED');
  const allEnrollmentsWithProfile = cls.enrollments.filter((e: any) => e.catechumenProfile);

  const totalActiveCatechumens = activeEnrollments.length;
  const totalMeetings = cls.meetings.length;

  const catechistNames = cls.catechists
    .map((cc: any) => buildDisplayName(cc.user))
    .filter((name: string) => name && name !== 'Usuário');

  // UPCOMING BIRTHDAYS (next 30 days)
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const upcomingBirthdays = activeEnrollments
    .filter((e: any) => e.catechumenProfile?.birthDate)
    .map((e: any) => {
      const birth = new Date(e.catechumenProfile.birthDate);
      const nextBirthday = new Date(now.getFullYear(), birth.getMonth(), birth.getDate());
      if (nextBirthday < now) nextBirthday.setFullYear(now.getFullYear() + 1);
      const age = nextBirthday.getFullYear() - birth.getFullYear();
      return {
        catechumenId: e.catechumenProfile.id,
        name: `${e.catechumenProfile.firstName} ${e.catechumenProfile.lastName}`,
        age,
        nextBirthday: nextBirthday.toISOString(),
      };
    })
    .filter((b: any) => new Date(b.nextBirthday) <= thirtyDaysFromNow)
    .sort((a: any, b: any) => new Date(a.nextBirthday).getTime() - new Date(b.nextBirthday).getTime());

  // MEETINGS WITH ATTENDANCE for charts
  const meetingsWithAttendance = cls.meetings.map((m: any) => {
    const counts = statusCountsFor(m.id);
    const present = counts.PRESENT;
    const absent = counts.ABSENT;
    const late = counts.LATE;
    const justified = counts.JUSTIFIED;
    return {
      id: m.id,
      sequenceNumber: m.sequenceNumber,
      date: m.date.toISOString(),
      title: m.title,
      theme: m.theme,
      kind: m.kind,
      presentCount: present,
      absentCount: absent,
      lateCount: late,
      justifiedCount: justified,
      totalCatechumens: totalActiveCatechumens,
    };
  });

  // AVG ATTENDANCE
  const classCounts = emptyAttendanceCounts();
  for (const m of meetingsWithAttendance) {
    classCounts.present += m.presentCount;
    classCounts.late += m.lateCount;
    classCounts.justified += m.justifiedCount;
    classCounts.absent += m.absentCount;
  }
  const avgAttendance = computeAttendanceRate(classCounts);
  const unjustifiedAbsences = classCounts.absent;

  // STATUS DISTRIBUTION (for pie chart)
  const statusDistributionMap: Record<string, number> = {};
  for (const e of cls.enrollments) {
    const s = e.status;
    statusDistributionMap[s] = (statusDistributionMap[s] || 0) + 1;
  }
  const statusDistribution = Object.entries(statusDistributionMap).map(([status, count]) => ({ status, count }));

  // CATECHUMEN RANKING
  const catechumenRanking = allEnrollmentsWithProfile.map((e: any) => {
    const profile = e.catechumenProfile;
    if (!profile) return null;

    const startedAt = e.startedAt ? new Date(e.startedAt) : null;
    const endedAt = e.endedAt ? new Date(e.endedAt) : null;

    const validMeetings = cls.meetings.filter((m: any) => {
      const d = new Date(m.date);
      if (startedAt && d < startedAt) return false;
      if (endedAt && d > endedAt) return false;
      return true;
    });

    const counts = emptyAttendanceCounts();
    let consecutiveAbsences = 0;
    let maxConsecutive = 0;

    for (const m of validMeetings) {
      const perMeeting = attendanceByMeeting.get(m.id);
      const status = resolveMeetingStatus(perMeeting?.get(profile.id), Boolean(perMeeting?.size));
      if (status === NOT_FILLED_STATUS) continue;
      addStatus(counts, status);
      consecutiveAbsences = status === 'ABSENT' ? consecutiveAbsences + 1 : 0;
      if (consecutiveAbsences > maxConsecutive) maxConsecutive = consecutiveAbsences;
    }

    const { present, late, justified, absent } = counts;
    const totalValid = present + late + justified + absent;
    const rate = computeAttendanceRate(counts);
    const riskLevel: AttendanceRiskLevel = totalValid > 0 ? riskLevelFromRate(rate) : 'BAIXO';

    return {
      catechumenId: profile.id,
      name: `${profile.firstName} ${profile.lastName}`,
      photoUrl: profile.photoUrl,
      enrollmentStatus: e.status,
      startedAt: e.startedAt?.toISOString?.() || null,
      presentCount: present,
      lateCount: late,
      justifiedCount: justified,
      absentCount: absent,
      totalValidMeetings: totalValid,
      attendanceRate: rate,
      consecutiveAbsences: maxConsecutive,
      riskLevel,
    };
  }).filter(Boolean)
    .sort((a: any, b: any) => b.attendanceRate - a.attendanceRate);

  const atRiskCount = catechumenRanking.filter((r: any) => r.riskLevel === 'ALTO' && r.enrollmentStatus === 'ENROLLED').length;

  return {
    className: cls.name,
    catechistNames,
    totalActiveCatechumens,
    totalMeetings,
    avgAttendance,
    unjustifiedAbsences,
    atRiskCount,
    upcomingBirthdays,
    meetingsWithAttendance,
    statusDistribution,
    catechumenRanking,
  };
};

export const getCatechumenPastoralAnalysis = async (args: { catechumenId: string; classId: string }, context: any) => {
  if (!context.user) throw new HttpError(401);
  const { parishId } = await assertCanAccessClass(context, args.classId);
  void (context.entities.Membership as unknown); // Required by assertCanAccessClass
  void (context.entities.Parish as unknown); // Required by resolveWorkspaceAccess

  // Family portal can reach the class via a child's enrollment — still must
  // get 403 (never a 500 from a later missing-entity path), and must not read
  // classmates' pastoral analytics (name, birth date, attendance counts).
  if (!context.user.isAdmin) {
    const access = await requireWorkspaceAccess(context, parishId);
    if (!access.isCoordinatorOrAbove && !access.isCatechist) {
      throw new HttpError(
        403,
        'Apenas coordenadores e catequistas podem aceder à análise pastoral.',
      );
    }
  }

  const canSeeSensitiveSignals = await canViewSensitiveCatechumenSignals(context, parishId);

  const enrollment = await context.entities.ClassEnrollment.findFirst({
    where: {
      catechumenProfileId: args.catechumenId,
      classId: args.classId,
    },
    include: {
      class: {
        select: {
          id: true, name: true,
          catechists: { select: { user: { select: { id: true, firstName: true, lastName: true, email: true } }, role: true } },
          enrollments: {
            select: {
              id: true, status: true,
              catechumenProfileId: true,
            },
          },
        },
      },
      catechumenProfile: {
        select: {
          id: true, firstName: true, lastName: true, photoUrl: true, birthDate: true,
        },
      },
    },
  });

  if (!enrollment || !enrollment.catechumenProfile) {
    throw new HttpError(404, 'Matrícula não encontrada.');
  }

  const profile = enrollment.catechumenProfile;
  const cls = enrollment.class;
  const startedAt = enrollment.startedAt;
  const endedAt = enrollment.endedAt;

  const meetingRows = await context.entities.Meeting.findMany({
    where: {
      classId: cls.id,
      status: { not: 'CANCELLED' },
      ...(startedAt || endedAt
        ? {
            date: {
              ...(startedAt ? { gte: new Date(startedAt) } : {}),
              ...(endedAt ? { lte: new Date(endedAt) } : {}),
            },
          }
        : {}),
    },
    orderBy: { date: 'asc' },
    select: { id: true, date: true, status: true, title: true, theme: true, kind: true },
  });

  const attendanceRows: { meetingId: string; catechumenProfileId: string; status: string; note: string | null }[] =
    meetingRows.length > 0
      ? await context.entities.AttendanceRecord.findMany({
          where: { meetingId: { in: meetingRows.map((m: any) => m.id) } },
          select: { meetingId: true, catechumenProfileId: true, status: true, note: true },
        })
      : [];
  const attendanceByMeeting = new Map<string, Map<string, { status: string; note: string | null }>>();
  for (const row of attendanceRows) {
    let perMeeting = attendanceByMeeting.get(row.meetingId);
    if (!perMeeting) {
      perMeeting = new Map();
      attendanceByMeeting.set(row.meetingId, perMeeting);
    }
    perMeeting.set(row.catechumenProfileId, { status: row.status, note: row.note });
  }

  const now = new Date();
  const validMeetings = meetingRows.filter((m: any) =>
    isCountableMeeting(m, { now, hasAttendance: attendanceByMeeting.has(m.id) }),
  );

  const catechists = cls.catechists
    .map((cc: any) => buildDisplayName(cc.user))
    .filter((name: string) => name && name !== 'Usuário');
  const activeEnrollments = cls.enrollments.filter((e: any) => e.status === 'ENROLLED');

  const counts = emptyAttendanceCounts();
  let consecutiveAbsences = 0;
  let maxConsecutive = 0;

  const meetingTimeline: any[] = [];
  const attendedThemes: any[] = [];
  const missedThemes: any[] = [];
  const monthlyPresenceMap: Record<string, any> = {};

  for (const m of validMeetings) {
    const perMeeting = attendanceByMeeting.get(m.id);
    const record = perMeeting?.get(args.catechumenId);
    const status = resolveMeetingStatus(record?.status, Boolean(perMeeting?.size));
    const d = new Date(m.date);
    const monthKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;

    if (!monthlyPresenceMap[monthKey]) {
      monthlyPresenceMap[monthKey] = {
        month: monthKey,
        year: d.getUTCFullYear(),
        present: 0, absent: 0, late: 0, justified: 0,
        totalMeetings: 0,
        notFilled: 0,
      };
    }
    const monthRow = monthlyPresenceMap[monthKey];

    meetingTimeline.push({
      id: m.id,
      date: m.date.toISOString(),
      title: m.title,
      theme: m.theme,
      kind: m.kind,
      status,
      note: record?.note || null,
    });

    if (status === NOT_FILLED_STATUS) {
      monthRow.notFilled++;
      continue;
    }

    monthRow.totalMeetings++;
    addStatus(counts, status);
    addStatus(monthRow, status);
    consecutiveAbsences = status === 'ABSENT' ? consecutiveAbsences + 1 : 0;
    if (consecutiveAbsences > maxConsecutive) maxConsecutive = consecutiveAbsences;

    if ((status === 'PRESENT' || status === 'LATE' || status === 'JUSTIFIED') && (m.theme || m.title)) {
      attendedThemes.push({
        date: m.date.toISOString(),
        theme: m.theme || null,
        title: m.title || null,
        status,
      });
    }

    if (status === 'ABSENT' && (m.theme || m.title)) {
      missedThemes.push({
        date: m.date.toISOString(),
        theme: m.theme || null,
        title: m.title || null,
      });
    }
  }

  const { present: presentCount, absent: absentCount, late: lateCount, justified: justifiedCount } = counts;
  const totalValidMeetings = presentCount + absentCount + lateCount + justifiedCount;
  const overallFrequency = computeAttendanceRate(counts);
  const riskLevel: AttendanceRiskLevel = totalValidMeetings > 0 ? riskLevelFromRate(overallFrequency) : 'BAIXO';

  // Ranking among the active roster, every peer measured over the same filled meetings.
  const filledMeetings = validMeetings.filter((m: any) => attendanceByMeeting.has(m.id));
  const peers = activeEnrollments.filter(
    (e: any) => e.catechumenProfileId && e.catechumenProfileId !== args.catechumenId,
  );
  let rankingPosition = 1;
  for (const e of peers) {
    const peerCounts = emptyAttendanceCounts();
    for (const m of filledMeetings) {
      addStatus(peerCounts, attendanceByMeeting.get(m.id)?.get(e.catechumenProfileId)?.status ?? 'ABSENT');
    }
    if (computeAttendanceRate(peerCounts) > overallFrequency) rankingPosition++;
  }
  const rosterSize = peers.length + 1;

  const alerts: { type: string }[] = [];
  if (canSeeSensitiveSignals) {
    if (riskLevel === 'ALTO' && totalValidMeetings > 2) alerts.push({ type: 'risk_high' });
    if (maxConsecutive >= 3) alerts.push({ type: 'consecutive_absences' });
    if (enrollment.status === 'DROPPED') alerts.push({ type: 'dropped' });
  }

  const monthlyPresence = Object.values(monthlyPresenceMap).sort((a: any, b: any) => a.month.localeCompare(b.month));
  const visibleMeetingTimeline = canSeeSensitiveSignals ? meetingTimeline : [];
  const visibleAttendedThemes = canSeeSensitiveSignals ? attendedThemes : [];
  const visibleMissedThemes = canSeeSensitiveSignals ? missedThemes : [];
  const visibleRankingPosition = canSeeSensitiveSignals ? rankingPosition : null;
  const visibleRiskLevel = canSeeSensitiveSignals ? riskLevel : null;
  const visibleConsecutiveAbsences = canSeeSensitiveSignals ? maxConsecutive : null;
  const visibleTotalCatechumens = canSeeSensitiveSignals ? rosterSize : null;

  return {
    canSeeSensitiveSignals,
    catechumen: {
      id: profile.id,
      name: `${profile.firstName} ${profile.lastName}`,
      photoUrl: profile.photoUrl,
      birthDate: profile.birthDate?.toISOString?.() || null,
      age: ageFromBirthDate(profile.birthDate, now),
    },
    class: {
      id: cls.id,
      name: cls.name,
      catechists,
    },
    enrollment: {
      status: enrollment.status,
      startedAt: enrollment.startedAt?.toISOString?.() || null,
      endedAt: enrollment.endedAt?.toISOString?.() || null,
      origin: enrollment.origin || null,
      notes: canSeeSensitiveSignals ? (enrollment.notes || null) : null,
    },
    overallFrequency,
    presentCount, absentCount, lateCount, justifiedCount,
    consecutiveAbsences: visibleConsecutiveAbsences,
    rankingPosition: visibleRankingPosition,
    totalCatechumensInClass: visibleTotalCatechumens,
    totalValidMeetings,
    monthlyPresence,
    statusDistribution: { present: presentCount, absent: absentCount, justified: justifiedCount, late: lateCount },
    meetingTimeline: visibleMeetingTimeline,
    attendedThemes: visibleAttendedThemes,
    missedThemes: visibleMissedThemes,
    alerts,
    riskLevel: visibleRiskLevel,
  };
};

export const listUpcomingBirthdays = async (args: { classId?: string; days?: number }, context: any) => {
  if (!context.user) throw new HttpError(401);

  const days = args.days || 30;
  const now = new Date();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + days);

  if (args.classId) {
    const { parishId } = await assertCanAccessClass(context, args.classId);
    // Family portal can access the class via a child's enrollment, but must not
    // receive the full roster's birth dates — staff of that workspace only.
    if (!context.user.isAdmin) {
      const access = await requireWorkspaceAccess(context, parishId);
      if (!access.isCoordinatorOrAbove && !access.isCatechist) {
        throw new HttpError(
          403,
          'Apenas coordenadores e catequistas podem consultar aniversários da turma.',
        );
      }
    }
  }
  void (context.entities.Membership as unknown); // Required by assertCanAccessClass

  const whereClause: any = {
    catechumenProfile: { birthDate: { not: null } },
    status: 'ENROLLED',
  };

  if (args.classId) {
    whereClause.classId = args.classId;
  } else if (!context.user.isAdmin) {
    const scope = await getBirthdayScope(context);
    if (!scope.parishIds.length && !scope.classIds.length) {
      throw new HttpError(403, 'Sem permissão para consultar aniversários.');
    }

    whereClause.OR = [];
    if (scope.parishIds.length) {
      whereClause.OR.push({ class: { parishId: { in: scope.parishIds } } });
    }
    if (scope.classIds.length) {
      whereClause.OR.push({ classId: { in: scope.classIds } });
    }
  }

  const enrollments = await context.entities.ClassEnrollment.findMany({
    where: whereClause,
    select: {
      catechumenProfile: {
        select: { id: true, firstName: true, lastName: true, photoUrl: true, birthDate: true },
      },
      class: { select: { id: true, name: true } },
    },
  });

  const upcoming = enrollments
    .filter((e: any) => e.catechumenProfile?.birthDate)
    .map((e: any) => {
      const birth = new Date(e.catechumenProfile.birthDate);
      const nextBirthday = new Date(now.getFullYear(), birth.getMonth(), birth.getDate());
      if (nextBirthday < now) nextBirthday.setFullYear(now.getFullYear() + 1);
      const age = nextBirthday.getFullYear() - birth.getFullYear();
      return {
        catechumenId: e.catechumenProfile.id,
        name: `${e.catechumenProfile.firstName} ${e.catechumenProfile.lastName}`,
        photoUrl: e.catechumenProfile.photoUrl,
        birthDate: birth.toISOString(),
        age,
        nextBirthday: nextBirthday.toISOString(),
        className: e.class.name,
        classId: e.class.id,
      };
    })
    .filter((b: any) => new Date(b.nextBirthday) <= cutoff)
    .sort((a: any, b: any) => new Date(a.nextBirthday).getTime() - new Date(b.nextBirthday).getTime());

  const gifts = await context.entities.CatechumenBirthdayGift.findMany({
    where: {
      catechumenProfileId: { in: upcoming.map((b: any) => b.catechumenId) },
      year: now.getFullYear(),
    },
  });
  const giftMap = new Map(gifts.map((g: any) => [g.catechumenProfileId, g.delivered]));

  return upcoming.map((b: any) => ({
    ...b,
    giftDelivered: giftMap.get(b.catechumenId) || false,
  }));
};

export const toggleBirthdayGift = async (args: { catechumenId: string; year: number }, context: any) => {
  if (!context.user) throw new HttpError(401);

  if (!context.user.isAdmin) {
    const scope = await getBirthdayScope(context);
    const targetEnrollments = await context.entities.ClassEnrollment.findMany({
      where: {
        catechumenProfileId: args.catechumenId,
        status: 'ENROLLED',
      },
      select: {
        classId: true,
        class: { select: { parishId: true } },
      },
    });

    const targetClassIds = targetEnrollments.map((e: any) => e.classId);
    const targetParishIds = targetEnrollments.map((e: any) => e.class?.parishId).filter(Boolean);
    const allowed =
      scope.classIds.some((id) => targetClassIds.includes(id)) ||
      scope.parishIds.some((id) => targetParishIds.includes(id));

    if (!allowed) {
      throw new HttpError(403, 'Sem permissão para alterar este presente.');
    }
  }

  const existing = await context.entities.CatechumenBirthdayGift.findUnique({
    where: { catechumenProfileId_year: { catechumenProfileId: args.catechumenId, year: args.year } },
  });

  if (existing) {
    return context.entities.CatechumenBirthdayGift.update({
      where: { id: existing.id },
      data: { delivered: !existing.delivered },
    });
  }

  return context.entities.CatechumenBirthdayGift.create({
    data: {
      catechumenProfileId: args.catechumenId,
      year: args.year,
      delivered: true,
    },
  });
};
