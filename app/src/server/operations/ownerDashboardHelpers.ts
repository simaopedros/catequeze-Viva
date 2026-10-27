/**
 * Pure aggregation helpers for the owner business dashboard.
 * Kept free of Wasp/Prisma/Stripe so unit tests stay fast and deterministic.
 */

export type MonthBucket = { month: string; amountBrl: number };

export type PaidInvoiceLike = {
  amountPaidCents: number;
  currency?: string | null;
  paidAt: Date | string | number | null;
  status?: string | null;
  /** When false, invoice is excluded from live revenue totals. */
  livemode?: boolean | null;
  amountRefundedCents?: number | null;
};

export type StripeRecurringItemLike = {
  unitAmountCents: number;
  interval: string | null | undefined;
  intervalCount?: number | null;
  quantity?: number | null;
};

export type CohortInput = {
  userId: string;
  signupAt: Date | string;
  hadTrial: boolean;
  becamePaying: boolean;
};

export type CohortRow = {
  month: string;
  signups: number;
  hadTrial: number;
  becamePaying: number;
  trialToPaidRate: number | null;
};

export type ActivationInput = {
  userId: string;
  signupAt: Date | string;
  createdClass: boolean;
  recordedAttendance: boolean;
  activeLast7d?: boolean | null;
};

export type ActivationRow = {
  month: string;
  signups: number;
  createdClassPct: number | null;
  recordedAttendancePct: number | null;
  activeLast7dPct: number | null;
};

export type EmailDayStatus = "SENT" | "FAILED" | "QUEUED" | "CANCELLED";

export type EmailMessageLike = {
  createdAt: Date | string;
  status: string;
};

export type EmailHealthDay = {
  day: string;
  SENT: number;
  FAILED: number;
  QUEUED: number;
  CANCELLED: number;
};

export type MonthlyCount = { month: string; count: number };

const DAY_MS = 86_400_000;

export function toDate(value: Date | string | number | null | undefined): Date | null {
  if (value == null) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function monthKey(date: Date | string | number, timeZone = "America/Sao_Paulo"): string {
  const d = toDate(date);
  if (!d) return "invalid";
  // en-CA yields YYYY-MM-DD; slice to YYYY-MM in the app timezone.
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(d);
  const year = parts.find((p) => p.type === "year")?.value ?? "0000";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  return `${year}-${month}`;
}

export function dayKey(date: Date | string | number, timeZone = "America/Sao_Paulo"): string {
  const d = toDate(date);
  if (!d) return "invalid";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Last `count` calendar months including the month of `now`, oldest → newest. */
export function lastNMonthKeys(count: number, now: Date = new Date(), timeZone = "America/Sao_Paulo"): string[] {
  const keys: string[] = [];
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
  });
  // Walk backwards month by month using UTC noon anchors to avoid DST edges.
  const anchor = new Date(now);
  for (let i = count - 1; i >= 0; i--) {
    const probe = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() - i, 15, 12));
    const parts = formatter.formatToParts(probe);
    const year = parts.find((p) => p.type === "year")?.value ?? "0000";
    const month = parts.find((p) => p.type === "month")?.value ?? "01";
    keys.push(`${year}-${month}`);
  }
  // Deduplicate while preserving order (rare timezone edge).
  return [...new Set(keys)].slice(-count);
}

export function emptyMonthBuckets(months: string[]): MonthBucket[] {
  return months.map((month) => ({ month, amountBrl: 0 }));
}

export function emptyMonthlyCounts(months: string[]): MonthlyCount[] {
  return months.map((month) => ({ month, count: 0 }));
}

/** Whether a paid invoice should count toward live revenue (excludes test/zero/refunded). */
export function isLiveRevenueInvoice(invoice: PaidInvoiceLike): boolean {
  if (invoice.status && invoice.status !== "paid") return false;
  if (invoice.livemode === false) return false;
  const paid = Math.max(0, invoice.amountPaidCents ?? 0);
  if (paid <= 0) return false;
  const refunded = Math.max(0, invoice.amountRefundedCents ?? 0);
  if (refunded > 0 && refunded >= paid) return false;
  return true;
}

