/**
 * Unit tests for AI credit deduction — no heal-on-zero, calendar reset, atomic spend.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("wasp/server", () => {
  class HttpError extends Error {
    statusCode: number;
    constructor(statusCode: number, message?: string) {
      super(message);
      this.statusCode = statusCode;
      this.name = "HttpError";
    }
  }
  return { HttpError };
});

vi.mock("../server/ai/dailyUsage", () => ({
  getDailyUsage: vi.fn().mockResolvedValue(0),
  incrementDailyUsage: vi.fn().mockResolvedValue(undefined),
}));

import { incrementDailyUsage } from "../server/ai/dailyUsage";
import {
  assertAndDeductCredits,
  getCreditsStatus,
  grantSubscriptionAiCredits,
} from "../server/ai/credits";
import { getMonthlyAllowance } from "../shared/aiCredits";

const USER_ID = "user-paid-credits-001";
const PARISH_ID = "parish-credits-001";
const DIOCESE_ID = "diocese-credits-001";
const COST = 1;

type Wallet = {
  userId: string;
  creditsLeft: number;
  lastReset: Date;
  createdAt?: Date;
  updatedAt?: Date;
};

function thisMonthReset(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function previousMonthReset(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - 1, 1);
}

function snapshot(state: Wallet) {
  return {
    ...state,
    lastReset: new Date(state.lastReset),
    createdAt: state.createdAt ? new Date(state.createdAt) : undefined,
    updatedAt: state.updatedAt ? new Date(state.updatedAt) : undefined,
  };
}

function makePaidContext(wallet: Wallet, plan = "single") {
  const createdAt = wallet.createdAt ?? wallet.lastReset;
  const state: Wallet = {
    ...wallet,
    lastReset: new Date(wallet.lastReset),
    createdAt: new Date(createdAt),
    // Spent paid wallets have later updatedAt so leftover-trial grant does not fire.
    updatedAt: new Date(wallet.updatedAt ?? new Date()),
  };

  const UserAiCredits = {
    findUnique: vi.fn(async () => snapshot(state)),
    create: vi.fn(),
    update: vi.fn(async ({ data }: { data: any }) => {
      if (typeof data.creditsLeft === "number") {
        state.creditsLeft = data.creditsLeft;
      } else if (data.creditsLeft?.decrement) {
        state.creditsLeft -= data.creditsLeft.decrement;
      }
      if (data.lastReset) state.lastReset = data.lastReset;
      state.updatedAt = new Date();
      return snapshot(state);
    }),
    updateMany: vi.fn(async ({ where, data }: { where: any; data: any }) => {
      const min = where.creditsLeft?.gte ?? 0;
      if (state.creditsLeft < min) return { count: 0 };
      if (data.creditsLeft?.decrement) {
        state.creditsLeft -= data.creditsLeft.decrement;
      }
      state.updatedAt = new Date();
      return { count: 1 };
    }),
    upsert: vi.fn(async ({ create, update }: { create: any; update: any }) => {
      const data = update ?? create;
      if (typeof data.creditsLeft === "number") {
        state.creditsLeft = data.creditsLeft;
      }
      if (data.lastReset) state.lastReset = data.lastReset;
      state.updatedAt = new Date();
      return snapshot(state);
    }),
  };

  return {
    state,
    entities: {
      UserAiCredits,
      User: {
        findUnique: vi.fn().mockResolvedValue({
          subscriptionPlan: plan,
          credits: 0,
        }),
      },
    },
    user: { id: USER_ID },
  };
}

function attachTenantBilling(
  ctx: ReturnType<typeof makePaidContext>,
  kind: "parish" | "diocese",
) {
  ctx.entities.Membership = {
    findMany: vi.fn().mockResolvedValue([{ parishId: PARISH_ID }]),
  };
  ctx.entities.Parish = {
    findMany: vi.fn().mockResolvedValue([
      {
        id: PARISH_ID,
        dioceseId: kind === "diocese" ? DIOCESE_ID : null,
      },
    ]),
  };
  ctx.entities.TenantBilling = {
    findFirst: vi.fn(async ({ where }: { where: any }) => {
      if (kind === "diocese" && where.dioceseId) {
        return { plan: "UNLIMITED", pricingVersion: 2 };
      }
      if (kind === "parish" && where.parishId) {
        return { plan: "SINGLE" };
      }
      return null;
    }),
    findUnique: vi.fn().mockResolvedValue({
      id: "tb-credits-001",
      plan: kind === "diocese" ? "UNLIMITED" : "SINGLE",
    }),
  };
  return ctx;
}

describe("assertAndDeductCredits — exhausted paid wallet", () => {
  beforeEach(() => {
    vi.mocked(incrementDailyUsage).mockClear();
  });

  it("returns 402 and does not refill when creditsLeft is 0 this month", async () => {
    const ctx = makePaidContext({
      userId: USER_ID,
      creditsLeft: 0,
      lastReset: thisMonthReset(),
    });

    await expect(assertAndDeductCredits(ctx, COST)).rejects.toMatchObject({
      statusCode: 402,
    });

    expect(ctx.state.creditsLeft).toBe(0);
    expect(ctx.entities.UserAiCredits.update).not.toHaveBeenCalled();
    expect(ctx.entities.UserAiCredits.updateMany).not.toHaveBeenCalled();
    expect(incrementDailyUsage).not.toHaveBeenCalled();
  });

  it("grants monthly allowance on calendar reset even if wallet is empty", async () => {
    const allowance = getMonthlyAllowance("single");
    const ctx = makePaidContext({
      userId: USER_ID,
      creditsLeft: 0,
      lastReset: previousMonthReset(),
    });

    const result = await assertAndDeductCredits(ctx, COST);

    expect(result.creditsLeft).toBe(allowance - COST);
    expect(ctx.state.creditsLeft).toBe(allowance - COST);
    expect(ctx.entities.UserAiCredits.update).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      data: expect.objectContaining({ creditsLeft: allowance }),
    });
    expect(ctx.entities.UserAiCredits.updateMany).toHaveBeenCalledWith({
      where: { userId: USER_ID, creditsLeft: { gte: COST } },
      data: { creditsLeft: { decrement: COST } },
    });
    expect(incrementDailyUsage).toHaveBeenCalledWith(
      ctx.entities,
      USER_ID,
      COST,
    );
  });

  it("throws 402 when a concurrent deduct already spent the remaining credits", async () => {
    const ctx = makePaidContext({
      userId: USER_ID,
      creditsLeft: 1,
      lastReset: thisMonthReset(),
    });
    ctx.entities.UserAiCredits.updateMany.mockResolvedValueOnce({ count: 0 });

    await expect(assertAndDeductCredits(ctx, COST)).rejects.toMatchObject({
      statusCode: 402,
    });
    expect(incrementDailyUsage).not.toHaveBeenCalled();
  });

  it("grants once for an unused leftover trial after TenantBilling inherit", async () => {
    const created = new Date();
    const allowance = getMonthlyAllowance("single");
    const ctx = attachTenantBilling(
      makePaidContext(
        {
          userId: USER_ID,
          creditsLeft: 0,
          lastReset: created,
          createdAt: created,
          updatedAt: created,
        },
        "catechist_free",
      ),
      "parish",
    );

    const result = await assertAndDeductCredits(ctx, COST);

    expect(ctx.entities.UserAiCredits.upsert).toHaveBeenCalled();
    expect(result.creditsLeft).toBe(allowance - COST);
    expect(ctx.state.creditsLeft).toBe(allowance - COST);
  });

  it("does not treat a spent first-month paid wallet as a leftover trial", async () => {
    const created = thisMonthReset();
    const ctx = makePaidContext({
      userId: USER_ID,
      creditsLeft: 0,
      lastReset: created,
      createdAt: created,
      updatedAt: new Date(),
    });

    await expect(assertAndDeductCredits(ctx, COST)).rejects.toMatchObject({
      statusCode: 402,
    });
    expect(ctx.entities.UserAiCredits.upsert).not.toHaveBeenCalled();
    expect(ctx.state.creditsLeft).toBe(0);
  });
});

describe("assertAndDeductCredits — diocese v2 pool", () => {
  beforeEach(() => {
    vi.mocked(incrementDailyUsage).mockClear();
  });

  it("deducts atomically from the per-parish diocese wallet", async () => {
    const ctx = attachTenantBilling(
      makePaidContext(
        {
          userId: USER_ID,
          creditsLeft: 10,
          lastReset: thisMonthReset(),
        },
        "catechist_free",
      ),
      "diocese",
    );

    const result = await assertAndDeductCredits(ctx, COST);

    expect(result.creditsLeft).toBe(9);
    expect(ctx.entities.UserAiCredits.updateMany).toHaveBeenCalledWith({
      where: { userId: USER_ID, creditsLeft: { gte: COST } },
      data: { creditsLeft: { decrement: COST } },
    });
    expect(incrementDailyUsage).toHaveBeenCalledWith(
      ctx.entities,
      USER_ID,
      COST,
    );
  });

  it("returns 402 when diocese updateMany updates no row", async () => {
    const ctx = attachTenantBilling(
      makePaidContext(
        {
          userId: USER_ID,
          creditsLeft: 1,
          lastReset: thisMonthReset(),
        },
        "catechist_free",
      ),
      "diocese",
    );
    ctx.entities.UserAiCredits.updateMany.mockResolvedValueOnce({ count: 0 });

    await expect(assertAndDeductCredits(ctx, COST)).rejects.toMatchObject({
      statusCode: 402,
    });
    expect(incrementDailyUsage).not.toHaveBeenCalled();
  });
});

describe("getCreditsStatus — no fake refill at zero", () => {
  it("reports 0 remaining for a paid wallet exhausted this month", async () => {
    const ctx = makePaidContext({
      userId: USER_ID,
      creditsLeft: 0,
      lastReset: thisMonthReset(),
    });

    const status = await getCreditsStatus(ctx);
    expect(status.creditsLeft).toBe(0);
    expect(status.hasAiAccess).toBe(true);
    expect(status.monthlyAllowance).toBe(getMonthlyAllowance("single"));
  });

  it("previews monthly allowance when lastReset is a previous month", async () => {
    const ctx = makePaidContext({
      userId: USER_ID,
      creditsLeft: 0,
      lastReset: previousMonthReset(),
    });

    const status = await getCreditsStatus(ctx);
    expect(status.creditsLeft).toBe(getMonthlyAllowance("single"));
  });
});

describe("grantSubscriptionAiCredits", () => {
  it("still upserts the plan allowance on activation", async () => {
    const upsert = vi.fn();
    await grantSubscriptionAiCredits({ upsert }, USER_ID, "single");
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          creditsLeft: getMonthlyAllowance("single"),
        }),
        update: expect.objectContaining({
          creditsLeft: getMonthlyAllowance("single"),
        }),
      }),
    );
  });
});
