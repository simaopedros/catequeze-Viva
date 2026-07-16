/**
 * marketingAnalytics.test.ts — Path A funnel contract (client sinks only).
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  MARKETING_EVENT_NAMES,
  marketingLandingFromPath,
  rememberLandingOrigin,
  getLandingOrigin,
  trackMarketingEvent,
  trackFirstValueReached,
  trackOnboardingCompleted,
} from "../client/analytics/marketingAnalytics";

describe("marketing funnel Path A", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    window.dataLayer = [];
    window.plausible = vi.fn();
  });

  it("includes activation and onboarding completion events in the contract", () => {
    expect(MARKETING_EVENT_NAMES).toContain("onboarding_completed");
    expect(MARKETING_EVENT_NAMES).toContain("activation_milestone_completed");
    expect(MARKETING_EVENT_NAMES).toContain("first_value_reached");
    // Existing funnel preserved
    expect(MARKETING_EVENT_NAMES).toContain("landing_viewed");
    expect(MARKETING_EVENT_NAMES).toContain("signup_completed");
    expect(MARKETING_EVENT_NAMES).toContain("activation_completed");
  });

  it("maps campaign paths", () => {
    expect(marketingLandingFromPath("/")).toBe("general");
    expect(marketingLandingFromPath("/ia")).toBe("ai");
    expect(marketingLandingFromPath("/presenca")).toBe("attendance");
    expect(marketingLandingFromPath("/sistema")).toBe("management");
    expect(marketingLandingFromPath("/app")).toBeNull();
  });

  it("pushes to dataLayer and plausible", () => {
    trackMarketingEvent("primary_cta_clicked", {
      landing: "general",
      placement: "hero",
    });
    expect(window.dataLayer.some((e: any) => e.event === "primary_cta_clicked")).toBe(
      true,
    );
    expect(window.plausible).toHaveBeenCalled();
  });

  it("remembers first landing origin only", () => {
    rememberLandingOrigin("/ia");
    rememberLandingOrigin("/presenca");
    expect(getLandingOrigin()).toBe("ai");
  });

  it("dedupes first_value_reached", () => {
    const first = trackFirstValueReached({
      profile: "personal",
      workspace_type: "PERSONAL",
      path: "attendance",
    });
    const second = trackFirstValueReached({
      profile: "personal",
      path: "meeting",
    });
    expect(first).toBe(true);
    expect(second).toBe(false);
    const fv = window.dataLayer.filter(
      (e: any) => e.event === "first_value_reached",
    );
    expect(fv).toHaveLength(1);
    expect(fv[0]).toMatchObject({
      profile: "personal",
      path: "attendance",
      landing_origin: null,
    });
  });

  it("includes landing_origin on first_value when remembered", () => {
    rememberLandingOrigin("/sistema");
    trackFirstValueReached({
      profile: "institutional",
      workspace_type: "PARISH",
      path: "both",
    });
    const fv = window.dataLayer.find(
      (e: any) => e.event === "first_value_reached",
    ) as any;
    expect(fv.landing_origin).toBe("management");
  });

  it("dedupes onboarding_completed per session", () => {
    expect(
      trackOnboardingCompleted({
        account_type: "personal",
        path: "/app/classes/x/attendance",
      }),
    ).toBe(true);
    expect(
      trackOnboardingCompleted({
        account_type: "personal",
        path: "/app",
      }),
    ).toBe(false);
  });
});
