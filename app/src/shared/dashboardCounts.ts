/** Same source of truth as the turma page: ENROLLED count from the dashboard payload. */
export function classEnrollmentCount(cls: {
  enrollmentCount?: number | null;
  _count?: { enrollments?: number | null } | null;
}): number {
  return cls.enrollmentCount ?? cls._count?.enrollments ?? 0;
}

export function meetingAttendanceCount(meeting: {
  attendanceCount?: number | null;
  _count?: { attendance?: number | null } | null;
}): number {
  return meeting.attendanceCount ?? meeting._count?.attendance ?? 0;
}
