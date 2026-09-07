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
    expect(expireQuery.NOT).toEqual({ manualDeal: true });
    expect(expireQuery.OR).toEqual([
      { parishId: null },
      { parish: { owner: { paymentProcessorUserId: null } } },
    ]);
  });
});
