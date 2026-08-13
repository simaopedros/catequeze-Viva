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
const COST = 1;

type Wallet = { userId: string; creditsLeft: number; lastReset: Date };

function thisMonthReset(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function previousMonthReset(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - 1, 1);
}

function makePaidContext(wallet: Wallet, plan = "single") {
  const state = { ...wallet, lastReset: new Date(wallet.lastReset) };

  const UserAiCredits = {
    findUnique: vi.fn(async () => ({
      ...state,
      lastReset: new Date(state.lastReset),
    })),
    create: vi.fn(),
    update: vi.fn(async ({ data }: { data: any }) => {
      if (typeof data.creditsLeft === "number") {
        state.creditsLeft = data.creditsLeft;
      } else if (data.creditsLeft?.decrement) {
        state.creditsLeft -= data.creditsLeft.decrement;
      }
      if (data.lastReset) state.lastReset = data.lastReset;
      return { ...state, lastReset: new Date(state.lastReset) };
    }),
    updateMany: vi.fn(async ({ where, data }: { where: any; data: any }) => {
      const min = where.creditsLeft?.gte ?? 0;
      if (state.creditsLeft < min) return { count: 0 };
      if (data.creditsLeft?.decrement) {
        state.creditsLeft -= data.creditsLeft.decrement;
      }
      return { count: 1 };
    }),
    upsert: vi.fn(),
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
