/**
 * Product AI surfaces (hub, sidebar, widgets, editorial credits).
 * Independent from LAUNCH_CATEQUISTA_ONLY (pricing / unlimited),
 * but both stay off during the catequista-only launch.
 *
 * Re-enable by setting this to true and pointing /app/ai-hub back to AIHubPage.
 */
export const AI_FEATURES_ENABLED = false;

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
