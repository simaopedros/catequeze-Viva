import type { AttendanceStatusKey } from '../theme';

export const ATTENDANCE_CYCLE: AttendanceStatusKey[] = ['PRESENT', 'LATE', 'ABSENT', 'EXCUSED'];

export type AttendanceParticipant = {
  id: string;
  name: string;
  subtitle?: string;
  serverStatus: AttendanceStatusKey | null;
  photoUrl?: string | null;
};

export type AttendanceSummaryStats = {
  total: number;
  present: number;
  absent: number;
  justified: number;
};

export function toApiAttendanceStatus(status: AttendanceStatusKey): string {
  return status === 'EXCUSED' ? 'JUSTIFIED' : status;
}

export function fromApiAttendanceStatus(raw?: string | null): AttendanceStatusKey | null {
  if (!raw) return null;
  const key = raw.toUpperCase();
  if (key === 'JUSTIFIED') return 'EXCUSED';
  if (key === 'PRESENT' || key === 'ABSENT' || key === 'LATE') return key;
  return null;
}

export function cycleAttendanceStatus(current: AttendanceStatusKey | null): AttendanceStatusKey {
  const value = current ?? 'PRESENT';
  const index = ATTENDANCE_CYCLE.indexOf(value);
  const next = index < 0 ? 0 : (index + 1) % ATTENDANCE_CYCLE.length;
  return ATTENDANCE_CYCLE[next];
}

export function participantDisplayName(row: {
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  name?: string | null;
}): string {
  if (row.displayName?.trim()) return row.displayName.trim();
  if (row.name?.trim()) return row.name.trim();
  const full = [row.firstName, row.lastName].filter(Boolean).join(' ').trim();
  return full || 'Catequizando';
}

export function mapAttendanceSheet(sheet: any, classSubtitle?: string): {
  meetingId: string;
  className: string;
  scheduleLabel: string;
  participants: AttendanceParticipant[];
  summary: AttendanceSummaryStats;
} | null {
  if (!sheet?.meeting?.id) return null;

  const participants = (sheet.participants || []).map((row: any) => {
    const id = row.catechumenProfileId || row.id;
    return {
      id: String(id),
      name: participantDisplayName(row),
      subtitle: classSubtitle,
      serverStatus: fromApiAttendanceStatus(row.status),
      photoUrl: row.photoUrl ?? null,
    };
  });

  const summaryRaw = sheet.summary || {};
  return {
    meetingId: sheet.meeting.id,
    className: sheet.meeting.class?.name || 'Turma',
    scheduleLabel: '',
    participants,
    summary: {
      total: summaryRaw.total ?? participants.length,
      present: summaryRaw.present ?? 0,
      absent: summaryRaw.absent ?? 0,
      justified: summaryRaw.justified ?? 0,
    },
  };
}

export function computeSummaryFromLocal(
  participants: AttendanceParticipant[],
  localStatus: Record<string, AttendanceStatusKey | null | undefined>,
): AttendanceSummaryStats {
  let present = 0;
  let absent = 0;
  let justified = 0;

  for (const p of participants) {
    const status = localStatus[p.id] ?? p.serverStatus;
    if (status === 'PRESENT' || status === 'LATE') present += 1;
    else if (status === 'ABSENT') absent += 1;
    else if (status === 'EXCUSED') justified += 1;
  }

  return {
    total: participants.length,
    present,
    absent,
    justified,
  };
}

export function filterParticipantsByQuery(
  participants: AttendanceParticipant[],
  query: string,
): AttendanceParticipant[] {
  const q = query.trim().toLowerCase();
  if (!q) return participants;
  return participants.filter((p) => p.name.toLowerCase().includes(q));
}

export function collectAttendanceChanges(
  participants: AttendanceParticipant[],
  localStatus: Record<string, AttendanceStatusKey | null | undefined>,
): Array<{ catechumenProfileId: string; status: string }> {
  const changes: Array<{ catechumenProfileId: string; status: string }> = [];
  for (const p of participants) {
    const next = localStatus[p.id];
    if (next == null) continue;
    const prev = p.serverStatus;
    if (next === prev) continue;
    changes.push({
      catechumenProfileId: p.id,
      status: toApiAttendanceStatus(next),
    });
  }
  return changes;
}
