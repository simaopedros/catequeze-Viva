import { describe, expect, it } from "vitest";
import {
  AI_APP_HOME,
  AI_APP_PATHS,
  AI_FEATURES_ENABLED,
  isAiAppPath,
  shouldShowAiNavItem,
} from "../shared/aiFeatures";
import { getVisibleNavigation, NAV_GROUPS } from "../shared/navigation";

describe("aiFeatures launch-phase contract", () => {
  it("keeps AI product surfaces off during catequista-only launch", () => {
    expect(AI_FEATURES_ENABLED).toBe(false);
    expect(AI_APP_HOME).toBe("/app");
    expect(AI_APP_PATHS).toContain("/app/ai-hub");
    expect(AI_APP_PATHS).toContain("/app/ai-planner");
    expect(AI_APP_PATHS).toContain("/app/collaborative-planner");
    expect(AI_APP_PATHS).toContain("/app/my-ai-generations");
  });

  it("recognizes AI hub and sibling paths, including query strings", () => {
    expect(isAiAppPath("/app/ai-hub")).toBe(true);
    expect(isAiAppPath("/app/ai-hub?mode=create-meeting")).toBe(true);
    expect(isAiAppPath("/app/ai-planner")).toBe(true);
    expect(isAiAppPath("/app/content-library")).toBe(false);
    expect(isAiAppPath("/app")).toBe(false);
  });

  it("omits the sidebar AI item from NAV_GROUPS while the flag is off", () => {
    const item = NAV_GROUPS.flatMap((g) => g.items).find(
      (i) => i.iconKey === "ai_hub",
    );
    if (AI_FEATURES_ENABLED) {
      expect(item).toBeDefined();
      expect(shouldShowAiNavItem(item!)).toBe(true);
    } else {
      expect(item).toBeUndefined();
      expect(
        shouldShowAiNavItem({ to: "/app/ai-hub", iconKey: "ai_hub" }),
      ).toBe(false);
    }
  });

  it("catequista nav never lists AI Hub, credits, or editorial assistance when off", () => {
    const nav = getVisibleNavigation({
      role: "LEAD_CATECHIST",
      isAdmin: false,
      workspaceType: "PARISH",
    });
    const labelsAndPaths = [
      ...nav.all.map((i) => i.to),
      ...nav.all.map((i) => i.labelKey),
      ...nav.all.map((i) => i.iconKey),
    ];
    expect(labelsAndPaths).not.toContain("/app/ai-hub");
    expect(labelsAndPaths).not.toContain("ai_hub");
  });
});
