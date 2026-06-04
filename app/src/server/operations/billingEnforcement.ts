/**
 * Plan enforcement helpers for checking limits before creating classes,
 * enrolling catechumens, or creating parishes.
 */
import { HttpError } from "wasp/server";
import { getPlanLimits, PLAN_LIMITS, planName, LIMIT_LABELS } from "../../shared/planLimits";

export type { PlanLimits } from "../../shared/planLimits";

// ─── Effective billing plan ────────────────────────────────────────────────

interface TenantBillingStub {
  plan: string;
  status: string;
  trialEndsAt: Date | null;
  maxClasses: number | null;
  maxCatechumens: number | null;
}

/**
 * Determine the effective plan for a parish based on billing status.
 * Expired trials and canceled subscriptions fall back to CATECHIST_FREE.
 */
export function getEffectiveBillingPlan(billing: TenantBillingStub | null): string {
  if (!billing) return 'CATECHIST_FREE';

  const { plan, status, trialEndsAt } = billing;

  if (status === 'CANCELED') return 'CATECHIST_FREE';
  if (status === 'TRIAL' && trialEndsAt && new Date(trialEndsAt) < new Date()) {
    return 'CATECHIST_FREE';
  }

  return plan || 'CATECHIST_FREE';
}

/**
 * Check whether a parish has a currently-active billing status.
 * Active means ACTIVE or TRIAL (not yet expired).
 */
export function isBillingActive(billing: TenantBillingStub | null): boolean {
  if (!billing) return false;
  if (billing.status === 'ACTIVE') return true;
  if (billing.status === 'TRIAL' && billing.trialEndsAt && new Date(billing.trialEndsAt) >= new Date()) {
    return true;
  }
  return false;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function requiredPlan(currentPlan: string | null): string {
  const p = (currentPlan || 'catechist_free').toLowerCase();
  if (p === 'catechist_free') return 'Catequista Pro';
  return 'Paróquia';
}

function buildLimitMessage(
  type: string,
  plan: string | null,
  current: number,
  max: number,
): string {
  const label = LIMIT_LABELS[type] || type;
  const currentPlanName = planName(plan);
  const upgradePlan = requiredPlan(plan);
  return `Limite de ${label}s do plano ${currentPlanName} atingido (${current}/${max}). Faça upgrade para ${upgradePlan}.`;
}

// ─── Parish creation ────────────────────────────────────────────────────────

/**
 * Check if creating a new parish would exceed the plan limit.
 * If the user's subscription is not active, forces free-plan limits.
 */
export async function assertCanCreateParish(context: any): Promise<void> {
  if (!context.user) throw new HttpError(401);

  const subscriptionActive = context.user.subscriptionStatus === 'active';
  const plan = subscriptionActive
    ? context.user.subscriptionPlan || 'catechist_free'
    : 'catechist_free';

  const limits = getPlanLimits(plan);

  if (limits.maxParishes === null) return;

  const ownedParishes = await context.entities.Parish.count({
    where: { ownerId: context.user.id },
  });

  if (ownedParishes >= limits.maxParishes) {
    throw new HttpError(
      403,
      buildLimitMessage('parish_limit', plan, ownedParishes, limits.maxParishes),
    );
  }
}

// ─── Class creation ─────────────────────────────────────────────────────────

/**
 * Check if creating a new class would exceed the plan limit.
 * Reads TenantBilling, validates status/trial, and falls back to
 * PLAN_LIMITS when custom limits are null.
 */
export async function assertCanCreateClass(
  context: any,
  parishId: string,
): Promise<void> {
  const billing = await context.entities.TenantBilling.findUnique({
    where: { parishId },
    select: { plan: true, status: true, trialEndsAt: true, maxClasses: true },
  });

  const effectivePlan = getEffectiveBillingPlan(billing);
  const planLimits = getPlanLimits(effectivePlan);

  // Use custom override if set, otherwise fall back to plan defaults
  const maxClasses =
    billing?.maxClasses != null ? billing.maxClasses : planLimits.maxClasses;

  if (maxClasses === null) return; // unlimited

  const isIndividualPlan =
    effectivePlan === 'CATECHIST_FREE' || effectivePlan === 'CATECHIST_PRO';

  let activeCount: number;
  if (isIndividualPlan && !billing) {
    const myClassLinks = await context.entities.ClassCatechist.findMany({
      where: { userId: context.user.id },
      select: { classId: true },
    });
    const myClassIds = myClassLinks.map((l: any) => l.classId);
    activeCount = await context.entities.CatechesisClass.count({
      where: {
        id: { in: myClassIds },
        status: { not: 'ARCHIVED' },
      },
    });
  } else {
    activeCount = await context.entities.CatechesisClass.count({
      where: { parishId, status: { not: 'ARCHIVED' } },
    });
  }

  if (activeCount >= maxClasses) {
    throw new HttpError(
      403,
      buildLimitMessage('class_limit', effectivePlan, activeCount, maxClasses),
    );
  }
}

// ─── Catechumen enrollment ──────────────────────────────────────────────────

/**
 * Check if enrolling a new catechumen would exceed the plan limit.
 */
export async function assertCanEnrollCatechumen(
  context: any,
  parishId: string,
): Promise<void> {
  const billing = await context.entities.TenantBilling.findUnique({
    where: { parishId },
    select: { plan: true, status: true, trialEndsAt: true, maxCatechumens: true },
  });

  const effectivePlan = getEffectiveBillingPlan(billing);
  const planLimits = getPlanLimits(effectivePlan);

  // Use custom override if set, otherwise fall back to plan defaults
  const maxCatechumens =
    billing?.maxCatechumens != null ? billing.maxCatechumens : planLimits.maxCatechumens;

  if (maxCatechumens === null) return; // unlimited

  const isIndividualPlan =
    effectivePlan === 'CATECHIST_FREE' || effectivePlan === 'CATECHIST_PRO';

  let enrolledCount: number;
  if (isIndividualPlan && !billing) {
    const myClassLinks = await context.entities.ClassCatechist.findMany({
      where: { userId: context.user.id },
      select: { classId: true },
    });
    const myClassIds = myClassLinks.map((l: any) => l.classId);
    enrolledCount = await context.entities.ClassEnrollment.count({
      where: {
        status: 'ENROLLED',
        classId: { in: myClassIds },
      },
    });
  } else {
    enrolledCount = await context.entities.ClassEnrollment.count({
      where: {
        status: 'ENROLLED',
        class: { parishId },
      },
    });
  }

  if (enrolledCount >= maxCatechumens) {
    throw new HttpError(
      403,
      buildLimitMessage('catechumen_limit', effectivePlan, enrolledCount, maxCatechumens),
    );
  }
}
