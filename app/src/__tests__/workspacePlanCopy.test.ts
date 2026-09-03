import { describe, expect, it } from "vitest";
import { formatEffectivePlanCopy } from "../shared/workspaceIdentity";
import { describeEffectivePlan } from "../shared/workspaceIdentity";

const t = (key: string, opts?: Record<string, string>) =>
  opts?.name ? `${key}:${opts.name}` : key;

describe("formatEffectivePlanCopy", () => {
  it("hides subscribe/plan copy for collaborators on a parish trial", () => {
    const presentation = describeEffectivePlan({
      parishType: "PARISH",
      parishPlan: "single",
      billingStatus: "TRIAL",
    });
    expect(formatEffectivePlanCopy(presentation, t)).toBe("plan.parish_trial");
    expect(
      formatEffectivePlanCopy(presentation, t, {
        hidePlanDetails: true,
        kind: "PARISH",
      }),
    ).toBe("plan.managed_by_coordination");
  });

  it("names the diocese without the license SKU for collaborators", () => {
    const presentation = describeEffectivePlan({
      parishType: "PARISH",
      parishPlan: "unlimited",
      planInherited: true,
      dioceseName: "Diocese de Teste",
    });
    expect(
      formatEffectivePlanCopy(presentation, t, {
        hidePlanDetails: true,
        kind: "PARISH",
      }),
    ).toBe("plan.managed_by_named:Diocese de Teste");
  });

  it("points personal-space guests to the owner, not the guest plan", () => {
    const presentation = describeEffectivePlan({
      parishType: "PERSONAL",
      personalPlan: "single",
    });
    expect(
      formatEffectivePlanCopy(presentation, t, {
        hidePlanDetails: true,
        kind: "PERSONAL",
      }),
    ).toBe("plan.managed_by_owner");
  });
});
