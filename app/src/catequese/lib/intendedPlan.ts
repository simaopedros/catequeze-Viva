/**
 * Carries the plan a visitor selected on the landing/pricing pages across the
 * signup -> onboarding -> billing flow, so the chosen account LEVEL (personal
 * vs institutional) is preserved and the right checkout can be pre-selected.
 */
const INTENDED_PLAN_KEY = 'cv-intended-plan';

export type IntendedPlanLevel = 'personal' | 'institutional';

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
  } catch {
    /* ignore */
  }
}

export function isInstitutionalPlanId(planId: string | null | undefined): boolean {
  return planId === 'parish' || planId === 'diocese';
}

export function planLevel(planId: string | null | undefined): IntendedPlanLevel {
  return isInstitutionalPlanId(planId) ? 'institutional' : 'personal';
}