/** Sum paid invoice amounts (BRL) per month. Non-BRL / test / zero / refunded skipped. */
export function aggregatePaidInvoicesByMonth(
  invoices: PaidInvoiceLike[],
  months: string[],
  options?: { timeZone?: string; currency?: string },
): {
  byMonth: MonthBucket[];
  currentMonthTotalBrl: number;
  skippedNonLive: number;
} {
  const currency = (options?.currency ?? "brl").toLowerCase();
  const timeZone = options?.timeZone ?? "America/Sao_Paulo";
  const map = new Map(months.map((m) => [m, 0]));
  const currentMonth = months[months.length - 1];
  let skippedNonLive = 0;

  for (const invoice of invoices) {
    if (invoice.status && invoice.status !== "paid") continue;
    const invCurrency = (invoice.currency ?? "brl").toLowerCase();
    if (invCurrency !== currency) continue;
    if (!isLiveRevenueInvoice(invoice)) {
      skippedNonLive += 1;
      continue;
    }
    const paidAt = toDate(invoice.paidAt);
    if (!paidAt) continue;
    const key = monthKey(paidAt, timeZone);
    if (!map.has(key)) continue;
    map.set(key, (map.get(key) ?? 0) + Math.max(0, invoice.amountPaidCents) / 100);
  }

  const byMonth = months.map((month) => ({
    month,
    amountBrl: Math.round((map.get(month) ?? 0) * 100) / 100,
  }));
  const currentMonthTotalBrl =
    Math.round((map.get(currentMonth) ?? 0) * 100) / 100;
  return { byMonth, currentMonthTotalBrl, skippedNonLive };
}

// formatMonthLabel lives in src/i18n/format.ts (client-safe).

/** Normalize a recurring Stripe price amount to monthly BRL (reais). */
export function normalizeRecurringAmountToMonthlyBrl(
  item: StripeRecurringItemLike,
): number {
  const qty = item.quantity && item.quantity > 0 ? item.quantity : 1;
  const intervalCount =
    item.intervalCount && item.intervalCount > 0 ? item.intervalCount : 1;
  const unit = Math.max(0, item.unitAmountCents) * qty;
  const interval = (item.interval ?? "month").toLowerCase();

  let monthlyCents = 0;
  switch (interval) {
    case "day":
      monthlyCents = (unit * 30) / intervalCount;
      break;
    case "week":
      monthlyCents = (unit * (52 / 12)) / intervalCount;
      break;
    case "month":
      monthlyCents = unit / intervalCount;
      break;
    case "year":
      monthlyCents = unit / (12 * intervalCount);
      break;
    default:
      monthlyCents = unit / intervalCount;
  }
  return Math.round((monthlyCents / 100) * 100) / 100;
}

export function sumStripeMrrBrl(items: StripeRecurringItemLike[]): number {
  const total = items.reduce(
    (sum, item) => sum + normalizeRecurringAmountToMonthlyBrl(item),
    0,
  );
  return Math.round(total * 100) / 100;
}

export function aggregateEventCountsByMonth(
  events: Array<{ at: Date | string; weight?: number }>,
  months: string[],
  timeZone = "America/Sao_Paulo",
): MonthlyCount[] {
  const map = new Map(months.map((m) => [m, 0]));
  for (const event of events) {
    const at = toDate(event.at);
    if (!at) continue;
    const key = monthKey(at, timeZone);
    if (!map.has(key)) continue;
    map.set(key, (map.get(key) ?? 0) + (event.weight ?? 1));
  }
  return months.map((month) => ({ month, count: map.get(month) ?? 0 }));
}

export function pct(numerator: number, denominator: number): number | null {
  if (!denominator) return null;
  return Math.round((numerator / denominator) * 1000) / 10;
}

export function buildTrialToPaidCohorts(
  rows: CohortInput[],
  months: string[],
  timeZone = "America/Sao_Paulo",
): CohortRow[] {
  const buckets = new Map(
    months.map((month) => [
      month,
      { signups: 0, hadTrial: 0, becamePaying: 0 },
    ]),
  );

  for (const row of rows) {
    const at = toDate(row.signupAt);
    if (!at) continue;
    const key = monthKey(at, timeZone);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.signups += 1;
    if (row.hadTrial) bucket.hadTrial += 1;
    if (row.becamePaying) bucket.becamePaying += 1;
  }

  return months.map((month) => {
    const b = buckets.get(month)!;
    return {
      month,
      signups: b.signups,
      hadTrial: b.hadTrial,
      becamePaying: b.becamePaying,
      trialToPaidRate: pct(b.becamePaying, b.hadTrial),
    };
  });
}

