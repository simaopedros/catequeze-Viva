import { HttpError } from 'wasp/server';
import { assertCanAccessClass, getUserParishRoles, isCatechistOrAboveRole, isCoordinatorOrAboveRole } from '../auth/helpers';

async function canViewSensitiveCatechumenSignals(context: any): Promise<boolean> {
  if (context.user?.isAdmin) return true;
  const parishRoles = await getUserParishRoles(context);
  return parishRoles.some((r: any) => isCatechistOrAboveRole(r.role));
}

async function getBirthdayScope(context: any): Promise<{ parishIds: string[]; classIds: string[] }> {
  if (context.user?.isAdmin) {
    return { parishIds: [], classIds: [] };
  }

  const parishRoles = await getUserParishRoles(context);
  const parishIds = parishRoles
    .filter((r: any) => isCoordinatorOrAboveRole(r.role))
    .map((r: any) => r.parishId);

  const catechistAssignments = await context.entities.ClassCatechist.findMany({
    where: { userId: context.user.id },
    select: { classId: true, class: { select: { parishId: true } } },
  });
  const classIds: string[] = catechistAssignments.map((a: any) => a.classId);
  const assignedParishIds: string[] = catechistAssignments.map((a: any) => a.class?.parishId).filter(Boolean);

  return {
    parishIds: [...new Set([...parishIds, ...assignedParishIds])],
    classIds: [...new Set(classIds)],
  };
}

