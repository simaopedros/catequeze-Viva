/**
 * Plan enforcement helpers for checking limits before creating classes,
 * enrolling catechumens, creating parishes, or adding catechists.
 *
 * All limit data is sourced from shared/pricing.ts (single source of truth).
 */
import { HttpError } from "wasp/server";
import {
  getPlanLimits,
  planName,
  LIMIT_LABELS,
  isBillingActive,
  getEffectiveBillingPlan,
  getPersonalPlanId,
  isInstitutionalPlan,
  resolvePlanIdOrFree,
  PLANS,
  type PlanLimits,
} from "../../shared/planLimits";

export type { PlanLimits } from "../../shared/planLimits";

export { isBillingActive, getEffectiveBillingPlan, isInstitutionalPlan };

// ─── Effective billing plan ────────────────────────────────────────────────

interface TenantBillingStub {
  plan: string;
  status: string;
  trialEndsAt: Date | null;
  maxClasses: number | null;
  maxCatechumens: number | null;
  maxCatechists: number | null;
  maxParishes: number | null;
}

// Institutional plans that can act as an "umbrella" license.
const INSTITUTIONAL_PLANS = ['PARISH_ESSENTIAL', 'PARISH_COMPLETE', 'DIOCESE', 'PARISH'];

function isInstPlan(plan: string | null | undefined): boolean {
  return !!plan && INSTITUTIONAL_PLANS.includes(plan.toUpperCase());
}

/**
 * Resolve the institutional umbrella plan inherited from the parish OWNER.
 */
async function resolveOwnerUmbrella(
  context: any,
  ownerId: string,
): Promise<TenantBillingStub | null> {
  const owner = await context.entities.User.findUnique({
    where: { id: ownerId },
    select: { subscriptionStatus: true, subscriptionPlan: true },
  });

  if (
    owner?.subscriptionStatus === 'active' &&
    isInstPlan(owner.subscriptionPlan)
  ) {
    return {
      plan: owner.subscriptionPlan.toUpperCase(),
      status: 'ACTIVE',
      trialEndsAt: null,
      maxClasses: null,
      maxCatechumens: null,
      maxCatechists: null,
      maxParishes: null,
    };
  }

  const ownedBillings = await context.entities.TenantBilling.findMany({
    where: {
      parish: { ownerId, type: { not: 'PERSONAL' } },
      plan: { in: INSTITUTIONAL_PLANS },
    },
    select: {
      plan: true, status: true, trialEndsAt: true,
      maxClasses: true, maxCatechumens: true,
      maxCatechists: true, maxParishes: true,
    },
  });

  for (const billing of ownedBillings) {
    if (isBillingActive(billing)) return billing;
  }

  return null;
}

export async function resolveEffectiveBilling(
  context: any,
  parishId: string,
): Promise<TenantBillingStub | null> {
  const parish = await context.entities.Parish.findUnique({
    where: { id: parishId },
    select: { dioceseId: true, ownerId: true, type: true },
  });

  if (parish?.dioceseId) {
    const dioceseBilling = await context.entities.TenantBilling.findUnique({
      where: { dioceseId: parish.dioceseId },
      select: {
        plan: true, status: true, trialEndsAt: true,
        maxClasses: true, maxCatechumens: true,
        maxCatechists: true, maxParishes: true,
      },
    });

    if (dioceseBilling && isBillingActive(dioceseBilling) && dioceseBilling.plan === 'DIOCESE') {
      return {
        plan: 'DIOCESE',
        status: dioceseBilling.status,
        trialEndsAt: dioceseBilling.trialEndsAt,
        maxClasses: dioceseBilling.maxClasses,
        maxCatechumens: dioceseBilling.maxCatechumens,
        maxCatechists: dioceseBilling.maxCatechists,
        maxParishes: dioceseBilling.maxParishes,
      };
    }
  }

  const parishBilling = await context.entities.TenantBilling.findUnique({
    where: { parishId },
    select: {
      plan: true, status: true, trialEndsAt: true,
      maxClasses: true, maxCatechumens: true,
      maxCatechists: true, maxParishes: true,
    },
  });

  if (parishBilling && isBillingActive(parishBilling)) {
    return parishBilling;
  }

  if (parish && parish.type !== 'PERSONAL' && parish.ownerId) {
    const umbrella = await resolveOwnerUmbrella(context, parish.ownerId);
    if (umbrella) return umbrella;
  }

  return parishBilling;
}

/**
 * Decide the TenantBilling for a NEW institutional parish.
 */
