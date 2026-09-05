import { describe, expect, it } from "vitest";
import {
  resolveOnboardingDeferredBillingHref,
  resolveOnboardingSecondaryAction,
} from "../catequese/lib/onboardingCompletion";

describe("resolveOnboardingDeferredBillingHref", () => {
  it("sends unpaid personal signups to the intended Catequista plan", () => {
    expect(
      resolveOnboardingDeferredBillingHref({
        intendedPlan: "single",
        accountType: "personal",
        alreadyHasAccess: false,
      }),
    ).toBe("/app/billing?plan=single");
  });

  it("sends unpaid parish signups to the intended paróquia plan", () => {
    expect(
      resolveOnboardingDeferredBillingHref({
        intendedPlan: "unlimited",
        accountType: "manager",
        alreadyHasAccess: false,
      }),
    ).toBe("/app/billing?plan=unlimited");
  });

  it("does not send trial or paid users back to billing", () => {
    expect(
      resolveOnboardingDeferredBillingHref({
        intendedPlan: "single",
        accountType: "personal",
        alreadyHasAccess: true,
      }),
    ).toBeNull();
    expect(
      resolveOnboardingSecondaryAction({
        intendedPlan: "single",
        accountType: "personal",
        alreadyHasAccess: true,
      }),
    ).toEqual({ href: "/app", kind: "dashboard" });
  });

  it("ignores a plan that does not match the onboarding path", () => {
    expect(
      resolveOnboardingDeferredBillingHref({
        intendedPlan: "single",
        accountType: "manager",
        alreadyHasAccess: false,
      }),
    ).toBeNull();
    expect(
      resolveOnboardingDeferredBillingHref({
        intendedPlan: "unlimited",
        accountType: "personal",
        alreadyHasAccess: false,
      }),
    ).toBeNull();
  });
});
