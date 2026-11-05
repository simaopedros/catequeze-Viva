/**
 * Product AI surfaces (hub, sidebar, widgets, editorial credits).
 * Independent from LAUNCH_CATEQUISTA_ONLY (pricing / unlimited),
 * but both stay off during the catequista-only launch.
 *
 * The switch lives in HIDDEN_FEATURES.ai (src/shared/hiddenFeatures.ts).
 * Re-enable there and point /app/ai-hub back to AIHubPage in main.wasp.
 */
import { HIDDEN_FEATURES } from "./hiddenFeatures";

export const AI_FEATURES_ENABLED = !HIDDEN_FEATURES.ai;

export const AI_APP_HOME = "/app";

export const AI_APP_PATHS = [
  "/app/ai-hub",
  "/app/ai-planner",
  "/app/collaborative-planner",
  "/app/my-ai-generations",
] as const;

export function isAiAppPath(pathname: string): boolean {
  const path = pathname.split("?")[0];
  return AI_APP_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
}

export function shouldShowAiNavItem(item: {
  to: string;
  iconKey: string;
}): boolean {
  if (AI_FEATURES_ENABLED) return true;
  if (item.iconKey === "ai_hub") return false;
  return !isAiAppPath(item.to);
}
