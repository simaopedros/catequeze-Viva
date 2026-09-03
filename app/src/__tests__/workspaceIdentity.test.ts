import { describe, expect, it } from "vitest";
import {
  describeEffectivePlan,
  isInstitutionalCoverPlan,
  workspaceKindFromParishType,
} from "../shared/workspaceIdentity";

describe("workspaceIdentity", () => {
  it("maps parish types to workspace kinds", () => {
    expect(workspaceKindFromParishType("PERSONAL")).toBe("PERSONAL");
    expect(workspaceKindFromParishType("PARISH")).toBe("PARISH");
    expect(workspaceKindFromParishType("DIOCESE")).toBe("DIOCESE");
    expect(workspaceKindFromParishType("COMMUNITY")).toBe("COMMUNITY");
    expect(workspaceKindFromParishType(null)).toBe("PARISH");
  });

  it("treats unlimited and legacy parish/diocese keys as institutional cover", () => {
    expect(isInstitutionalCoverPlan("unlimited")).toBe(true);
    expect(isInstitutionalCoverPlan("parish")).toBe(true);
    expect(isInstitutionalCoverPlan("diocese")).toBe(true);
    expect(isInstitutionalCoverPlan("single")).toBe(false);
    expect(isInstitutionalCoverPlan(null)).toBe(false);
  });

  it("presents diocese cover when plan is inherited", () => {
    const result = describeEffectivePlan({
      parishType: "PARISH",
      parishPlan: "unlimited",
      planInherited: true,
      dioceseName: "Diocese de Teste",
      personalPlan: "single",
    });
    expect(result.source).toBe("diocese");
    expect(result.inherited).toBe(true);
    expect(result.dioceseName).toBe("Diocese de Teste");
  });

  it("presents personal plan on a personal workspace", () => {
    const result = describeEffectivePlan({
      parishType: "PERSONAL",
      parishPlan: null,
      personalPlan: "single",
    });
    expect(result.source).toBe("personal");
    expect(result.planKey).toBe("single");
  });

  it("presents parish license when the workspace has its own unlimited plan", () => {
    const result = describeEffectivePlan({
      parishType: "PARISH",
      parishPlan: "unlimited",
      planInherited: false,
    });
    expect(result.source).toBe("parish");
    expect(result.inherited).toBe(false);
  });
});
