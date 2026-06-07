/**
 * Plan enforcement helpers for checking limits before creating classes,
 * enrolling catechumens, or creating parishes.
 */
import { HttpError } from "wasp/server";
import {
  getPlanLimits,
  PLAN_LIMITS,
  planName,
  LIMIT_LABELS,
  isBillingActive,
  getEffectiveBillingPlan,
  getPersonalPlanId,
} from "../../shared/planLimits";

export type { PlanLimits } from "../../shared/planLimits";

// Re-export the single source of truth for billing status so existing server
// imports keep working. The implementations live in shared/planLimits.ts and
// are used identically by client and server (consistent PAST_DUE / CANCELED /
// expired-trial handling).
export { isBillingActive, getEffectiveBillingPlan };

// ─── Effective billing plan ────────────────────────────────────────────────

interface TenantBillingStub {
  plan: string;
  status: string;
  trialEndsAt: Date | null;
  maxClasses: number | null;
  maxCatechumens: number | null;
}

// Institutional plans that can act as an "umbrella" license covering multiple
// parishes/communities. Personal plans (free/pro/ai) are intentionally excluded
// so they never leak into institutional workspaces.
const INSTITUTIONAL_PLANS = ['PARISH', 'DIOCESE'];

function isInstitutionalPlan(plan: string | null | undefined): boolean {
  return !!plan && INSTITUTIONAL_PLANS.includes(plan.toUpperCase());
}

/**
 * Resolve the institutional umbrella plan inherited from the parish OWNER.
 * Only applies to institutional plans (PARISH/DIOCESE) — personal plans are
 * ignored so the personal/institutional separation is preserved.
 */
async function resolveOwnerUmbrella(
  context: any,
  ownerId: string,
): Promise<TenantBillingStub | null> {
  // 1. Owner's active institutional subscription (subscriptionPlan)
  const owner = await context.entities.User.findUnique({
    where: { id: ownerId },
    select: { subscriptionStatus: true, subscriptionPlan: true },
  });

  if (
    owner?.subscriptionStatus === 'active' &&
    isInstitutionalPlan(owner.subscriptionPlan)
  ) {
    return {
      plan: owner.subscriptionPlan.toUpperCase(),
      status: 'ACTIVE',
      trialEndsAt: null,
      maxClasses: null,
      maxCatechumens: null,
    };
  }

  // 2. Any other parish owned by the same user with an active institutional plan
  const ownedBillings = await context.entities.TenantBilling.findMany({
    where: {
      parish: { ownerId, type: { not: 'PERSONAL' } },
      plan: { in: INSTITUTIONAL_PLANS },
    },
    select: { plan: true, status: true, trialEndsAt: true, maxClasses: true, maxCatechumens: true },
  });

  for (const billing of ownedBillings) {
    if (isBillingActive(billing)) {
      return billing;
    }
  }

  return null;
}

export async function resolveEffectiveBilling(
  context: any,
  parishId: string,
): Promise<TenantBillingStub | null> {
  // 1. Fetch parish to see if it belongs to a diocese
  const parish = await context.entities.Parish.findUnique({
    where: { id: parishId },
    select: { dioceseId: true, ownerId: true, type: true },
  });

  if (parish?.dioceseId) {
    // 2. Fetch diocese billing
    const dioceseBilling = await context.entities.TenantBilling.findUnique({
      where: { dioceseId: parish.dioceseId },
      select: { plan: true, status: true, trialEndsAt: true, maxClasses: true, maxCatechumens: true },
    });

    // Check if diocese has active DIOCESE plan
    if (dioceseBilling && isBillingActive(dioceseBilling) && dioceseBilling.plan === 'DIOCESE') {
      return {
        plan: 'DIOCESE',
        status: dioceseBilling.status,
        trialEndsAt: dioceseBilling.trialEndsAt,
        maxClasses: dioceseBilling.maxClasses,
        maxCatechumens: dioceseBilling.maxCatechumens,
      };
    }
  }

  // 3. Direct parish billing (when active)
  const parishBilling = await context.entities.TenantBilling.findUnique({
    where: { parishId },
    select: { plan: true, status: true, trialEndsAt: true, maxClasses: true, maxCatechumens: true },
  });

  // Check if direct parish billing is active (ACTIVE or non-expired TRIAL)
  if (parishBilling && isBillingActive(parishBilling)) {
    return parishBilling;
  }

  // 4. Owner umbrella — institutional workspaces only. If the parish has no
  // active billing of its own, inherit the owner's active institutional plan
  // (PARISH/DIOCESE). Personal workspaces never reach this (resolved elsewhere).
  if (parish && parish.type !== 'PERSONAL' && parish.ownerId) {
    const umbrella = await resolveOwnerUmbrella(context, parish.ownerId);
    if (umbrella) return umbrella;
  }

  return parishBilling; // Fallback to parish record (free or expired)
}

