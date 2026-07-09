/**
 * Carries the plan a visitor selected on the landing/pricing pages across the
 * signup -> onboarding -> billing flow, so the chosen account LEVEL (personal
 * vs institutional) and billing interval (monthly vs annual) are preserved.
 */
const INTENDED_PLAN_KEY = "cv-intended-plan";
const INTENDED_INTERVAL_KEY = "cv-intended-interval";

export type IntendedPlanLevel = "personal" | "institutional";
export type BillingInterval = "monthly" | "annual";

export function setIntendedPlan(planId: string): void {
  try {
    localStorage.setItem(INTENDED_PLAN_KEY, planId);
  } catch {
    /* ignore storage errors (private mode, etc.) */
  }
}

export function getIntendedPlan(): string | null {
  try {
    return localStorage.getItem(INTENDED_PLAN_KEY);
  } catch {
    return null;
  }
}

export function clearIntendedPlan(): void {
  try {
    localStorage.removeItem(INTENDED_PLAN_KEY);
    localStorage.removeItem(INTENDED_INTERVAL_KEY);
  } catch {
    /* ignore */
  }
}

export function setIntendedInterval(interval: BillingInterval): void {
  try {
    localStorage.setItem(INTENDED_INTERVAL_KEY, interval);
  } catch {
    /* ignore */
  }
}

export function getIntendedInterval(): BillingInterval {
  try {
    const v = localStorage.getItem(INTENDED_INTERVAL_KEY);
    return v === "annual" ? "annual" : "monthly";
  } catch {
    return "monthly";
  }
}

export function isInstitutionalPlanId(
  planId: string | null | undefined,
): boolean {
  if (!planId) return false;
  // Unlimited is the only institutional plan; legacy ids kept for safety.
  const institutional = [
    "unlimited",
    "parish",
    "parish_essential",
    "parish_complete",
    "diocese",
  ];
  return institutional.includes(planId.toLowerCase());
}

export function planLevel(
  planId: string | null | undefined,
): IntendedPlanLevel {
  return isInstitutionalPlanId(planId) ? "institutional" : "personal";
}
