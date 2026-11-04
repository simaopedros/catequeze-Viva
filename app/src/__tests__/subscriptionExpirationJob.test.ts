import { describe, expect, it, vi } from "vitest";
import { expireSubscriptionsJob } from "../server/scripts/subscriptionExpirationJob";

describe("expireSubscriptionsJob", () => {
  it("does not expire Stripe-managed user trials", async () => {
    const userUpdate = vi.fn();
    const tenantFindMany = vi.fn().mockResolvedValue([]);
    const userFindMany = vi.fn().mockResolvedValue([]);

    await expireSubscriptionsJob(undefined, {
      entities: {
        User: {
          findMany: userFindMany,
          update: userUpdate,
        },
        TenantBilling: {
          findMany: tenantFindMany,
          update: vi.fn(),
        },
      },
    });

    const userQuery = userFindMany.mock.calls[0][0].where;
    expect(userQuery.paymentProcessorUserId).toBeNull();
    expect(userQuery.subscriptionStatus.in).toEqual(["trialing", "trial"]);
  });

  it("only expires institutional trials whose owner has no Stripe customer", async () => {
    const tenantFindMany = vi.fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    await expireSubscriptionsJob(undefined, {
      entities: {
        User: {
          findMany: vi.fn().mockResolvedValue([]),
          update: vi.fn(),
        },
        TenantBilling: {
          findMany: tenantFindMany,
          update: vi.fn(),
        },
      },
    });

    const expireQuery = tenantFindMany.mock.calls[0][0].where;
    expect(expireQuery.status).toBe("TRIAL");
    expect(expireQuery.OR).toEqual([
      { parishId: null },
      { parish: { owner: { paymentProcessorUserId: null } } },
    ]);
  });

  it("suspends a Hotmart subscriber only after accessEndsAt, with grace while past_due", async () => {
    const now = Date.now();
    const rows = [
      {
        id: "overdue",
        subscriptionStatus: "past_due",
        accessEndsAt: new Date(now - 4 * 24 * 60 * 60 * 1000),
      },
      {
        id: "in-grace",
        subscriptionStatus: "past_due",
        accessEndsAt: new Date(now - 1 * 24 * 60 * 60 * 1000),
      },
      {
        id: "canceled-ended",
        subscriptionStatus: "cancel_at_period_end",
        accessEndsAt: new Date(now - 60 * 1000),
      },
      {
        id: "still-paid",
        subscriptionStatus: "active",
        accessEndsAt: new Date(now + 10 * 24 * 60 * 60 * 1000),
      },
    ];
    const userUpdate = vi.fn(async ({ where, data }: any) => {
      Object.assign(rows.find((row) => row.id === where.id)!, data);
    });
    await expireSubscriptionsJob(undefined, {
      entities: {
        User: {
          findMany: vi.fn(async ({ where }: any) =>
            where?.billingProvider === "HOTMART" ? rows : [],
          ),
          update: userUpdate,
        },
        TenantBilling: {
          findMany: vi.fn().mockResolvedValue([]),
          update: vi.fn(),
        },
      },
    });
    expect(rows.find((row) => row.id === "overdue")).toMatchObject({
      subscriptionStatus: "deleted",
      subscriptionPlan: "catechist_free",
    });
    expect(rows.find((row) => row.id === "canceled-ended")?.subscriptionStatus).toBe("deleted");
    expect(rows.find((row) => row.id === "in-grace")?.subscriptionStatus).toBe("past_due");
    expect(rows.find((row) => row.id === "still-paid")?.subscriptionStatus).toBe("active");
  });
});
