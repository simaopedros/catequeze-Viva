import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("wasp/server", () => {
  class HttpError extends Error {
    statusCode: number;
    constructor(statusCode: number, message?: string) {
      super(message);
      this.statusCode = statusCode;
    }
  }
  return { HttpError };
});

vi.mock("../server/pricing/planCatalogService", () => ({
  loadPlanCatalog: vi.fn(async () => ({
    bySlug: {
      catechist_free: {
        slug: "catechist_free",
        limits: {
          maxClasses: 0,
          maxCatechumens: 0,
          maxCatechists: 0,
          maxParishes: 0,
        },
      },
      unlimited: {
        slug: "unlimited",
        limits: {
          maxClasses: null,
          maxCatechumens: null,
          maxCatechists: null,
          maxParishes: null,
        },
      },
    },
  })),
}));

import {
  assertCanCreateParish,
  assertDioceseParishQuota,
} from "../server/operations/billingEnforcement";
import {
  dioceseDealBlockedNewParishMessage,
  dioceseParishQuotaMessage,
} from "../shared/dioceseDeal";

function makeContext(opts: {
  dioceseBilling?: any;
  parishCount?: number;
  user?: any;
}) {
  return {
    user: opts.user ?? { id: "user-1", isAdmin: false },
    entities: {
      User: {
        findUnique: vi.fn(async () => ({
          subscriptionStatus: null,
          subscriptionPlan: "catechist_free",
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          paymentProcessorUserId: null,
        })),
      },
      TenantBilling: {
        findUnique: vi.fn(async () => opts.dioceseBilling ?? null),
      },
      Parish: {
        count: vi.fn(async () => opts.parishCount ?? 0),
      },
    },
  };
}

const activeDeal = {
  plan: "unlimited",
  status: "ACTIVE",
  trialEndsAt: null,
  manualDeal: true,
  processor: "MANUAL",
  maxParishes: 3,
  maxClasses: null,
  maxCatechumens: null,
  maxCatechists: null,
  startsAt: null,
  endsAt: null,
};

describe("diocese parish quota", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows a new parish under an active deal with remaining seats", async () => {
    const ctx = makeContext({ dioceseBilling: activeDeal, parishCount: 2 });
    await expect(
      assertCanCreateParish(ctx, { dioceseId: "dio-1" }),
    ).resolves.toBeUndefined();
  });

  it("blocks over-quota creation with pastoral copy", async () => {
    const ctx = makeContext({ dioceseBilling: activeDeal, parishCount: 3 });
    await expect(
      assertCanCreateParish(ctx, { dioceseId: "dio-1" }),
    ).rejects.toMatchObject({
      statusCode: 403,
      message: dioceseParishQuotaMessage(3, 3),
    });
  });

  it("blocks new parishes when the deal is suspended, without Stripe copy", async () => {
    const ctx = makeContext({
      dioceseBilling: { ...activeDeal, status: "SUSPENDED" },
      parishCount: 1,
    });
    await expect(
      assertDioceseParishQuota(ctx, { dioceseId: "dio-1" }),
    ).rejects.toMatchObject({
      statusCode: 403,
      message: dioceseDealBlockedNewParishMessage({ status: "SUSPENDED" }),
    });
  });

  it("blocks new parishes when the deal is inactive", async () => {
    const ctx = makeContext({
      dioceseBilling: { ...activeDeal, status: "INACTIVE" },
      parishCount: 0,
    });
    await expect(
      assertCanCreateParish(ctx, { dioceseId: "dio-1" }),
    ).rejects.toMatchObject({
      statusCode: 403,
      message: dioceseDealBlockedNewParishMessage({ status: "INACTIVE" }),
    });
  });

  it("does not intercept dioceses without a negotiated deal", async () => {
    const ctx = makeContext({ dioceseBilling: null, parishCount: 0 });
    await expect(
      assertDioceseParishQuota(ctx, { dioceseId: "dio-1" }),
    ).resolves.toBeUndefined();
  });
});
