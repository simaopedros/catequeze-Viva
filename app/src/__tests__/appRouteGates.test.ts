import { describe, expect, it } from "vitest";
import {
  isMinimalAppPath,
  isPublicOnlyPath,
  needsFullAppNamespaces,
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
