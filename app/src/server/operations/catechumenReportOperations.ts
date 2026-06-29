/**
 * Individual catechumen attendance report — percentage, missed classes, risk assessment.
 */
import { HttpError } from 'wasp/server';
import { assertCanAccessCatechumenProfile, getUserParishRoles, isCatechistOrAboveRole } from '../auth/helpers';
import { assertTwoFactorSessionVerified } from './twoFactorOperations';

export const getCatechumenAttendanceReport = async (args: { catechumenId: string }, context: any) => {
  if (!context.user) throw new HttpError(401);
  await assertTwoFactorSessionVerified(context);
  await assertCanAccessCatechumenProfile(context, args.catechumenId);

  const parishRoles = await getUserParishRoles(context);
  const canSeeSensitiveSignals = context.user?.isAdmin || parishRoles.some((r: any) => isCatechistOrAboveRole(r.role));

  const catechumenWithAttendance = await context.entities.CatechumenProfile.findUnique({
    where: { id: args.catechumenId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      enrollments: {
        where: { status: 'ENROLLED' },
        select: { class: { select: { id: true, name: true } } },
      },
      attendanceRecords: {
        include: { meeting: { select: { id: true, date: true, title: true, class: { select: { name: true } } } } },
      },
    },
  });
  if (!catechumenWithAttendance) return null;

  const catechumen = { id: catechumenWithAttendance.id, firstName: catechumenWithAttendance.firstName, lastName: catechumenWithAttendance.lastName };

  const allAttendance: any[] = [];
  let totalPresent = 0;
  let totalAbsent = 0;
  let totalLate = 0;
  let totalJustified = 0;

  for (const record of catechumenWithAttendance.attendanceRecords) {
    const meeting = record.meeting;
    allAttendance.push({
      meetingTitle: meeting?.title,
      meetingDate: meeting?.date,
      status: record.status,
      className: meeting?.class?.name || null,
    });
    if (record.status === 'PRESENT') totalPresent++;
    else if (record.status === 'ABSENT') totalAbsent++;
    else if (record.status === 'LATE') totalLate++;
    else if (record.status === 'JUSTIFIED') totalJustified++;
  }

  const total = totalPresent + totalAbsent + totalLate + totalJustified;
  const attendanceRate = total > 0 ? Math.round(((totalPresent + totalLate) / total) * 100) : 0;

  allAttendance.sort((a, b) => new Date(b.meetingDate).getTime() - new Date(a.meetingDate).getTime());

  let consecutiveAbsences = 0;
  let maxConsecutive = 0;
  for (const record of allAttendance) {
    if (record.status === 'ABSENT') {
      consecutiveAbsences++;
      if (consecutiveAbsences > maxConsecutive) maxConsecutive = consecutiveAbsences;
    } else {
      consecutiveAbsences = 0;
    }
  }

  return {
    catechumen,
    total,
    totalPresent,
    totalAbsent,
    totalLate,
    totalJustified,
    attendanceRate,
    maxConsecutiveAbsences: canSeeSensitiveSignals ? maxConsecutive : null,
    riskLevel: canSeeSensitiveSignals ? (attendanceRate < 50 ? 'ALTO' : attendanceRate < 75 ? 'MÉDIO' : 'BAIXO') : null,
    records: allAttendance.slice(0, 50),
  };
};
