import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  shouldPersistStripeSubscriptionId,
  updateUserSubscription,
} from "./user";
import { SubscriptionStatus } from "./plans";

describe("shouldPersistStripeSubscriptionId", () => {
  it("persists when existing is null and incoming is present", () => {
    expect(shouldPersistStripeSubscriptionId(null, "sub_1")).toBe(true);
    expect(shouldPersistStripeSubscriptionId(undefined, "sub_1")).toBe(true);
  });

  it("persists when existing equals incoming", () => {
    expect(shouldPersistStripeSubscriptionId("sub_1", "sub_1")).toBe(true);
  });

  it("does not overwrite a different non-null value", () => {
    expect(shouldPersistStripeSubscriptionId("sub_old", "sub_new")).toBe(false);
  });

  it("does not touch the column when incoming is missing", () => {
    expect(shouldPersistStripeSubscriptionId(null, null)).toBe(false);
    expect(shouldPersistStripeSubscriptionId("sub_1", undefined)).toBe(false);
    expect(shouldPersistStripeSubscriptionId("sub_1", "")).toBe(false);
  });
});

describe("updateUserSubscription", () => {
  const findUnique = vi.fn();
  const update = vi.fn();
  const userDelegate = { findUnique, update } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: "user_1",
      ...data,
    }));
  });

  it("writes stripeSubscriptionId when the user has none", async () => {
    findUnique.mockResolvedValue({ stripeSubscriptionId: null });

    await updateUserSubscription(
      {
        paymentProcessorUserId: "cus_1",
        subscriptionStatus: SubscriptionStatus.Active,
        paymentPlanId: "single",
        stripeSubscriptionId: "sub_1",
      },
      userDelegate,
    );

    expect(findUnique).toHaveBeenCalledWith({
      where: { paymentProcessorUserId: "cus_1" },
      select: { stripeSubscriptionId: true },
    });
    expect(update).toHaveBeenCalledWith({
      where: { paymentProcessorUserId: "cus_1" },
      data: expect.objectContaining({
        subscriptionStatus: SubscriptionStatus.Active,
        subscriptionPlan: "single",
        stripeSubscriptionId: "sub_1",
      }),
    });
  });

  it("keeps an existing different stripeSubscriptionId", async () => {
    findUnique.mockResolvedValue({ stripeSubscriptionId: "sub_existing" });

    await updateUserSubscription(
      {
        paymentProcessorUserId: "cus_1",
        subscriptionStatus: SubscriptionStatus.Active,
        paymentPlanId: "single",
        stripeSubscriptionId: "sub_other",
      },
      userDelegate,
    );

    expect(update).toHaveBeenCalledWith({
      where: { paymentProcessorUserId: "cus_1" },
      data: {
        subscriptionPlan: "single",
        subscriptionStatus: SubscriptionStatus.Active,
        datePaid: undefined,
      },
    });
    expect(update.mock.calls[0][0].data).not.toHaveProperty("stripeSubscriptionId");
  });

  it("skips the lookup when stripeSubscriptionId is not provided", async () => {
    await updateUserSubscription(
      {
        paymentProcessorUserId: "cus_1",
        subscriptionStatus: SubscriptionStatus.Deleted,
      },
      userDelegate,
    );

    expect(findUnique).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith({
      where: { paymentProcessorUserId: "cus_1" },
      data: {
        subscriptionPlan: undefined,
        subscriptionStatus: SubscriptionStatus.Deleted,
        datePaid: undefined,
      },
    });
  });
});
