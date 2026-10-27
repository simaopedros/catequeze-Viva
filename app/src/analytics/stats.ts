import { type DailyStats } from "wasp/entities";
import {
  getFirstPartyTraffic,
  startOfUtcDay,
  type FirstPartyTraffic,
} from "./providers/firstPartyAnalyticsUtils";
import { paymentProcessor } from "../payment/paymentProcessor";
import { SubscriptionStatus } from "../payment/plans";
import { logger } from "../server/logger";

export type DailyStatsProps = {
  dailyStats?: DailyStats;
  weeklyStats?: DailyStats[];
  isLoading?: boolean;
};

const EMPTY_TRAFFIC: FirstPartyTraffic = {
  totalViews: 0,
  prevDayViewsChangePercent: "0",
  sources: [],
};

/**
 * Computes and upserts today's DailyStats from first-party DB signals.
 * Does NOT call Plausible/GA (those keys 401 in many envs). Stripe revenue is
 * best-effort — failures are logged and DB user/activity stats still persist.
 */
export const calculateDailyStats = async (_args: unknown, context: any) => {
  const nowUTC = startOfUtcDay(new Date());

  const yesterdayUTC = new Date(nowUTC);
  yesterdayUTC.setUTCDate(yesterdayUTC.getUTCDate() - 1);

  try {
    const [yesterdaysStats, userCount, paidUserCount] = await Promise.all([
      context.entities.DailyStats.findFirst({
        where: {
          date: {
            equals: yesterdayUTC,
          },
        },
        select: { userCount: true, paidUserCount: true },
      }),
      context.entities.User.count({}),
      context.entities.User.count({
        where: {
          subscriptionStatus: SubscriptionStatus.Active,
        },
      }),
    ]);

    let userDelta = userCount;
    let paidUserDelta = paidUserCount;
    if (yesterdaysStats) {
      userDelta -= yesterdaysStats.userCount;
      paidUserDelta -= yesterdaysStats.paidUserCount;
    }

    // External revenue is optional. Never let Stripe/Plausible/GA abort DB stats.
    let totalRevenue = 0;
    try {
      totalRevenue = await paymentProcessor.fetchTotalRevenue();
    } catch (error: any) {
      logger.warn("[dailyStats] Stripe revenue unavailable", {
        error: error?.message ?? String(error),
      });
    }

    let traffic = EMPTY_TRAFFIC;
    try {
      // First-party only (PricingEvent + signups) — no Plausible/GA HTTP calls.
      traffic = await getFirstPartyTraffic(context, nowUTC);
    } catch (error: any) {
      logger.warn("[dailyStats] First-party traffic unavailable", {
        error: error?.message ?? String(error),
      });
    }

    const { totalViews, prevDayViewsChangePercent, sources } = traffic;

    let dailyStats = await context.entities.DailyStats.findUnique({
      where: {
        date: nowUTC,
      },
    });

    if (!dailyStats) {
      console.log("No daily stat found for today, creating one...");
      dailyStats = await context.entities.DailyStats.create({
        data: {
          date: nowUTC,
          totalViews,
          prevDayViewsChangePercent,
          userCount,
          paidUserCount,
          userDelta,
          paidUserDelta,
          totalRevenue,
        },
      });
    } else {
      console.log("Daily stat found for today, updating it...");
      dailyStats = await context.entities.DailyStats.update({
        where: {
          id: dailyStats.id,
        },
        data: {
          totalViews,
          prevDayViewsChangePercent,
          userCount,
          paidUserCount,
          userDelta,
          paidUserDelta,
          totalRevenue,
        },
      });
    }

    await Promise.all(
      sources.map((source) => {
        let visitors = source.visitors;
        if (typeof source.visitors !== "number") {
          visitors = parseInt(source.visitors);
        }
        return context.entities.PageViewSource.upsert({
          where: {
            date_name: {
              date: nowUTC,
              name: source.source,
            },
          },
          create: {
            date: nowUTC,
            name: source.source,
            visitors,
            dailyStatsId: dailyStats.id,
          },
          update: {
            visitors,
          },
        });
      }),
    );

    console.table({ dailyStats });
    return dailyStats;
  } catch (error: any) {
    console.error("Error calculating daily stats: ", error);
    await context.entities.Logs.create({
      data: {
        message: `Error calculating daily stats: ${error?.message}`,
        level: "job-error",
      },
    });
    throw error;
  }
};
