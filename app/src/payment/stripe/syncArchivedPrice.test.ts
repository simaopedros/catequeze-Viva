import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  updateUserSubscription: vi.fn(),
}));

vi.mock("wasp/server", () => ({
  HttpError: class extends Error {
    statusCode: number;
    constructor(statusCode: number, message?: string) {
      super(message);
      this.statusCode = statusCode;
    }
  },
  env: {},
}));

vi.mock("./stripeClient", () => ({
  stripeClient: {
    subscriptions: { list: mocks.list },
  },
}));

vi.mock("../user", () => ({
  updateUserSubscription: mocks.updateUserSubscription,
}));

import { refreshUserBillingFromStripe } from "./syncUserSubscription";
import { invalidatePlanCatalogCache } from "../../server/pricing/planCatalogService";

describe("refreshUserBillingFromStripe archived prices", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PRICING_CATALOG_SOURCE = "db";
    invalidatePlanCatalogCache();
    mocks.updateUserSubscription.mockImplementation(async (args: { paymentPlanId: string; subscriptionStatus: string; paymentProcessorUserId: string }) => ({
      subscriptionStatus: args.subscriptionStatus,
      subscriptionPlan: args.paymentPlanId,
      createdAt: new Date("2024-01-01T00:00:00Z"),
      paymentProcessorUserId: args.paymentProcessorUserId,
      trialEndsAt: null,
    }));
  });

  it("keeps an existing subscriber on the plan of an archived Stripe price", async () => {
    mocks.list.mockResolvedValue({
      data: [
        {
          id: "sub_legacy",
          status: "active",
          created: 10,
          cancel_at_period_end: false,
          trial_end: null,
          items: { data: [{ price: { id: "price_archived_old", active: false } }] },
        },
      ],
    });
    const findMany = vi.fn().mockResolvedValue([
      {
        slug: "single",
        name: "Catequista",
        kind: "SUBSCRIPTION",
        level: "PERSONAL",
        isActive: true,
        isPublic: true,
        prices: [
          {
            interval: "MONTHLY",
            currency: "BRL",
            unitAmountCents: 990,
            stripePriceId: "price_archived_old",
            isActive: false,
            archivedAt: new Date("2026-11-05T03:00:00Z"),
          },
          {
            interval: "MONTHLY",
            currency: "BRL",
            unitAmountCents: 4700,
            stripePriceId: null,
            isActive: true,
            archivedAt: null,
          },
        ],
      },
    ]);
    const context = {
      entities: {
        User: {
          findUnique: vi.fn().mockResolvedValue({
            subscriptionStatus: null,
            subscriptionPlan: "catechist_free",
            createdAt: new Date("2024-01-01T00:00:00Z"),
            paymentProcessorUserId: "cus_legacy",
            trialEndsAt: null,
          }),
        },
        PricingPlan: { findMany },
      },
    };

    const synced = await refreshUserBillingFromStripe(context, "user-legacy");

    expect(mocks.updateUserSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentProcessorUserId: "cus_legacy",
        paymentPlanId: "single",
        subscriptionStatus: "active",
        stripeSubscriptionId: "sub_legacy",
      }),
      context.entities.User,
    );
    expect(synced.subscriptionPlan).toBe("single");
    expect(synced.subscriptionStatus).toBe("active");
  });
});
