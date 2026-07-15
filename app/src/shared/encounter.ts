/**
 * Encounter-centered mobile home — shared types and pure selection helpers.
 * Server uses these for getEncounterFocus; client for unit-tested UI rules.
 */

export type FocusKind = 'in_progress' | 'today' | 'upcoming' | 'recent' | 'none';

export type PrimaryCtaAction =
  | 'PREPARE'
  | 'START'
  | 'CONTINUE_ATTENDANCE'
  | 'COMPLETE'
  | 'VIEW'
  | 'JUSTIFY'
  | 'NONE';

export type EncounterFocusArgs = {
  workspaceId?: string;
  dependentId?: string;
};

export type MeetingLite = {
  id: string;
  title?: string | null;
  theme?: string | null;
  date: Date | string;
  status: string;
  kind?: string;
  contentId?: string | null;
  classId?: string;
  class?: { id: string; name: string };
};

export type EncounterFocus = {
  meeting: null | {
    id: string;
    title: string | null;
    theme: string | null;
    date: string | Date;
    status: string;
    kind: string;
    class: { id: string; name: string };
    locationHint: string | null;
  };
  focusKind: FocusKind;
  preparation?: {
    hasContent: boolean;
    contentId: string | null;
    contentTitle: string | null;
  };
  attendanceSummary?: {
    registered: number;
    totalActive: number;
    myStatus?: string | null;
  };
  dependents?: Array<{ id: string; firstName: string; lastName: string }>;
  dependent?: { id: string; firstName: string; lastName: string } | null;
  primaryCta: {
    action: PrimaryCtaAction;
    href: string;
    labelKey: string;
  };
  secondaryActions: Array<{ id: string; labelKey: string; href: string }>;
  materialsReleased?: Array<{ id: string; title: string }>;
  notices: Array<{ id: string; textKey?: string; text?: string }>;
  fetchedAt: string;
};

export function startOfDay(now: Date): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(now: Date): Date {
  const d = new Date(now);
  d.setHours(23, 59, 59, 999);
  return d;
}

function asDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

/**
 * Pick the relevant meeting for home focus.
 * Priority: IN_PROGRESS → today → next upcoming → most recent past.
 */
export function pickFocusMeeting<T extends MeetingLite>(
  meetings: T[],
  now: Date = new Date(),
): { meeting: T; focusKind: Exclude<FocusKind, 'none'> } | null {
  const active = meetings.filter((m) => m.status !== 'CANCELLED');
  if (!active.length) return null;

  const byDateAsc = (a: T, b: T) => +asDate(a.date) - +asDate(b.date);
  const byDateDesc = (a: T, b: T) => +asDate(b.date) - +asDate(a.date);

  const inProgress = active.filter((m) => m.status === 'IN_PROGRESS').sort(byDateAsc);
  if (inProgress[0]) return { meeting: inProgress[0], focusKind: 'in_progress' };

  const start = startOfDay(now);
  const end = endOfDay(now);

  const today = active
    .filter((m) => {
      const d = asDate(m.date);
      return d >= start && d <= end;
    })
    .sort(byDateAsc);
  if (today[0]) return { meeting: today[0], focusKind: 'today' };

  const upcoming = active.filter((m) => asDate(m.date) > end).sort(byDateAsc);
  if (upcoming[0]) return { meeting: upcoming[0], focusKind: 'upcoming' };

  const recent = active.filter((m) => asDate(m.date) < start).sort(byDateDesc);
  if (recent[0]) return { meeting: recent[0], focusKind: 'recent' };

  return null;
}

export type BuildCtaInput = {
  role: 'staff' | 'guardian' | 'catechumen' | 'other';
  focusKind: FocusKind;
  meeting: null | {
    id: string;
    status: string;
    classId: string;
    hasContent: boolean;
  };
  attendance?: { registered: number; totalActive: number; myStatus?: string | null };
  dependentId?: string | null;
};

/**
 * Map role + meeting state → primary CTA (decision table from design).
 */
export function buildPrimaryCta(input: BuildCtaInput): EncounterFocus['primaryCta'] {
  const { role, focusKind, meeting, attendance, dependentId } = input;

  if (!meeting) {
    return {
      action: 'NONE',
      href: role === 'staff' ? '/app/classes' : '/app/calendar',
      labelKey: 'encounter.cta.none_calendar',
    };
  }

  const detail = `/app/meetings/${meeting.id}`;
  const detailDep = dependentId
    ? `${detail}?dependentId=${encodeURIComponent(dependentId)}`
    : detail;
  const justifyHref = dependentId
    ? `${detail}?dependentId=${encodeURIComponent(dependentId)}&action=justify`
    : `${detail}?action=justify`;
  const attendanceHref = `/app/classes/${meeting.classId}/attendance?meetingId=${meeting.id}`;

  if (role === 'catechumen') {
    return { action: 'VIEW', href: detail, labelKey: 'encounter.cta.view' };
  }

  if (role === 'guardian') {
    const st = attendance?.myStatus ?? null;
    const canJustify = !st || st === 'ABSENT' || st === 'LATE' || st === 'JUSTIFIED';
    if (
      canJustify &&
      (meeting.status === 'IN_PROGRESS' ||
        meeting.status === 'COMPLETED' ||
        focusKind === 'today' ||
        focusKind === 'recent')
    ) {
      return {
        action: 'JUSTIFY',
        href: justifyHref,
        labelKey: 'encounter.cta.justify',
      };
    }
    return { action: 'VIEW', href: detailDep, labelKey: 'encounter.cta.view' };
  }

  if (role === 'staff') {
    if (meeting.status === 'NOT_STARTED') {
      if (!meeting.hasContent) {
        return {
          action: 'PREPARE',
          href: detail,
          labelKey: 'encounter.cta.prepare',
        };
      }
      return {
        action: 'START',
        href: detail,
        labelKey: 'encounter.cta.start',
      };
    }
    if (meeting.status === 'IN_PROGRESS') {
      const reg = attendance?.registered ?? 0;
      const total = attendance?.totalActive ?? 0;
      if (total > 0 && reg >= total) {
        return {
          action: 'COMPLETE',
          href: detail,
          labelKey: 'encounter.cta.complete',
        };
      }
      return {
        action: 'CONTINUE_ATTENDANCE',
        href: attendanceHref,
        labelKey: 'encounter.cta.continue_attendance',
      };
    }
    if (meeting.status === 'COMPLETED' || focusKind === 'recent') {
      return { action: 'VIEW', href: detail, labelKey: 'encounter.cta.view' };
    }
  }

  return { action: 'VIEW', href: detail, labelKey: 'encounter.cta.view' };
}
