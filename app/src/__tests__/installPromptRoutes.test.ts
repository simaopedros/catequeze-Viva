import { describe, expect, it } from "vitest";
import { shouldOfferInstallOnPath } from "../client/installPromptRoutes";

describe("shouldOfferInstallOnPath", () => {
  it("offers install inside the app", () => {
    expect(shouldOfferInstallOnPath("/app")).toBe(true);
    expect(shouldOfferInstallOnPath("/app/classes/1")).toBe(true);
  });

  it("hides on public, auth, onboarding and billing screens", () => {
    for (const path of [
      "/",
      "/login",
      "/signup",
      "/apply",
      "/application",
      "/app/onboarding",
      "/app/onboarding/class",
      "/app/billing",
    ]) {
      expect(shouldOfferInstallOnPath(path)).toBe(false);
    }
  });
});
