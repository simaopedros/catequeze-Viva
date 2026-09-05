import { describe, expect, it } from "vitest";
import {
  getPostCheckoutDestination,
  isMinimalAppPath,
  isPublicOnlyPath,
  needsFullAppNamespaces,
  shouldHoldOnboardingRedirectOnBilling,
  shouldRenderGatedRoute,
} from "../client/appRouteGates";

describe("needsFullAppNamespaces", () => {
  it("does not wait on the app i18n chunk for the billing paywall", () => {
    expect(needsFullAppNamespaces("/app/billing")).toBe(false);
  });

  it("still loads app namespaces for the rest of /app", () => {
    expect(needsFullAppNamespaces("/app")).toBe(true);
    expect(needsFullAppNamespaces("/app/classes")).toBe(true);
  });

  it("keeps marketing/auth on the core bundle", () => {
    expect(isPublicOnlyPath("/")).toBe(true);
    expect(isPublicOnlyPath("/login")).toBe(true);
    expect(needsFullAppNamespaces("/login")).toBe(false);
  });
});

describe("isMinimalAppPath", () => {
  it("uses onboarding chrome for onboarding and workspace picker", () => {
    expect(isMinimalAppPath("/app/onboarding")).toBe(true);
    expect(isMinimalAppPath("/app/select-workspace")).toBe(true);
  });

  it("uses focused chrome for billing before the user has a workspace", () => {
    expect(
      isMinimalAppPath("/app/billing", {
        needsOnboarding: true,
        contextReady: true,
        hasWorkspace: false,
      }),
    ).toBe(true);
    expect(
      isMinimalAppPath("/app/billing", {
        needsOnboarding: false,
        contextReady: false,
        hasWorkspace: false,
      }),
    ).toBe(true);
  });

  it("keeps the app shell on billing once a workspace exists", () => {
    expect(
      isMinimalAppPath("/app/billing", {
        needsOnboarding: false,
        contextReady: true,
        hasWorkspace: true,
      }),
    ).toBe(false);
  });
});

describe("shouldRenderGatedRoute", () => {
  it("renders billing immediately without waiting for checked", () => {
    expect(
      shouldRenderGatedRoute({
        userLoaded: true,
        alwaysAccessible: true,
        hasAccess: false,
        isBillingManager: true,
        checked: false,
      }),
    ).toBe(true);
  });

  it("hides gated app routes until the redirect effect runs", () => {
    expect(
      shouldRenderGatedRoute({
        userLoaded: true,
        alwaysAccessible: false,
        hasAccess: false,
        isBillingManager: true,
        checked: false,
      }),
    ).toBe(false);
  });

  it("renders the app once access is confirmed", () => {
    expect(
      shouldRenderGatedRoute({
        userLoaded: true,
        alwaysAccessible: false,
        hasAccess: true,
        isBillingManager: true,
        checked: true,
      }),
    ).toBe(true);
  });
});

describe("getPostCheckoutDestination", () => {
  it("sends new accounts to onboarding after Checkout", () => {
    expect(
      getPostCheckoutDestination({
        needsOnboarding: true,
        sessionId: "cs_test_1",
      }),
    ).toBe("/app/onboarding?checkout=success&session_id=cs_test_1");
  });

  it("sends existing workspaces to billing after Checkout", () => {
    expect(
      getPostCheckoutDestination({
        needsOnboarding: false,
        sessionId: "cs_test_1",
      }),
    ).toBe("/app/billing?status=success&session_id=cs_test_1");
  });

  it("works without a session id", () => {
    expect(getPostCheckoutDestination({ needsOnboarding: true })).toBe(
      "/app/onboarding?checkout=success",
    );
    expect(getPostCheckoutDestination({ needsOnboarding: false })).toBe(
      "/app/billing?status=success",
    );
  });
});

describe("shouldHoldOnboardingRedirectOnBilling", () => {
  it("keeps unpaid users on the billing paywall", () => {
    expect(
      shouldHoldOnboardingRedirectOnBilling({
        pathname: "/app/billing",
        search: "?plan=single&reason=required",
        hasPersonalAccess: false,
        isOnProductTrial: false,
      }),
    ).toBe(true);
  });

  it("does not trap Checkout success on billing", () => {
    expect(
      shouldHoldOnboardingRedirectOnBilling({
        pathname: "/app/billing",
        search: "?status=success&session_id=cs_test_1",
        hasPersonalAccess: false,
        isOnProductTrial: false,
      }),
    ).toBe(false);
  });

  it("sends paid or trialing users off billing into onboarding", () => {
    expect(
      shouldHoldOnboardingRedirectOnBilling({
        pathname: "/app/billing",
        hasPersonalAccess: true,
        isOnProductTrial: false,
      }),
    ).toBe(false);
    expect(
      shouldHoldOnboardingRedirectOnBilling({
        pathname: "/app/billing",
        hasPersonalAccess: false,
        isOnProductTrial: true,
      }),
    ).toBe(false);
  });

  it("does not hold non-billing routes", () => {
    expect(
      shouldHoldOnboardingRedirectOnBilling({
        pathname: "/app",
        hasPersonalAccess: false,
        isOnProductTrial: false,
      }),
    ).toBe(false);
  });
});
