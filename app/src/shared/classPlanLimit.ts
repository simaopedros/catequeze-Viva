/**
 * Client/server-safe helpers for communicating class plan limits.
 * Does not change limit values — only how they are evaluated for UI gates.
 */

/** True when the plan has a finite max and usage is already at or above it. */
export function isClassPlanLimitReached(
  activeCount: number,
  maxClasses: number | null | undefined,
): boolean {
  if (maxClasses == null) return false;
  if (!Number.isFinite(maxClasses) || maxClasses < 0) return false;
  const count = Number.isFinite(activeCount) ? Math.max(0, activeCount) : 0;
  return count >= maxClasses;
}

/**
 * Classes that count toward the plan limit (everything except archived).
 * Do not use this for the "turmas ativas" KPI — use countActiveStatusClasses.
 */
export function countActiveClasses(
  classes: Array<{ status?: string | null }> | null | undefined,
): number {
  if (!classes?.length) return 0;
  return classes.filter((c) => c.status !== "ARCHIVED").length;
}

/** Classes with status ACTIVE only (paused/concluded/draft do not count). */
export function countActiveStatusClasses(
  classes: Array<{ status?: string | null }> | null | undefined,
): number {
  if (!classes?.length) return 0;
  return classes.filter((c) => c.status === "ACTIVE").length;
}
