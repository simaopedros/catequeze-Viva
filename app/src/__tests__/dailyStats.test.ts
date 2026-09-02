import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  addUtcDays,
  getFirstPartyTraffic,
  sourcesFromActivity,
  startOfUtcDay,
  viewsChangePercent,
} from "../analytics/providers/firstPartyAnalyticsUtils";
import { calculateDailyStats } from "../analytics/stats";
import { SubscriptionStatus } from "../payment/plans";

vi.mock("wasp/entities", () => ({}));

vi.mock("../payment/paymentProcessor", () => ({
  paymentProcessor: {
    fetchTotalRevenue: vi.fn(),
  },
}));

vi.mock("../server/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { paymentProcessor } from "../payment/paymentProcessor";
import { logger } from "../server/logger";

function createContext(overrides: Record<string, any> = {}) {
  const dailyStats = {
    id: 1,
    date: startOfUtcDay(),
    userCount: 10,
    paidUserCount: 2,
  };

  return {
    entities: {
      DailyStats: {
        findFirst: vi.fn().mockResolvedValue(null),
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue(dailyStats),
        update: vi.fn(),
      },
      User: {
        count: vi.fn().mockResolvedValue(0),
      },
      PricingEvent: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      PageViewSource: {
        upsert: vi.fn().mockResolvedValue(undefined),
      },
      Logs: {
        create: vi.fn().mockResolvedValue(undefined),
      },
      ...overrides,
    },
  };
}

describe("viewsChangePercent", () => {
  it("returns 0 when either day has no activity", () => {
    expect(viewsChangePercent(0, 10)).toBe("0");
    expect(viewsChangePercent(10, 0)).toBe("0");
  });

  it("rounds the day-over-day change", () => {
    expect(viewsChangePercent(15, 10)).toBe("50");
    expect(viewsChangePercent(5, 10)).toBe("-50");
  });
});

describe("sourcesFromActivity", () => {
  it("omits empty buckets and sorts by visitors", () => {
    expect(
      sourcesFromActivity({
        eventCounts: {
          purchase_completed: 2,
          landing_viewed: 0,
          checkout_started: 5,
        },
        signups: 3,
      }),
    ).toEqual([
      { source: "checkout_started", visitors: 5 },
      { source: "signups", visitors: 3 },
      { source: "purchase_completed", visitors: 2 },
    ]);
  });
});

describe("getFirstPartyTraffic", () => {
  it("counts today's pricing events and signups", async () => {
    const today = startOfUtcDay(new Date("2026-09-02T15:00:00.000Z"));
    const context = createContext({
      PricingEvent: {
        findMany: vi
          .fn()
          .mockResolvedValueOnce([
            { event: "checkout_started" },
            { event: "checkout_started" },
            { event: "purchase_completed" },
          ])
          .mockResolvedValueOnce([{ event: "checkout_started" }]),
      },
      User: {
        count: vi.fn().mockResolvedValueOnce(2).mockResolvedValueOnce(1),
      },
    });

    const traffic = await getFirstPartyTraffic(context, today);

    expect(traffic.totalViews).toBe(5);
    expect(traffic.prevDayViewsChangePercent).toBe("150");
    expect(traffic.sources).toEqual([
      { source: "checkout_started", visitors: 2 },
      { source: "signups", visitors: 2 },
      { source: "purchase_completed", visitors: 1 },
    ]);

    const todayQuery = context.entities.PricingEvent.findMany.mock.calls[0][0];
    expect(todayQuery.where.createdAt.gte).toEqual(today);
    expect(todayQuery.where.createdAt.lt).toEqual(addUtcDays(today, 1));
  });
});

describe("calculateDailyStats", () => {
  beforeEach(() => {
    vi.mocked(paymentProcessor.fetchTotalRevenue).mockReset();
    vi.mocked(logger.warn).mockClear();
  });

  it("persists first-party users and activity without calling Plausible", async () => {
    vi.mocked(paymentProcessor.fetchTotalRevenue).mockResolvedValue(99.5);
    const context = createContext();
    context.entities.User.count
      .mockResolvedValueOnce(12)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0);
    context.entities.PricingEvent.findMany
      .mockResolvedValueOnce([{ event: "purchase_completed" }])
      .mockResolvedValueOnce([]);

    await calculateDailyStats(undefined, context);

    expect(context.entities.DailyStats.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userCount: 12,
        paidUserCount: 3,
        userDelta: 12,
        paidUserDelta: 3,
        totalRevenue: 99.5,
        totalViews: 2,
        prevDayViewsChangePercent: "0",
      }),
    });
    expect(context.entities.PageViewSource.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          name: "purchase_completed",
          visitors: 1,
        }),
      }),
    );
    expect(context.entities.Logs.create).not.toHaveBeenCalled();
  });

  it("still stores user counts when Stripe revenue fails", async () => {
    vi.mocked(paymentProcessor.fetchTotalRevenue).mockRejectedValue(
      new Error("HTTP error! Status: 401"),
    );
    const context = createContext();
    context.entities.User.count
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);

    await calculateDailyStats(undefined, context);

    expect(context.entities.DailyStats.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userCount: 4,
        paidUserCount: 1,
        totalRevenue: 0,
        totalViews: 0,
      }),
    });
    expect(logger.warn).toHaveBeenCalledWith(
      "[dailyStats] Stripe revenue unavailable",
      expect.objectContaining({ error: "HTTP error! Status: 401" }),
    );
    expect(context.entities.Logs.create).not.toHaveBeenCalled();
  });

  it("still stores user counts when pricing events are unavailable", async () => {
    vi.mocked(paymentProcessor.fetchTotalRevenue).mockResolvedValue(0);
    const context = createContext({
      PricingEvent: {
        findMany: vi.fn().mockRejectedValue(new Error("PricingEvent missing")),
      },
    });
    context.entities.User.count
      .mockResolvedValueOnce(8)
      .mockResolvedValueOnce(0);

    await calculateDailyStats(undefined, context);

    expect(context.entities.DailyStats.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userCount: 8,
        paidUserCount: 0,
        totalViews: 0,
      }),
    });
    expect(context.entities.Logs.create).not.toHaveBeenCalled();
  });

  it("counts paid users with Active subscription status", async () => {
    vi.mocked(paymentProcessor.fetchTotalRevenue).mockResolvedValue(0);
    const context = createContext();
    context.entities.User.count.mockResolvedValue(0);

    await calculateDailyStats(undefined, context);

    expect(context.entities.User.count).toHaveBeenCalledWith({
      where: { subscriptionStatus: SubscriptionStatus.Active },
    });
  });
});
