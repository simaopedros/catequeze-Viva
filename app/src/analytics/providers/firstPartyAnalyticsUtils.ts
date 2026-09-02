export type TrafficSource = {
  source: string;
  visitors: number;
};

export type FirstPartyTraffic = {
  totalViews: number;
  prevDayViewsChangePercent: string;
  sources: TrafficSource[];
};

export function startOfUtcDay(date = new Date()): Date {
  const day = new Date(date);
  day.setUTCHours(0, 0, 0, 0);
  return day;
}

export function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function viewsChangePercent(today: number, yesterday: number): string {
  if (today === 0 || yesterday === 0) {
    return "0";
  }
  return (((today - yesterday) / yesterday) * 100).toFixed(0);
}

export function sourcesFromActivity(args: {
  eventCounts: Record<string, number>;
  signups: number;
}): TrafficSource[] {
  const sources: TrafficSource[] = Object.entries(args.eventCounts)
    .filter(([, visitors]) => visitors > 0)
    .map(([source, visitors]) => ({ source, visitors }));

  if (args.signups > 0) {
    sources.push({ source: "signups", visitors: args.signups });
  }

  return sources.sort(
    (a, b) => b.visitors - a.visitors || a.source.localeCompare(b.source),
  );
}

function countByEvent(
  rows: Array<{ event: string }>,
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    counts[row.event] = (counts[row.event] ?? 0) + 1;
  }
  return counts;
}

/**
 * Product analytics from Postgres: PricingEvent (checkout, purchases,
 * activation) plus new user signups. Does not call Plausible or GA.
 */
export async function getFirstPartyTraffic(
  context: { entities: any },
  nowUTC: Date,
): Promise<FirstPartyTraffic> {
  const todayStart = nowUTC;
  const tomorrowStart = addUtcDays(todayStart, 1);
  const yesterdayStart = addUtcDays(todayStart, -1);

  const createdToday = { gte: todayStart, lt: tomorrowStart };
  const createdYesterday = { gte: yesterdayStart, lt: todayStart };

  const [eventsToday, eventsYesterday, signupsToday, signupsYesterday] =
    await Promise.all([
      context.entities.PricingEvent.findMany({
        where: { createdAt: createdToday },
        select: { event: true },
      }),
      context.entities.PricingEvent.findMany({
        where: { createdAt: createdYesterday },
        select: { event: true },
      }),
      context.entities.User.count({
        where: { createdAt: createdToday },
      }),
      context.entities.User.count({
        where: { createdAt: createdYesterday },
      }),
    ]);

  const viewsToday = eventsToday.length + signupsToday;
  const viewsYesterday = eventsYesterday.length + signupsYesterday;

  return {
    totalViews: viewsToday,
    prevDayViewsChangePercent: viewsChangePercent(viewsToday, viewsYesterday),
    sources: sourcesFromActivity({
      eventCounts: countByEvent(eventsToday),
      signups: signupsToday,
    }),
  };
}