export const getClassPastoralReport = async (args: { classId: string }, context: any) => {
  if (!context.user) throw new HttpError(401);

  const parishRoles = await getUserParishRoles(context);
  const roles = parishRoles.map((r: any) => r.role);
  const isAdmin = context.user.isAdmin;

  if (!isAdmin && !roles.some((r: string) => isCoordinatorOrAboveRole(r))) {
    throw new HttpError(403, 'Apenas coordenadores e catequistas podem aceder ao relatório pastoral.');
  }

  const cls = await context.entities.CatechesisClass.findUnique({
    where: { id: args.classId },
    select: {
      id: true, name: true,
      catechists: { select: { user: { select: { id: true, firstName: true, lastName: true } }, role: true } },
      enrollments: {
        select: {
          id: true, status: true, startedAt: true, endedAt: true, notes: true, origin: true,
          catechumenProfile: {
            select: { id: true, firstName: true, lastName: true, photoUrl: true, birthDate: true },
          },
        },
      },
      meetings: {
        orderBy: { date: 'asc' },
        select: {
          id: true, date: true, title: true, theme: true, kind: true, sequenceNumber: true,
          attendance: {
            select: { catechumenProfileId: true, status: true },
          },
        },
      },
    },
  });

  if (!cls) throw new HttpError(404, 'Turma não encontrada.');

  const activeEnrollments = cls.enrollments.filter((e: any) => e.status === 'ENROLLED');
  const allEnrollmentsWithProfile = cls.enrollments.filter((e: any) => e.catechumenProfile);

  const totalActiveCatechumens = activeEnrollments.length;
  const totalMeetings = cls.meetings.length;

  const catechistNames = cls.catechists.map((cc: any) => `${cc.user.firstName} ${cc.user.lastName}`);

  // UPCOMING BIRTHDAYS (next 30 days)
  const now = new Date();
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
        birthDate: birth.toISOString(),
        age,
        nextBirthday: nextBirthday.toISOString(),
      };
    })
    .filter((b: any) => new Date(b.nextBirthday) <= thirtyDaysFromNow)
    .sort((a: any, b: any) => new Date(a.nextBirthday).getTime() - new Date(b.nextBirthday).getTime());

  // MEETINGS WITH ATTENDANCE for charts
  const meetingsWithAttendance = cls.meetings.map((m: any) => {
    const present = m.attendance.filter((a: any) => a.status === 'PRESENT').length;
    const absent = m.attendance.filter((a: any) => a.status === 'ABSENT').length;
    const late = m.attendance.filter((a: any) => a.status === 'LATE').length;
    const justified = m.attendance.filter((a: any) => a.status === 'JUSTIFIED').length;
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
  let totalPresent = 0;
  let totalRecords = 0;
  let totalAbsent = 0;

  for (const m of meetingsWithAttendance) {
    totalPresent += m.presentCount + m.justifiedCount;
    totalAbsent += m.absentCount;
    totalRecords += m.presentCount + m.absentCount + m.lateCount + m.justifiedCount;
  }
  const avgAttendance = totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 0;
  const unjustifiedAbsences = totalAbsent;

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

    let present = 0;
    let absent = 0;
    let late = 0;
    let justified = 0;
    let consecutiveAbsences = 0;
    let maxConsecutive = 0;

    for (const m of validMeetings) {
      const record = m.attendance.find((a: any) => a.catechumenProfileId === profile.id);
      if (!record) {
        absent++;
        consecutiveAbsences++;
      } else {
        switch (record.status) {
          case 'PRESENT': present++; consecutiveAbsences = 0; break;
          case 'LATE': late++; consecutiveAbsences = 0; break;
          case 'JUSTIFIED': justified++; consecutiveAbsences = 0; break;
          case 'ABSENT': absent++; consecutiveAbsences++; break;
        }
      }
      if (consecutiveAbsences > maxConsecutive) maxConsecutive = consecutiveAbsences;
    }

    const totalValid = validMeetings.length;
    const pastoralPresent = present + late + justified;
    const rate = totalValid > 0 ? Math.round((pastoralPresent / totalValid) * 100) : 0;

    let riskLevel: 'ALTO' | 'MÉDIO' | 'BAIXO' = 'BAIXO';
    if (rate < 50) riskLevel = 'ALTO';
    else if (rate < 75) riskLevel = 'MÉDIO';

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
  await assertCanAccessClass(context, args.classId);
  void (context.entities.Membership as unknown); // Required by assertCanAccessClass
  void (context.entities.Parish as unknown); // Required by getUserParishRoles

  const canSeeSensitiveSignals = await canViewSensitiveCatechumenSignals(context);

  const enrollment = await context.entities.ClassEnrollment.findFirst({
    where: {
      catechumenProfileId: args.catechumenId,
      classId: args.classId,
    },
    include: {
      class: {
        select: {
          id: true, name: true,
          catechists: { select: { user: { select: { id: true, firstName: true, lastName: true } }, role: true } },
          meetings: {
            orderBy: { date: 'asc' },
            select: {
              id: true, date: true, title: true, theme: true, kind: true,
              attendance: {
                select: { id: true, catechumenProfileId: true, status: true, note: true },
              },
            },
          },
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
  const meetings = cls.meetings;

  const catechists = cls.catechists.map((cc: any) => `${cc.user.firstName} ${cc.user.lastName}`);
  const activeEnrollments = cls.enrollments.filter((e: any) => e.status === 'ENROLLED');
  const startedAt = enrollment.startedAt;
  const endedAt = enrollment.endedAt;

  const validMeetings = meetings.filter((m: any) => {
    const d = new Date(m.date);
    if (startedAt && d < new Date(startedAt)) return false;
    if (endedAt && d > new Date(endedAt)) return false;
    return true;
  });

  let presentCount = 0;
  let absentCount = 0;
  let lateCount = 0;
  let justifiedCount = 0;
  let consecutiveAbsences = 0;
  let maxConsecutive = 0;

  const meetingTimeline: any[] = [];
  const attendedThemes: any[] = [];
  const missedThemes: any[] = [];
  const monthlyPresenceMap: Record<string, any> = {};

  for (const m of validMeetings) {
    const record = m.attendance.find((a: any) => a.catechumenProfileId === args.catechumenId);
    const status = record?.status || 'ABSENT';
    const d = new Date(m.date);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    if (!monthlyPresenceMap[monthKey]) {
      monthlyPresenceMap[monthKey] = {
        month: monthKey,
        year: d.getFullYear(),
        present: 0, absent: 0, late: 0, justified: 0,
        totalMeetings: 0,
      };
    }
    monthlyPresenceMap[monthKey].totalMeetings++;

    switch (status) {
      case 'PRESENT':
        presentCount++; monthlyPresenceMap[monthKey].present++;
        consecutiveAbsences = 0;
        break;
      case 'LATE':
        lateCount++; monthlyPresenceMap[monthKey].late++;
        consecutiveAbsences = 0;
        break;
      case 'JUSTIFIED':
        justifiedCount++; monthlyPresenceMap[monthKey].justified++;
        consecutiveAbsences = 0;
        break;
      case 'ABSENT':
      default:
        absentCount++; monthlyPresenceMap[monthKey].absent++;
        consecutiveAbsences++;
        break;
    }
    if (consecutiveAbsences > maxConsecutive) maxConsecutive = consecutiveAbsences;

    meetingTimeline.push({
      id: m.id,
      date: m.date.toISOString(),
      title: m.title,
      theme: m.theme,
      kind: m.kind,
      status: record?.status || 'NOT_FILLED',
      note: record?.note || null,
    });

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

  const totalValidMeetings = validMeetings.length;
  const pastoralPresent = presentCount + lateCount + justifiedCount;
  const overallFrequency = totalValidMeetings > 0 ? Math.round((pastoralPresent / totalValidMeetings) * 100) : 0;

  let riskLevel: 'ALTO' | 'MÉDIO' | 'BAIXO' = 'BAIXO';
  if (overallFrequency < 50) riskLevel = 'ALTO';
  else if (overallFrequency < 75) riskLevel = 'MÉDIO';

  // Calculate ranking position
  const allEnrollments = cls.enrollments.filter((e: any) => e.catechumenProfileId);
  let rankingPosition = 1;
  for (const e of allEnrollments) {
    if (e.catechumenProfileId === args.catechumenId) continue;
    let ePresent = 0, eLate = 0, eJustified = 0;
    for (const m of validMeetings) {
      const rec = m.attendance.find((a: any) => a.catechumenProfileId === e.catechumenProfileId);
      if (rec) {
        if (rec.status === 'PRESENT') ePresent++;
        else if (rec.status === 'LATE') eLate++;
        else if (rec.status === 'JUSTIFIED') eJustified++;
      }
    }
    const ePastoral = ePresent + eLate + eJustified;
    const eRate = totalValidMeetings > 0 ? Math.round((ePastoral / totalValidMeetings) * 100) : 0;
    if (eRate > overallFrequency) rankingPosition++;
  }

  const alerts: any[] = [];
  if (canSeeSensitiveSignals) {
    if (riskLevel === 'ALTO') alerts.push({ type: 'risk_high', message: 'Jovem em risco alto de evasão' });
    if (maxConsecutive >= 3) alerts.push({ type: 'consecutive_absences', message: `${maxConsecutive} faltas consecutivas` });
    if (overallFrequency < 50 && totalValidMeetings > 2) alerts.push({ type: 'low_frequency', message: 'Frequência abaixo de 50%' });
    if (enrollment.status === 'DROPPED') alerts.push({ type: 'dropped', message: 'Jovem desistiu da turma' });
  }

  const monthlyPresence = Object.values(monthlyPresenceMap).sort((a: any, b: any) => a.month.localeCompare(b.month));
  const visibleMeetingTimeline = canSeeSensitiveSignals ? meetingTimeline : [];
  const visibleAttendedThemes = canSeeSensitiveSignals ? attendedThemes : [];
  const visibleMissedThemes = canSeeSensitiveSignals ? missedThemes : [];
  const visibleRankingPosition = canSeeSensitiveSignals ? rankingPosition : null;
  const visibleRiskLevel = canSeeSensitiveSignals ? riskLevel : null;
  const visibleConsecutiveAbsences = canSeeSensitiveSignals ? maxConsecutive : null;
  const visibleTotalCatechumens = canSeeSensitiveSignals ? activeEnrollments.length : null;

  return {
    canSeeSensitiveSignals,
    catechumen: {
      id: profile.id,
      name: `${profile.firstName} ${profile.lastName}`,
      photoUrl: profile.photoUrl,
      birthDate: profile.birthDate?.toISOString?.() || null,
      age: profile.birthDate ? new Date().getFullYear() - new Date(profile.birthDate).getFullYear() : null,
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
    await assertCanAccessClass(context, args.classId);
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