export async function resolveNewParishBilling(
  context: any,
  opts: { dioceseId?: string | null },
): Promise<{ skip: true } | { skip: false; plan: string; status: string; trialEndsAt: Date | null }> {
  if (opts.dioceseId) {
    const dioceseBilling = await context.entities.TenantBilling.findUnique({
      where: { dioceseId: opts.dioceseId },
      select: { plan: true, status: true, trialEndsAt: true },
    });
    if (dioceseBilling && isBillingActive(dioceseBilling) && dioceseBilling.plan === 'DIOCESE') {
      return { skip: true };
    }
  }

  const creatorActive = context.user?.subscriptionStatus === 'active';
  const creatorPlan = (context.user?.subscriptionPlan || '').toLowerCase();
  if (creatorActive && isInstPlan(creatorPlan)) {
    return { skip: false, plan: creatorPlan.toUpperCase(), status: 'ACTIVE', trialEndsAt: null };
  }

  return {
    skip: false,
    plan: 'CATECHIST_FREE',
    status: 'TRIAL',
    trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function requiredPlan(currentPlan: string | null): string {
  const p = resolvePlanIdOrFree(currentPlan);
  if (p === 'catechist_free') return 'Catequista Pro';
  if (p === 'catechist_pro') return 'Catequista IA';
  if (p === 'parish_essential') return 'Paróquia Completa';
  return 'Diocese';
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

// ─── Catechist count ──────────────────────────────────────────────────────

export async function assertCanAddCatechist(
  context: any,
  parishId: string,
): Promise<void> {
  const parish = await context.entities.Parish.findUnique({
    where: { id: parishId },
    select: { type: true },
  });

  if (parish?.type === 'PERSONAL') {
    // Personal workspace: max 1 catechist (the owner)
    const count = await context.entities.Membership.count({
      where: {
        parishId,
        status: 'ACTIVE',
        role: { in: ['LEAD_CATECHIST', 'ASSISTANT_CATECHIST', 'PARISH_COORDINATOR'] },
      },
    });
    if (count >= 1) {
      throw new HttpError(403, 'Plano pessoal permite apenas 1 catequista. Faça upgrade para um plano institucional.');
    }
    return;
  }

  const billing = await resolveEffectiveBilling(context, parishId);
  const effectivePlan = getEffectiveBillingPlan(billing);
  const planId = resolvePlanIdOrFree(effectivePlan);
  const planLimits = PLANS[planId].limits;

  const maxCatechists = billing?.maxCatechists != null ? billing.maxCatechists : planLimits.maxCatechists;
  if (maxCatechists === null) return;

  const currentCount = await context.entities.Membership.count({
    where: {
      parishId,
      status: 'ACTIVE',
      role: { in: ['LEAD_CATECHIST', 'ASSISTANT_CATECHIST', 'PARISH_COORDINATOR'] },
    },
  });

  if (currentCount >= maxCatechists) {
    throw new HttpError(
      403,
      buildLimitMessage('catechist_limit', effectivePlan, currentCount, maxCatechists),
    );
  }
}

// ─── Parish creation ────────────────────────────────────────────────────────

export async function assertCanCreateParish(
  context: any,
  opts?: { dioceseId?: string | null },
): Promise<void> {
  if (!context.user) throw new HttpError(401);

  const coverage = await resolveNewParishBilling(context, { dioceseId: opts?.dioceseId ?? null });
  if (coverage.skip || isInstPlan(coverage.plan)) return;

  const subscriptionActive = context.user.subscriptionStatus === 'active';
  const plan = subscriptionActive
    ? context.user.subscriptionPlan || 'catechist_free'
    : 'catechist_free';

  const limits = getPlanLimits(plan);
  if (limits.maxParishes === null) return;

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

export async function assertCanCreateClass(
  context: any,
  parishId: string,
): Promise<void> {
  const parish = await context.entities.Parish.findUnique({
    where: { id: parishId },
    select: { type: true, ownerId: true },
  });

  if (parish?.type === 'PERSONAL') {
    const plan = getPersonalPlanId(context.user);
    const limits = getPlanLimits(plan);
    if (limits.maxClasses === null) return;

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

  const billing = await resolveEffectiveBilling(context, parishId);
  const effectivePlan = getEffectiveBillingPlan(billing);
  const planLimits = getPlanLimits(effectivePlan);

  const maxClasses = billing?.maxClasses != null ? billing.maxClasses : planLimits.maxClasses;
  if (maxClasses === null) return;

  let activeCount: number;
  if (!billing && (effectivePlan === 'CATECHIST_FREE' || effectivePlan === 'CATECHIST_PRO')) {
    const myClassLinks = await context.entities.ClassCatechist.findMany({
      where: { userId: context.user.id },
      select: { classId: true },
    });
    const myClassIds = myClassLinks.map((l: any) => l.classId);
    activeCount = await context.entities.CatechesisClass.count({
      where: { id: { in: myClassIds }, status: { not: 'ARCHIVED' } },
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

export async function assertCanEnrollCatechumen(
  context: any,
  parishId: string,
): Promise<void> {
  const parish = await context.entities.Parish.findUnique({
    where: { id: parishId },
    select: { type: true },
  });

  if (parish?.type === 'PERSONAL') {
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

  const maxCatechumens = billing?.maxCatechumens != null ? billing.maxCatechumens : planLimits.maxCatechumens;
  if (maxCatechumens === null) return;

  let enrolledCount: number;
  if (!billing && (effectivePlan === 'CATECHIST_FREE' || effectivePlan === 'CATECHIST_PRO')) {
    const myClassLinks = await context.entities.ClassCatechist.findMany({
      where: { userId: context.user.id },
      select: { classId: true },
    });
    const myClassIds = myClassLinks.map((l: any) => l.classId);
    enrolledCount = await context.entities.ClassEnrollment.count({
      where: { status: 'ENROLLED', classId: { in: myClassIds } },
    });
  } else {
    enrolledCount = await context.entities.ClassEnrollment.count({
      where: { status: 'ENROLLED', class: { parishId } },
    });
  }

  if (enrolledCount >= maxCatechumens) {
    throw new HttpError(
      403,
      buildLimitMessage('catechumen_limit', effectivePlan, enrolledCount, maxCatechumens),
    );
  }
}
