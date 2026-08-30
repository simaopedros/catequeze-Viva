export const PASTORAL_PERIOD_ALL = "all" as const;

export type PastoralPeriod = typeof PASTORAL_PERIOD_ALL | string;

export type MonthlyPresenceRow = {
  month: string;
  year?: number;
  present: number;
  absent: number;
  late: number;
  justified: number;
  totalMeetings: number;
};

export type PastoralTimelineItem = {
  id?: string;
  date: string;
  title?: string | null;
  theme?: string | null;
  kind?: string;
  status: string;
  note?: string | null;
};

export type PastoralThemeItem = {
  date: string;
  theme?: string | null;
  title?: string | null;
  status?: string;
};

export type PastoralAlert = {
  type: string;
  message?: string;
};

export type PastoralAnalysisSlice = {
  overallFrequency: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  justifiedCount: number;
  consecutiveAbsences: number | null;
  rankingPosition: number | null;
  totalCatechumensInClass: number | null;
  totalValidMeetings: number;
  monthlyPresence: MonthlyPresenceRow[];
  meetingTimeline: PastoralTimelineItem[];
  attendedThemes: PastoralThemeItem[];
  missedThemes: PastoralThemeItem[];
  alerts: PastoralAlert[];
  riskLevel: string | null;
  canSeeSensitiveSignals?: boolean;
};

export type FilteredPastoralSlice = Omit<
  PastoralAnalysisSlice,
  "monthlyPresence" | "canSeeSensitiveSignals"
>;

export function monthKeyFromDate(value: string | Date): string {
  if (typeof value === "string" && /^\d{4}-\d{2}/.test(value)) {
    return value.slice(0, 7);
  }
  const date = typeof value === "string" ? new Date(value) : value;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0",
  )}`;
}

export function formatMonthLabel(monthKey: string, locale = "pt-BR"): string {
  const [year, month] = monthKey.split("-").map(Number);
  if (!year || !month) return monthKey;
  return new Date(year, month - 1, 1).toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
  });
}

export function resolveDefaultMonth(
  monthlyPresence: { month: string }[],
  now: Date = new Date(),
): PastoralPeriod {
  if (!monthlyPresence.length) return PASTORAL_PERIOD_ALL;
  const current = monthKeyFromDate(now);
  if (monthlyPresence.some((row) => row.month === current)) return current;
  return monthlyPresence[monthlyPresence.length - 1].month;
}

export function toLineChartRows(monthlyPresence: MonthlyPresenceRow[]) {
  return monthlyPresence.map((row) => {
    const pastoralPresent = row.present + row.late + row.justified;
    return {
      month: row.month,
      present: row.present,
      late: row.late,
      absent: row.absent + row.justified,
      frequency:
        row.totalMeetings > 0
          ? Math.round((pastoralPresent / row.totalMeetings) * 100)
          : 0,
    };
  });
}

function recountTimeline(items: PastoralTimelineItem[]) {
  let presentCount = 0;
  let absentCount = 0;
  let lateCount = 0;
  let justifiedCount = 0;
  let consecutive = 0;
  let maxConsecutive = 0;

  for (const item of items) {
    switch (item.status) {
      case "PRESENT":
        presentCount++;
        consecutive = 0;
        break;
      case "LATE":
        lateCount++;
        consecutive = 0;
        break;
      case "JUSTIFIED":
        justifiedCount++;
        consecutive = 0;
        break;
      case "ABSENT":
      default:
        absentCount++;
        consecutive++;
        break;
    }
    if (consecutive > maxConsecutive) maxConsecutive = consecutive;
  }

  const totalValidMeetings = items.length;
  const pastoralPresent = presentCount + lateCount + justifiedCount;
  const overallFrequency =
    totalValidMeetings > 0
      ? Math.round((pastoralPresent / totalValidMeetings) * 100)
      : 0;

  return {
    presentCount,
    absentCount,
    lateCount,
    justifiedCount,
    totalValidMeetings,
    overallFrequency,
    maxConsecutive,
  };
}

function alertsForSlice(
  canSeeSensitiveSignals: boolean,
  overallFrequency: number,
  totalValidMeetings: number,
  maxConsecutive: number,
  riskLevel: string | null,
): PastoralAlert[] {
  if (!canSeeSensitiveSignals) return [];
  const alerts: PastoralAlert[] = [];
  if (riskLevel === "ALTO") alerts.push({ type: "risk_high" });
  if (maxConsecutive >= 3) alerts.push({ type: "consecutive_absences" });
  if (overallFrequency < 50 && totalValidMeetings > 2) {
    alerts.push({ type: "low_frequency" });
  }
  return alerts;
}

export function filterPastoralByMonth(
  data: PastoralAnalysisSlice,
  period: PastoralPeriod,
): FilteredPastoralSlice {
  const canSeeSensitive = data.canSeeSensitiveSignals !== false;
  const hideSensitive = data.consecutiveAbsences == null && !canSeeSensitive;

  if (period === PASTORAL_PERIOD_ALL) {
    return {
      overallFrequency: data.overallFrequency,
      presentCount: data.presentCount,
      absentCount: data.absentCount,
      lateCount: data.lateCount,
      justifiedCount: data.justifiedCount,
      consecutiveAbsences: data.consecutiveAbsences,
      rankingPosition: data.rankingPosition,
      totalCatechumensInClass: data.totalCatechumensInClass,
      totalValidMeetings: data.totalValidMeetings,
      meetingTimeline: data.meetingTimeline,
      attendedThemes: data.attendedThemes,
      missedThemes: data.missedThemes,
      alerts: data.alerts,
      riskLevel: data.riskLevel,
    };
  }

  const meetingTimeline = data.meetingTimeline.filter(
    (item) => monthKeyFromDate(item.date) === period,
  );
  const attendedThemes = data.attendedThemes.filter(
    (item) => monthKeyFromDate(item.date) === period,
  );
  const missedThemes = data.missedThemes.filter(
    (item) => monthKeyFromDate(item.date) === period,
  );

  const recounted = recountTimeline(meetingTimeline);
  let riskLevel: string | null = null;
  if (canSeeSensitive && data.riskLevel != null) {
    if (recounted.overallFrequency < 50) riskLevel = "ALTO";
    else if (recounted.overallFrequency < 75) riskLevel = "MÉDIO";
    else riskLevel = "BAIXO";
  }

  return {
    overallFrequency: recounted.overallFrequency,
    presentCount: recounted.presentCount,
    absentCount: recounted.absentCount,
    lateCount: recounted.lateCount,
    justifiedCount: recounted.justifiedCount,
    consecutiveAbsences: hideSensitive ? null : recounted.maxConsecutive,
    rankingPosition: null,
    totalCatechumensInClass: data.totalCatechumensInClass,
    totalValidMeetings: recounted.totalValidMeetings,
    meetingTimeline,
    attendedThemes,
    missedThemes,
    alerts: alertsForSlice(
      canSeeSensitive,
      recounted.overallFrequency,
      recounted.totalValidMeetings,
      recounted.maxConsecutive,
      riskLevel,
    ),
    riskLevel,
  };
}
