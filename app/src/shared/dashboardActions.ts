/**
 * "Próxima melhor ação" do painel do catequista — helpers puros.
 * O servidor usa os cálculos de frequência/tendência em getDashboardStats;
 * o cliente usa buildNextActions/getCatechesisStatus para montar a central de ação.
 */

import type { EncounterFocus } from "./encounter";

/** Abaixo desta taxa (%) um catequizando conta como "frequência baixa". */
export const LOW_FREQUENCY_THRESHOLD = 60;
/** Mínimo de registros de presença para avaliar a frequência de alguém. */
export const LOW_FREQUENCY_MIN_RECORDS = 3;
/** Janela (dias) usada para frequência, tendência e presença por turma. */
export const INSIGHT_WINDOW_DAYS = 180;
/** Janela (dias) da tendência de presença: atual vs. anterior. */
export const TREND_WINDOW_DAYS = 30;
/** Aniversários dentro deste prazo viram uma ação informativa. */
export const BIRTHDAY_ACTION_WINDOW_DAYS = 7;
/** Aniversários listados no card "Próximos aniversários". */
export const BIRTHDAY_LIST_WINDOW_DAYS = 30;

const ATTENDED_STATUSES = new Set(["PRESENT", "LATE"]);

export type FrequencyRecord = {
  catechumenProfileId: string;
  status: string;
  classId?: string | null;
};

export type FrequencyStat = {
  catechumenProfileId: string;
  total: number;
  attended: number;
  rate: number;
  classIds: string[];
};

export function computeFrequencyStats(
  records: FrequencyRecord[],
): Map<string, FrequencyStat> {
  const map = new Map<string, FrequencyStat>();
  for (const r of records) {
    let stat = map.get(r.catechumenProfileId);
    if (!stat) {
      stat = {
        catechumenProfileId: r.catechumenProfileId,
        total: 0,
        attended: 0,
        rate: 0,
        classIds: [],
      };
      map.set(r.catechumenProfileId, stat);
    }
    stat.total += 1;
    if (ATTENDED_STATUSES.has(r.status)) stat.attended += 1;
    if (r.classId && !stat.classIds.includes(r.classId)) {
      stat.classIds.push(r.classId);
    }
  }
  for (const stat of map.values()) {
    stat.rate =
      stat.total > 0 ? Math.round((stat.attended / stat.total) * 100) : 0;
  }
  return map;
}

export function isLowFrequency(
  stat: Pick<FrequencyStat, "total" | "rate">,
): boolean {
  return (
    stat.total >= LOW_FREQUENCY_MIN_RECORDS &&
    stat.rate < LOW_FREQUENCY_THRESHOLD
  );
}

export type AttendanceTrend = {
  /** % de presença nos últimos TREND_WINDOW_DAYS dias */
  current: number;
  /** % de presença nos TREND_WINDOW_DAYS dias anteriores */
  previous: number;
  /** Diferença em pontos percentuais (current - previous) */
  deltaPct: number;
};

export function computeAttendanceTrend(
  records: { status: string; date: Date | string }[],
  now: Date = new Date(),
): AttendanceTrend | null {
  const dayMs = 24 * 60 * 60 * 1000;
  const currentStart = now.getTime() - TREND_WINDOW_DAYS * dayMs;
  const previousStart = currentStart - TREND_WINDOW_DAYS * dayMs;

  let curTotal = 0;
  let curAttended = 0;
  let prevTotal = 0;
  let prevAttended = 0;

  for (const r of records) {
    const t = (r.date instanceof Date ? r.date : new Date(r.date)).getTime();
    if (t > now.getTime()) continue;
    const attended = ATTENDED_STATUSES.has(r.status);
    if (t >= currentStart) {
      curTotal += 1;
      if (attended) curAttended += 1;
    } else if (t >= previousStart) {
      prevTotal += 1;
      if (attended) prevAttended += 1;
    }
  }

  if (curTotal === 0 || prevTotal === 0) return null;
  const current = Math.round((curAttended / curTotal) * 100);
  const previous = Math.round((prevAttended / prevTotal) * 100);
  return { current, previous, deltaPct: current - previous };
}

/**
 * Dias até o próximo aniversário (0 = hoje). Usa mês/dia em UTC porque
 * birthDate é persistido como data pura.
 */
export function daysUntilBirthday(
  birthDate: Date | string,
  now: Date = new Date(),
): number {
  const b = birthDate instanceof Date ? birthDate : new Date(birthDate);
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  let next = Date.UTC(now.getFullYear(), b.getUTCMonth(), b.getUTCDate());
  if (next < todayUtc) {
    next = Date.UTC(now.getFullYear() + 1, b.getUTCMonth(), b.getUTCDate());
  }
  return Math.round((next - todayUtc) / (24 * 60 * 60 * 1000));
}

// ─── Próxima melhor ação ──────────────────────────────────────────────────────

export type NextActionId =
  | "prepare_meeting"
  | "start_meeting"
  | "continue_attendance"
  | "complete_meeting"
  | "register_attendance"
  | "low_frequency"
  | "birthday"
  | "pending_sacraments";

