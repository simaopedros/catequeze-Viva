/**
 * Attendance aggregates computed in SQL instead of loading meeting/attendance
 * trees into memory. Used by the reports, pastoral and institutional views.
 */
import { prisma } from 'wasp/server';
import { Prisma } from '@prisma/client';

export type ClassAttendanceAggregate = {
  classId: string;
  totalMeetings: number;
  lastMeetingDate: Date | null;
  totalAttendanceRecords: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  justifiedCount: number;
};

type RawRow = {
  classId: string;
  totalMeetings: bigint | number;
  lastMeetingDate: Date | null;
  totalAttendanceRecords: bigint | number;
  presentCount: bigint | number;
  absentCount: bigint | number;
  lateCount: bigint | number;
  justifiedCount: bigint | number;
};

const toNumber = (value: bigint | number | null | undefined): number => Number(value ?? 0);

/**
 * One row per class (classes without meetings are omitted — callers should
 * default to zeros). Optional date range restricts the meetings considered.
 */
export async function getClassAttendanceAggregates(
  classIds: string[],
  range?: { from?: Date; to?: Date },
): Promise<Map<string, ClassAttendanceAggregate>> {
  const result = new Map<string, ClassAttendanceAggregate>();
  if (classIds.length === 0) return result;

  const conditions: Prisma.Sql[] = [Prisma.sql`m."classId" IN (${Prisma.join(classIds)})`];
  if (range?.from) conditions.push(Prisma.sql`m."date" >= ${range.from}`);
  if (range?.to) conditions.push(Prisma.sql`m."date" <= ${range.to}`);

  const rows = await prisma.$queryRaw<RawRow[]>(Prisma.sql`
    SELECT
      m."classId"                                                     AS "classId",
      COUNT(DISTINCT m."id")                                          AS "totalMeetings",
      MAX(m."date")                                                   AS "lastMeetingDate",
      COUNT(a."id")                                                   AS "totalAttendanceRecords",
      COUNT(a."id") FILTER (WHERE a."status" = 'PRESENT')             AS "presentCount",
      COUNT(a."id") FILTER (WHERE a."status" = 'ABSENT')              AS "absentCount",
      COUNT(a."id") FILTER (WHERE a."status" = 'LATE')                AS "lateCount",
      COUNT(a."id") FILTER (WHERE a."status" = 'JUSTIFIED')           AS "justifiedCount"
    FROM "Meeting" m
    LEFT JOIN "AttendanceRecord" a ON a."meetingId" = m."id"
    WHERE ${Prisma.join(conditions, ' AND ')}
    GROUP BY m."classId"
  `);

  for (const row of rows) {
    result.set(row.classId, {
      classId: row.classId,
      totalMeetings: toNumber(row.totalMeetings),
      lastMeetingDate: row.lastMeetingDate ? new Date(row.lastMeetingDate) : null,
      totalAttendanceRecords: toNumber(row.totalAttendanceRecords),
      presentCount: toNumber(row.presentCount),
      absentCount: toNumber(row.absentCount),
      lateCount: toNumber(row.lateCount),
      justifiedCount: toNumber(row.justifiedCount),
    });
  }
  return result;
}

export function emptyAggregate(classId: string): ClassAttendanceAggregate {
  return {
    classId,
    totalMeetings: 0,
    lastMeetingDate: null,
    totalAttendanceRecords: 0,
    presentCount: 0,
    absentCount: 0,
    lateCount: 0,
    justifiedCount: 0,
  };
}

export function attendanceRate(agg: Pick<ClassAttendanceAggregate, 'presentCount' | 'totalAttendanceRecords'>): number {
  return agg.totalAttendanceRecords > 0
    ? Math.round((agg.presentCount / agg.totalAttendanceRecords) * 100)
    : 0;
}
