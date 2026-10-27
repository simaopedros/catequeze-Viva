import { describe, expect, it } from "vitest";
import {
  countActiveClasses,
  isClassPlanLimitReached,
} from "../shared/classPlanLimit";

describe("isClassPlanLimitReached", () => {
  it("is false when the plan has unlimited classes", () => {
    expect(isClassPlanLimitReached(99, null)).toBe(false);
    expect(isClassPlanLimitReached(0, undefined)).toBe(false);
  });

  it("treats max 0 as already reached (free sentinel)", () => {
    expect(isClassPlanLimitReached(0, 0)).toBe(true);
    expect(isClassPlanLimitReached(1, 0)).toBe(true);
  });

  it("is true at or above the capped plan limit", () => {
    expect(isClassPlanLimitReached(2, 3)).toBe(false);
    expect(isClassPlanLimitReached(3, 3)).toBe(true);
    expect(isClassPlanLimitReached(4, 3)).toBe(true);
  });

  it("ignores invalid max values", () => {
    expect(isClassPlanLimitReached(1, Number.NaN)).toBe(false);
    expect(isClassPlanLimitReached(1, -1)).toBe(false);
  });
});

describe("countActiveClasses", () => {
  it("counts non-archived classes only", () => {
    expect(
      countActiveClasses([
        { status: "ACTIVE" },
        { status: "DRAFT" },
        { status: "ARCHIVED" },
        { status: "PAUSED" },
      ]),
    ).toBe(3);
  });

  it("handles empty input", () => {
    expect(countActiveClasses([])).toBe(0);
    expect(countActiveClasses(null)).toBe(0);
    expect(countActiveClasses(undefined)).toBe(0);
  });
});
