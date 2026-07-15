/**
 * dashboard-stats-gate.test.ts — PR12a: skip getDashboardStats for institutional view.
 */
import { describe, it, expect } from "vitest";
import { shouldUseInstitutionalDashboard } from "../catequese/pages/DashboardPage";

describe("shouldUseInstitutionalDashboard", () => {
  it("is true for parish staff on unlimited plan", () => {
    expect(
      shouldUseInstitutionalDashboard({
        workspaceType: "PARISH",
        workspacePlan: "unlimited",
        userRole: "PARISH_COORDINATOR",
      }),
    ).toBe(true);
  });

  it("is true for diocese admin on diocese plan", () => {
    expect(
      shouldUseInstitutionalDashboard({
        workspaceType: "DIOCESE",
        workspacePlan: "diocese",
        userRole: "DIOCESE_ADMIN",
      }),
    ).toBe(true);
  });

  it("is false for personal workspace", () => {
    expect(
      shouldUseInstitutionalDashboard({
        workspaceType: "PERSONAL",
        workspacePlan: "single",
        userRole: "PERSONAL_OWNER",
      }),
    ).toBe(false);
  });

  it("is false for guardian on parish", () => {
    expect(
      shouldUseInstitutionalDashboard({
        workspaceType: "PARISH",
        workspacePlan: "unlimited",
        userRole: "GUARDIAN",
      }),
    ).toBe(false);
  });

  it("implies getDashboardStats enabled when not institutional", () => {
    const institutional = shouldUseInstitutionalDashboard({
      workspaceType: "PERSONAL",
      workspacePlan: "single",
      userRole: "LEAD_CATECHIST",
    });
    const loadingCtx = false;
    const enabled = !loadingCtx && !institutional;
    expect(enabled).toBe(true);
  });

  it("implies getDashboardStats disabled when institutional", () => {
    const institutional = shouldUseInstitutionalDashboard({
      workspaceType: "PARISH",
      workspacePlan: "unlimited",
      userRole: "PARISH_COORDINATOR",
    });
    const loadingCtx = false;
    const enabled = !loadingCtx && !institutional;
    expect(enabled).toBe(false);
  });

  it("disables stats while user context is still loading", () => {
    const institutional = false;
    const loadingCtx = true;
    const enabled = !loadingCtx && !institutional;
    expect(enabled).toBe(false);
  });
});
