import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("wasp/server", () => ({
  HttpError: class HttpError extends Error {
    statusCode: number;
    constructor(statusCode: number, message?: string) {
      super(message);
      this.statusCode = statusCode;
    }
  },
}));

vi.mock("../server/auth/helpers", () => ({
  requirePlatformAdmin: (user: any) => {
    if (!user?.isAdmin) {
      const error: any = new Error("Admin only");
      error.statusCode = 403;
      throw error;
    }
  },
}));

vi.mock("../server/pricing/planCatalogService", () => ({
  loadPlanCatalog: vi.fn().mockResolvedValue({
    bySlug: {
      single: {
        slug: "single",
        prices: [{ interval: "monthly", unitAmountCents: 990, isActive: true }],
      },
    },
  }),
}));

vi.mock("../server/billing/accountStatusCounts", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("../server/billing/accountStatusCounts")
  >();
  return {
    ...actual,
    getAccountStatusCounts: vi.fn().mockResolvedValue({
      payingTenants: 1,
      payingUsers: 1,
      uniquePayers: 1,
      manualActiveUsers: 0,
      trialUsers: 2,
      trialTenants: 0,
      expiredTrialUsers: 0,
      expiredTrialTenants: 0,
      pastDue: 0,
      trialsExpiring7d: 1,
    }),
  };
});

vi.mock("../server/i18n/serverLocale", () => ({
  resolveUserLocale: () => "pt-BR",
  formatServerDate: () => "01/10",
}));

import { getAccountStatusCounts } from "../server/billing/accountStatusCounts";
import {
  clearPlatformOverviewCacheForTests,
  getPlatformOverview,
} from "../server/operations/platformOperations";
import { createTtlCache } from "../server/cache/ttlCache";

const ADMIN = { id: "admin-1", isAdmin: true };

function overviewContext() {
  return {
    user: ADMIN,
    entities: {
      User: {
        count: vi.fn().mockResolvedValue(5),
        findMany: vi.fn().mockResolvedValue([{ subscriptionPlan: "single" }]),
      },
      Parish: { count: vi.fn().mockResolvedValue(5) },
      CatechesisClass: { count: vi.fn().mockResolvedValue(5) },
      ClassEnrollment: { count: vi.fn().mockResolvedValue(5) },
      TenantBilling: {
        findMany: vi.fn().mockResolvedValue([{ plan: "single" }]),
      },
    },
  };
}

describe("createTtlCache", () => {
  it("expires after ttl", () => {
    vi.useFakeTimers();
    const cache = createTtlCache<string>(1000);
    cache.set("a");
    expect(cache.get()).toBe("a");
    vi.advanceTimersByTime(1001);
    expect(cache.get()).toBeUndefined();
    vi.useRealTimers();
  });
});

describe("getPlatformOverview cache", () => {
  beforeEach(() => {
    clearPlatformOverviewCacheForTests();
    vi.mocked(getAccountStatusCounts).mockClear();
  });

  it("serves a second call from the 60s in-memory cache", async () => {
    const ctx = overviewContext();
    const first = await getPlatformOverview(undefined, ctx);
    const second = await getPlatformOverview(undefined, ctx);

    expect(first.totalUsers).toBe(5);
    expect(second).toEqual(first);
    expect(getAccountStatusCounts).toHaveBeenCalledTimes(1);
    // 3 User.count calls on first load only (total / 7d / 30d) — second hit is cached.
    expect(ctx.entities.User.count).toHaveBeenCalledTimes(3);
    expect(ctx.entities.User.findMany).toHaveBeenCalledTimes(1);
    expect(ctx.entities.TenantBilling.findMany).toHaveBeenCalledTimes(1);
  });
});