export function buildActivationRetention(
  rows: ActivationInput[],
  months: string[],
  options?: { includeActiveLast7d?: boolean; timeZone?: string },
): ActivationRow[] {
  const timeZone = options?.timeZone ?? "America/Sao_Paulo";
  const includeActive = options?.includeActiveLast7d === true;
  const buckets = new Map(
    months.map((month) => [
      month,
      {
        signups: 0,
        createdClass: 0,
        recordedAttendance: 0,
        activeLast7d: 0,
      },
    ]),
  );

  for (const row of rows) {
    const at = toDate(row.signupAt);
    if (!at) continue;
    const key = monthKey(at, timeZone);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.signups += 1;
    if (row.createdClass) bucket.createdClass += 1;
    if (row.recordedAttendance) bucket.recordedAttendance += 1;
    if (includeActive && row.activeLast7d) bucket.activeLast7d += 1;
  }

  return months.map((month) => {
    const b = buckets.get(month)!;
    return {
      month,
      signups: b.signups,
      createdClassPct: pct(b.createdClass, b.signups),
      recordedAttendancePct: pct(b.recordedAttendance, b.signups),
      activeLast7dPct: includeActive ? pct(b.activeLast7d, b.signups) : null,
    };
  });
}

const EMAIL_STATUSES: EmailDayStatus[] = [
  "SENT",
  "FAILED",
  "QUEUED",
  "CANCELLED",
];

export function lastNDayKeys(
  count: number,
  now: Date = new Date(),
  timeZone = "America/Sao_Paulo",
): string[] {
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * DAY_MS);
    keys.push(dayKey(d, timeZone));
  }
  return keys;
}

export function aggregateEmailHealthByDay(
  messages: EmailMessageLike[],
  days: string[],
  timeZone = "America/Sao_Paulo",
): EmailHealthDay[] {
  const map = new Map(
    days.map((day) => [
      day,
      { SENT: 0, FAILED: 0, QUEUED: 0, CANCELLED: 0 } as Record<
        EmailDayStatus,
        number
      >,
    ]),
  );

  for (const msg of messages) {
    const at = toDate(msg.createdAt);
    if (!at) continue;
    const key = dayKey(at, timeZone);
    const bucket = map.get(key);
    if (!bucket) continue;
    const status = msg.status.toUpperCase();
    if ((EMAIL_STATUSES as string[]).includes(status)) {
      bucket[status as EmailDayStatus] += 1;
    }
  }

  return days.map((day) => {
    const b = map.get(day)!;
    return { day, SENT: b.SENT, FAILED: b.FAILED, QUEUED: b.QUEUED, CANCELLED: b.CANCELLED };
  });
}

export function displayAccountName(
  parts: {
    firstName?: string | null;
    lastName?: string | null;
    username?: string | null;
    email?: string | null;
    fallback?: string | null;
  },
  options?: { allowEmailFallback?: boolean },
): string {
  const allowEmailFallback = options?.allowEmailFallback !== false;
  const name = [parts.firstName, parts.lastName].filter(Boolean).join(" ").trim();
  if (name) return name;
  const username = parts.username?.trim();
  const email = parts.email?.trim();
  if (username && username !== email) return username;
  if (allowEmailFallback && email) return email;
  if (parts.fallback?.trim()) return parts.fallback.trim();
  return allowEmailFallback ? "—" : "";
}

export function isWithinDaysForward(
  endDate: Date | string | null | undefined,
  now: Date,
  maxDays: number,
): boolean {
  const end = toDate(endDate);
  if (!end) return false;
  if (end.getTime() < now.getTime()) return false;
  const max = now.getTime() + maxDays * DAY_MS;
  return end.getTime() <= max;
}

export function mergeMonthlyCounts(
  a: MonthlyCount[],
  b: MonthlyCount[],
): MonthlyCount[] {
  const map = new Map<string, number>();
  for (const row of a) map.set(row.month, (map.get(row.month) ?? 0) + row.count);
  for (const row of b) map.set(row.month, (map.get(row.month) ?? 0) + row.count);
  const months = a.length ? a.map((r) => r.month) : b.map((r) => r.month);
  return months.map((month) => ({ month, count: map.get(month) ?? 0 }));
}
