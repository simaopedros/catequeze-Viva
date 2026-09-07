import { describe, expect, it, vi } from "vitest";

vi.mock("../server/pricing/planCatalogService", () => ({
  loadPlanCatalog: vi.fn(),
}));

import {
  cascadeActivatePlanToTenantBilling,
  cascadeCancelToTenantBilling,
} from "../payment/billingCascade";

describe("billingCascade vs negotiated diocese deals", () => {
  it("does not cancel TenantBilling rows marked manualDeal", async () => {
    const updateMany = vi.fn();
    const context = {
      entities: {
        TenantBilling: { updateMany, findUnique: vi.fn() },
        Membership: { findMany: vi.fn().mockResolvedValue([]) },
        Parish: { findMany: vi.fn().mockResolvedValue([]) },
      },
    };
    await cascadeCancelToTenantBilling(context, "user-1");
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ NOT: { manualDeal: true } }),
      }),
    );
  });

  it("skips activating over an existing manual diocese deal", async () => {
    const update = vi.fn();
    const create = vi.fn();
    const context = {
      entities: {
        TenantBilling: {
          findUnique: vi.fn().mockResolvedValue({
            id: "bill-d",
            manualDeal: true,
            dioceseId: "d1",
          }),
          update,
          create,
          updateMany: vi.fn(),
        },
        Membership: {
          findMany: vi.fn().mockResolvedValue([
            { parish: { dioceseId: "d1" } },
          ]),
        },
        Parish: { findMany: vi.fn().mockResolvedValue([]) },
        PricingPlan: { findMany: vi.fn() },
        PricingPlanPrice: { findMany: vi.fn() },
      },
    };
    await cascadeActivatePlanToTenantBilling(context, "user-1", "unlimited");
    expect(update).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });
});
