import { describe, expect, it } from "vitest";
import {
  mapStripeSubscriptionStatus,
  pickLiveStripeSubscription,
  stripeTrialEndsAt,
} from "./syncUserSubscription";
import { SubscriptionStatus } from "../plans";

describe("pickLiveStripeSubscription", () => {
  it("ignores incomplete Checkout sessions without a live subscription", () => {
    expect(
      pickLiveStripeSubscription([
        { status: "incomplete", created: 2 },
        { status: "incomplete_expired", created: 3 },
      ]),
    ).toBeNull();
  });

  it("prefers the newest trialing or active subscription", () => {
    const live = pickLiveStripeSubscription([
      { status: "active", created: 1, id: "old" },
      { status: "trialing", created: 9, id: "new" },
      { status: "canceled", created: 10 },
    ]);
    expect(live?.id).toBe("new");
  });
});

describe("mapStripeSubscriptionStatus", () => {
  it("keeps Stripe trialing as trialing", () => {
    expect(
      mapStripeSubscriptionStatus({
        status: "trialing",
        cancel_at_period_end: false,
      }),
    ).toBe(SubscriptionStatus.Trialing);
  });

  it("maps cancel-at-period-end on an active sub", () => {
    expect(
      mapStripeSubscriptionStatus({
        status: "active",
        cancel_at_period_end: true,
      }),
    ).toBe(SubscriptionStatus.CancelAtPeriodEnd);
  });
});

describe("stripeTrialEndsAt", () => {
  it("converts unix seconds", () => {
    expect(stripeTrialEndsAt({ trial_end: 1_700_000_000 })?.toISOString()).toBe(
      "2023-11-14T22:13:20.000Z",
    );
    expect(stripeTrialEndsAt({ trial_end: null })).toBeNull();
  });
});