export type NextActionPriority = "high" | "important" | "attention" | "info";

export type NextAction = {
  id: NextActionId;
  priority: NextActionPriority;
  titleKey: string;
  contextKey: string;
  ctaKey: string;
  href: string;
  meta: Record<string, string | number>;
};

export type CatechesisStatus = "ok" | "attention" | "action_needed";

export type DashboardActionStats = {
  pendingSacraments?: number;
  pendingAttendanceMeeting?: {
    id: string;
    date: Date | string;
    class: { id: string; name: string };
    enrollmentCount: number;
  } | null;
  lowFrequency?: {
    count: number;
    threshold: number;
    sample: { id: string; firstName: string; lastName: string; rate: number }[];
  } | null;
  upcomingBirthdays?: {
    id: string;
    firstName: string;
    lastName: string;
    birthDate: Date | string;
    daysUntil: number;
    className?: string | null;
  }[];
};

const PRIORITY_ORDER: Record<NextActionPriority, number> = {
  high: 0,
  important: 1,
  attention: 2,
  info: 3,
};

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

function action(
  id: NextActionId,
  priority: NextActionPriority,
  href: string,
  meta: Record<string, string | number>,
): NextAction {
  return {
    id,
    priority,
    titleKey: `action.${id}.title`,
    contextKey: `action.${id}.context`,
    ctaKey: `action.${id}.cta`,
    href,
    meta,
  };
}

/**
 * Monta a lista ordenada de ações do catequista a partir do payload do
 * dashboard + foco do encontro. Determinística (sem i18n, sem datas relativas).
 */
export function buildNextActions(
  stats: DashboardActionStats | null | undefined,
  focus: EncounterFocus | null | undefined,
  _now: Date = new Date(),
): NextAction[] {
  const actions: NextAction[] = [];
  const meeting = focus?.meeting;
  const focusKind = focus?.focusKind ?? "none";
  const ctaAction = focus?.primaryCta?.action;
  const isLive =
    focusKind === "in_progress" ||
    focusKind === "today" ||
    focusKind === "upcoming";

  if (meeting && isLive && focus?.primaryCta) {
    const meta = {
      meetingId: meeting.id,
      meetingTitle: meeting.title || meeting.theme || "",
      className: meeting.class?.name ?? "",
      date: toIso(meeting.date),
      location: meeting.locationHint ?? "",
      registered: focus.attendanceSummary?.registered ?? 0,
      total: focus.attendanceSummary?.totalActive ?? 0,
    };
    const href = focus.primaryCta.href;
    if (ctaAction === "PREPARE") {
      actions.push(action("prepare_meeting", "high", href, meta));
    } else if (ctaAction === "START") {
      actions.push(
        action(
          "start_meeting",
          focusKind === "upcoming" ? "info" : "important",
          href,
          meta,
        ),
      );
    } else if (ctaAction === "CONTINUE_ATTENDANCE") {
      actions.push(action("continue_attendance", "high", href, meta));
    } else if (ctaAction === "COMPLETE") {
      actions.push(action("complete_meeting", "important", href, meta));
    }
  }

  const pending = stats?.pendingAttendanceMeeting;
  if (pending && pending.id !== meeting?.id) {
    actions.push(
      action(
        "register_attendance",
        "important",
        `/app/classes/${pending.class.id}/attendance?meetingId=${pending.id}`,
        {
          meetingId: pending.id,
          className: pending.class.name,
          date: toIso(pending.date),
          count: pending.enrollmentCount,
        },
      ),
    );
  }

  const low = stats?.lowFrequency;
  if (low && low.count > 0) {
    actions.push(
      action("low_frequency", "attention", "/app/reports", {
        count: low.count,
        threshold: low.threshold,
        names: low.sample.map((s) => s.firstName).join(", "),
      }),
    );
  }

  const nextBirthday = stats?.upcomingBirthdays?.[0];
  if (nextBirthday && nextBirthday.daysUntil <= BIRTHDAY_ACTION_WINDOW_DAYS) {
    actions.push(
      action("birthday", "info", `/app/catechumens/${nextBirthday.id}`, {
        name: `${nextBirthday.firstName} ${nextBirthday.lastName}`.trim(),
        firstName: nextBirthday.firstName,
        daysUntil: nextBirthday.daysUntil,
        className: nextBirthday.className ?? "",
        date: toIso(nextBirthday.birthDate),
      }),
    );
  }

  if ((stats?.pendingSacraments ?? 0) > 0) {
    actions.push(
      action("pending_sacraments", "info", "/app/sacramental-journeys", {
        count: stats!.pendingSacraments as number,
      }),
    );
  }

  return actions.sort(
    (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority],
  );
}

export function getCatechesisStatus(actions: NextAction[]): CatechesisStatus {
  if (actions.some((a) => a.priority === "high")) return "action_needed";
  if (
    actions.some(
      (a) => a.priority === "important" || a.priority === "attention",
    )
  ) {
    return "attention";
  }
  return "ok";
}
