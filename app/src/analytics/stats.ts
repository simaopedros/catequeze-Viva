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

export const calculateDailyStats = async (_args: unknown, context: any) => {
  const nowUTC = startOfUtcDay(new Date());

  const yesterdayUTC = new Date(nowUTC);
  yesterdayUTC.setUTCDate(yesterdayUTC.getUTCDate() - 1);

  try {
    const yesterdaysStats = await context.entities.DailyStats.findFirst({
      where: {
        date: {
          equals: yesterdayUTC,
        },
      },
    });

    const userCount = await context.entities.User.count({});
    // users can have paid but canceled subscriptions which terminate at the end of the period
    // we don't want to count those users as current paying users
    const paidUserCount = await context.entities.User.count({
      where: {
        subscriptionStatus: SubscriptionStatus.Active,
      },
    });

    let userDelta = userCount;
    let paidUserDelta = paidUserCount;
    if (yesterdaysStats) {
      userDelta -= yesterdaysStats.userCount;
      paidUserDelta -= yesterdaysStats.paidUserCount;
    }

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

    for (const source of sources) {
      let visitors = source.visitors;
      if (typeof source.visitors !== "number") {
        visitors = parseInt(source.visitors);
      }
      await context.entities.PageViewSource.upsert({
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
    }

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