/**
 * Decide the TenantBilling to assign to a NEWLY created institutional parish.
 * Enforces the personal/institutional separation: the creator's personal plan
 * (free/pro/ai) never becomes the parish's institutional plan.
 *
 * Returns `skip: true` when the parish is already covered by an active DIOCESE
 * umbrella — in that case no per-parish billing record is created and the
 * diocese inheritance in `resolveEffectiveBilling` governs the limits.
 */
export async function resolveNewParishBilling(
  context: any,
  opts: { dioceseId?: string | null },
): Promise<{ skip: true } | { skip: false; plan: string; status: string; trialEndsAt: Date | null }> {
  // 1. Covered by an active DIOCESE umbrella → rely on inheritance.
  if (opts.dioceseId) {
    const dioceseBilling = await context.entities.TenantBilling.findUnique({
      where: { dioceseId: opts.dioceseId },
      select: { plan: true, status: true, trialEndsAt: true },
    });
    if (dioceseBilling && isBillingActive(dioceseBilling) && dioceseBilling.plan === 'DIOCESE') {
      return { skip: true };
    }
  }

  // 2. Creator owns an active institutional plan (PARISH/DIOCESE) → inherit it.
  const creatorActive = context.user?.subscriptionStatus === 'active';
  const creatorPlan = (context.user?.subscriptionPlan || '').toLowerCase();
  if (creatorActive && (creatorPlan === 'parish' || creatorPlan === 'diocese')) {
    return { skip: false, plan: creatorPlan.toUpperCase(), status: 'ACTIVE', trialEndsAt: null };
  }

  // 3. Independent new parish → free tier (30-day trial flag preserved). The
  // creator's personal paid plan is intentionally NOT applied here.
  return {
    skip: false,
    plan: 'CATECHIST_FREE',
    status: 'TRIAL',
    trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  };
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
export async function assertCanCreateParish(
  context: any,
  opts?: { dioceseId?: string | null },
): Promise<void> {
  if (!context.user) throw new HttpError(401);

  // Institutional coverage takes precedence over the personal-plan limit. If the
  // new parish would be covered by an active DIOCESE license or the owner's own
  // institutional umbrella (PARISH/DIOCESE), the free-plan parish quota does not
  // apply — only truly independent parishes consume it.
  const coverage = await resolveNewParishBilling(context, { dioceseId: opts?.dioceseId ?? null });
  if (coverage.skip || isInstitutionalPlan(coverage.plan)) return;

  const subscriptionActive = context.user.subscriptionStatus === 'active';
  const plan = subscriptionActive
    ? context.user.subscriptionPlan || 'catechist_free'
    : 'catechist_free';

  const limits = getPlanLimits(plan);

  if (limits.maxParishes === null) return;

  // Only count independent parishes (not attached to a diocese and without an
  // institutional TenantBilling) against the personal-plan quota.
  const ownedParishes = await context.entities.Parish.count({
    where: {
      ownerId: context.user.id,
      type: { not: "PERSONAL" },
      dioceseId: null,
      OR: [
        { billing: { is: null } },
        { billing: { plan: { notIn: INSTITUTIONAL_PLANS } } },
      ],
    },
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
 * Reads TenantBilling (with Diocese inheritance), validates status/trial,
 * and falls back to PLAN_LIMITS when custom limits are null.
 */
export async function assertCanCreateClass(
  context: any,
  parishId: string,
): Promise<void> {
  // Check if this is a personal workspace — use user's subscription plan
  const parish = await context.entities.Parish.findUnique({
    where: { id: parishId },
    select: { type: true, ownerId: true },
  });

  if (parish?.type === 'PERSONAL') {
    // Personal workspace: limits come strictly from the user's PERSONAL plan.
    // Institutional plan values (parish/diocese) never apply here.
    const plan = getPersonalPlanId(context.user);
    const limits = getPlanLimits(plan);

    if (limits.maxClasses === null) return; // unlimited

    const activeCount = await context.entities.CatechesisClass.count({
      where: { parishId, status: { not: 'ARCHIVED' } },
    });

    if (activeCount >= limits.maxClasses!) {
      throw new HttpError(
        403,
        `Limite de turmas do plano ${planName(plan)} atingido (${activeCount}/${limits.maxClasses}). Faça upgrade.`,
      );
    }
    return;
  }

  // Parish/diocese workspace: use TenantBilling
  const billing = await resolveEffectiveBilling(context, parishId);

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
  // Check if personal workspace
  const parish = await context.entities.Parish.findUnique({
    where: { id: parishId },
    select: { type: true },
  });

  if (parish?.type === 'PERSONAL') {
    // Personal workspace: limits come strictly from the user's PERSONAL plan.
    const plan = getPersonalPlanId(context.user);
    const limits = getPlanLimits(plan);
    if (limits.maxCatechumens === null) return;

    const enrolledCount = await context.entities.ClassEnrollment.count({
      where: { status: 'ENROLLED', class: { parishId } },
    });

    if (enrolledCount >= limits.maxCatechumens!) {
      throw new HttpError(
        403,
        `Limite de catequizandos do plano ${planName(plan)} atingido (${enrolledCount}/${limits.maxCatechumens}).`,
      );
    }
    return;
  }

  const billing = await resolveEffectiveBilling(context, parishId);

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
