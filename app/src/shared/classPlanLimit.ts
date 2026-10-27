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

/** Active (non-archived) classes from a list payload. */
export function countActiveClasses(
  classes: Array<{ status?: string | null }> | null | undefined,
): number {
  if (!classes?.length) return 0;
  return classes.filter((c) => c.status !== "ARCHIVED").length;
}
