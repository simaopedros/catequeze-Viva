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
  isSubscriptionActiveLike,
  isProductTrialStatus,
  isProductTrialWindowOpen,
  PRODUCT_TRIAL_PLAN_ID,
  type PlanLimits,
} from "../../shared/planLimits";
import { loadPlanCatalog } from "../pricing/planCatalogService";
import { PRISMA_INSTITUTIONAL_PLANS } from "../../shared/pricing";
import {
  DIOCESE_QUOTA_PARISH_TYPES,
  dioceseDealBlockedNewParishMessage,
  dioceseParishQuotaMessage,
  isDioceseDealCovering,
  isDioceseUmbrellaPlan,
  isManualDioceseDeal,
  parishQuotaReached,
  toDioceseDealPublicSummary,
  type DioceseDealPublicSummary,
} from "../../shared/dioceseDeal";

export type { PlanLimits } from "../../shared/planLimits";

export { isBillingActive, getEffectiveBillingPlan, isInstitutionalPlan };
export { isDioceseUmbrellaPlan, isDioceseDealCovering };

// ─── Effective billing plan ────────────────────────────────────────────────

interface TenantBillingStub {
  plan: string;
  status: string;
  trialEndsAt: Date | null;
  maxClasses: number | null;
  maxCatechumens: number | null;
  maxCatechists: number | null;
  maxParishes: number | null;
  manualDeal?: boolean | null;
  processor?: string | null;
  startsAt?: Date | null;
  endsAt?: Date | null;
}

const DIOCESE_BILLING_SELECT = {
  plan: true,
  status: true,
  trialEndsAt: true,
  maxClasses: true,
  maxCatechumens: true,
  maxCatechists: true,
  maxParishes: true,
  manualDeal: true,
  processor: true,
  startsAt: true,
  endsAt: true,
} as const;

// Institutional plans that can act as an "umbrella" license.
// Includes lowercase slugs after the TenantBilling.plan string migration
// plus legacy uppercase/alias values so pre-migration rows still match.
const INSTITUTIONAL_PLANS = [...PRISMA_INSTITUTIONAL_PLANS];

function isInstPlan(plan: string | null | undefined): boolean {
  return isInstitutionalPlan(plan);
}

async function catalogLimits(context: any, plan: string | null | undefined) {
  const snapshot = await loadPlanCatalog(context);
  return getPlanLimits(plan, snapshot.bySlug);
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
    isSubscriptionActiveLike(owner?.subscriptionStatus) &&
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

// Per-request memo (keyed by the operation context) — several enforcement
// checks in one request resolve the same parish billing repeatedly.
const billingRequestCache = new WeakMap<object, Map<string, Promise<TenantBillingStub | null>>>();

export async function resolveEffectiveBilling(
  context: any,
  parishId: string,
): Promise<TenantBillingStub | null> {
  const cacheKey = context?.entities;
  if (!cacheKey || typeof cacheKey !== 'object') {
    return resolveEffectiveBillingUncached(context, parishId);
  }
  let perRequest = billingRequestCache.get(cacheKey);
  if (!perRequest) {
    perRequest = new Map();
    billingRequestCache.set(cacheKey, perRequest);
  }
  const hit = perRequest.get(parishId);
  if (hit) return hit;
  const pending = resolveEffectiveBillingUncached(context, parishId).catch((err) => {
    perRequest!.delete(parishId);
    throw err;
  });
  perRequest.set(parishId, pending);
  return pending;
}

async function resolveEffectiveBillingUncached(
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
      select: DIOCESE_BILLING_SELECT,
    });

    if (dioceseBilling && isDioceseDealCovering(dioceseBilling)) {
      return {
        plan: dioceseBilling.plan,
        status: dioceseBilling.status,
        trialEndsAt: dioceseBilling.trialEndsAt,
        maxClasses: dioceseBilling.maxClasses,
        maxCatechumens: dioceseBilling.maxCatechumens,
        maxCatechists: dioceseBilling.maxCatechists,
        maxParishes: dioceseBilling.maxParishes,
        manualDeal: dioceseBilling.manualDeal,
        processor: dioceseBilling.processor,
        startsAt: dioceseBilling.startsAt,
        endsAt: dioceseBilling.endsAt,
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

/** Batch version: resolves effective billing for multiple parishes in bulk. */
export async function resolveAllEffectiveBilling(
  context: any,
  parishIds: string[],
): Promise<Map<string, TenantBillingStub | null>> {
  const result = new Map<string, TenantBillingStub | null>();
  if (parishIds.length === 0) return result;

  // Fetch all parishes
  const parishes = await context.entities.Parish.findMany({
    where: { id: { in: parishIds } },
    select: { id: true, dioceseId: true, ownerId: true, type: true },
  });

  const dioceseIds = [...new Set(parishes.map((p: any) => p.dioceseId).filter(Boolean))];
  const ownerIds = [...new Set(parishes
    .filter((p: any) => p.type !== 'PERSONAL')
    .map((p: any) => p.ownerId)
    .filter(Boolean))];

  // Batch fetch billings + owner subscriptions + owner institutional billings
  const [dioceseBillings, parishBillings, owners, ownerInstitutionalBillings] = await Promise.all([
    dioceseIds.length > 0
      ? context.entities.TenantBilling.findMany({
          where: { dioceseId: { in: dioceseIds } },
          select: { dioceseId: true, ...DIOCESE_BILLING_SELECT },
        })
      : [],
    context.entities.TenantBilling.findMany({
      where: { parishId: { in: parishIds } },
      select: { parishId: true, plan: true, status: true, trialEndsAt: true, maxClasses: true, maxCatechumens: true, maxCatechists: true, maxParishes: true },
    }),
    ownerIds.length > 0
      ? context.entities.User.findMany({
          where: { id: { in: ownerIds } },
          select: { id: true, subscriptionStatus: true, subscriptionPlan: true },
        })
      : [],
    ownerIds.length > 0
      ? context.entities.TenantBilling.findMany({
          where: { parish: { ownerId: { in: ownerIds }, type: { not: 'PERSONAL' } } },
          select: { plan: true, status: true, trialEndsAt: true, maxClasses: true, maxCatechumens: true, maxCatechists: true, maxParishes: true },
        })
      : [],
  ]);

  // Index for fast lookup
  const dioceseBillingMap = new Map<string, any>(dioceseBillings.map((b: any) => [b.dioceseId, b]));
  const parishBillingMap = new Map<string, any>(parishBillings.map((b: any) => [b.parishId, b]));
  const ownerMap = new Map<string, any>(owners.map((o: any) => [o.id, o]));

  for (const parish of parishes as any[]) {
    // 1. Diocese umbrella
    if (parish.dioceseId && dioceseBillingMap.has(parish.dioceseId)) {
      const db: any = dioceseBillingMap.get(parish.dioceseId);
      if (isDioceseDealCovering(db)) {
        result.set(parish.id, {
          plan: db.plan as any,
          status: db.status,
          trialEndsAt: db.trialEndsAt,
          maxClasses: db.maxClasses,
          maxCatechumens: db.maxCatechumens,
          maxCatechists: db.maxCatechists,
          maxParishes: db.maxParishes,
          manualDeal: db.manualDeal,
          processor: db.processor,
          startsAt: db.startsAt,
          endsAt: db.endsAt,
        });
        continue;
      }
    }

    // 2. Parish own billing
    const pb: any = parishBillingMap.get(parish.id);
    if (pb && isBillingActive(pb)) {
      result.set(parish.id, pb);
      continue;
    }

    // 3. Owner umbrella (only for institutional parishes)
    if (parish.type !== 'PERSONAL' && parish.ownerId) {
      const owner = ownerMap.get(parish.ownerId);
      if (owner?.subscriptionStatus && isSubscriptionActiveLike(owner.subscriptionStatus) && isInstPlan(owner.subscriptionPlan)) {
        result.set(parish.id, {
          plan: owner.subscriptionPlan.toUpperCase(),
          status: 'ACTIVE',
          trialEndsAt: null,
          maxClasses: null,
          maxCatechumens: null,
          maxCatechists: null,
          maxParishes: null,
        });
        continue;
      }

      // Also check if owner has an institutional TenantBilling on another parish
      const ownedActive = ownerInstitutionalBillings.find((b: any) => isBillingActive(b));
      if (ownedActive) {
        result.set(parish.id, {
          plan: ownedActive.plan.toUpperCase(),
          status: ownedActive.status,
          trialEndsAt: ownedActive.trialEndsAt,
          maxClasses: ownedActive.maxClasses,
          maxCatechumens: ownedActive.maxCatechumens,
          maxCatechists: ownedActive.maxCatechists,
          maxParishes: ownedActive.maxParishes,
        });
        continue;
      }
    }

    result.set(parish.id, pb || null);
  }

  return result;
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
      select: DIOCESE_BILLING_SELECT,
    });
    if (dioceseBilling && isDioceseDealCovering(dioceseBilling)) {
      return { skip: true };
    }
  }

  // Fetch fresh user from DB — context.user may be stale (cached at login)
  const freshUser = context.user
    ? await context.entities.User.findUnique({
        where: { id: context.user.id },
        select: { subscriptionStatus: true, subscriptionPlan: true },
      })
    : null;

  const creatorActive = isSubscriptionActiveLike(freshUser?.subscriptionStatus);
  const creatorPlan = (freshUser?.subscriptionPlan || '').toLowerCase();
  if (creatorActive && isInstPlan(creatorPlan)) {
    return { skip: false, plan: creatorPlan.toUpperCase(), status: 'ACTIVE', trialEndsAt: null };
  }

  // Unpaid institutional workspace until Stripe Checkout starts the parish trial.
  return {
    skip: false,
    plan: 'CATECHIST_FREE',
    status: 'CANCELED',
    trialEndsAt: null,
  };
}

/**
 * Load the user billing row. Does not grant in-app trial to new accounts.
 * Grandfather: keep existing in-app `trialing` (no Stripe customer) inside the
 * original signup window, and heal a missing personal plan id.
 * Never touches users already managed by Stripe (paymentProcessorUserId set).
 */
export async function ensureProductTrial(
  context: any,
  userId: string,
): Promise<{
  subscriptionStatus: string | null;
  subscriptionPlan: string | null;
  createdAt: Date;
  paymentProcessorUserId: string | null;
}> {
  const user = await context.entities.User.findUnique({
    where: { id: userId },
    select: {
      subscriptionStatus: true,
      subscriptionPlan: true,
      createdAt: true,
      paymentProcessorUserId: true,
    },
  });
  if (!user) {
    throw new HttpError(401);
  }

  // Stripe-managed or already paid — leave alone.
  if (user.paymentProcessorUserId) return user;
  if (isSubscriptionActiveLike(user.subscriptionStatus)) return user;
  if (isProductTrialStatus(user.subscriptionStatus) && isProductTrialWindowOpen(user.createdAt)) {
    // Ensure plan id is a real personal plan during grandfather trial.
    if ((user.subscriptionPlan || '').toLowerCase() === 'catechist_free' || !user.subscriptionPlan) {
      return context.entities.User.update({
        where: { id: userId },
        data: { subscriptionPlan: PRODUCT_TRIAL_PLAN_ID },
        select: {
          subscriptionStatus: true,
          subscriptionPlan: true,
          createdAt: true,
          paymentProcessorUserId: true,
        },
      });
    }
    return user;
  }

  return user;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function requiredPlan(currentPlan: string | null): string {
  const p = resolvePlanIdOrFree(currentPlan);
  if (p === 'unlimited') return 'Plano Paróquia';
  return 'Plano Paróquia';
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
  return `LIMIT: Limite de ${label}s do plano ${currentPlanName} atingido (${current}/${max}). Faça upgrade para ${upgradePlan}.`;
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
      throw new HttpError(403, 'LIMIT: Plano pessoal permite apenas 1 catequista. Faça upgrade para um plano institucional.');
    }
    return;
  }

  const billing = await resolveEffectiveBilling(context, parishId);
  const effectivePlan = getEffectiveBillingPlan(billing);
  const planId = resolvePlanIdOrFree(effectivePlan);
  const planLimits = await catalogLimits(context, planId);

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

/** Soft-limit code: UI can offer the 7-day parish trial instead of trapping the user. */
export const PARISH_TRIAL_AVAILABLE_PREFIX = 'LIMIT:PARISH_TRIAL_AVAILABLE:';

async function countOwnedNonInstitutionalParishes(
  context: any,
  userId: string,
): Promise<number> {
  return context.entities.Parish.count({
    where: {
      ownerId: userId,
      type: { not: 'PERSONAL' },
      dioceseId: null,
      OR: [
        { billing: { is: null } },
        { billing: { plan: { notIn: INSTITUTIONAL_PLANS } } },
      ],
    },
  });
}

export async function countDioceseBillableParishes(
  context: any,
  dioceseId: string,
  opts?: { excludeParishId?: string | null },
): Promise<number> {
  return context.entities.Parish.count({
    where: {
      dioceseId,
      active: true,
      type: { in: [...DIOCESE_QUOTA_PARISH_TYPES] },
      ...(opts?.excludeParishId ? { id: { not: opts.excludeParishId } } : {}),
    },
  });
}

export async function loadDioceseBilling(context: any, dioceseId: string) {
  return context.entities.TenantBilling.findUnique({
    where: { dioceseId },
    select: { dioceseId: true, ...DIOCESE_BILLING_SELECT },
  });
}

export async function loadDioceseDealSummaries(
  context: any,
  dioceses: Array<{ id: string; name: string }>,
): Promise<Map<string, DioceseDealPublicSummary>> {
  const result = new Map<string, DioceseDealPublicSummary>();
  if (dioceses.length === 0) return result;
  const ids = dioceses.map((d) => d.id);
  const [billingRows, parishRows] = await Promise.all([
    context.entities.TenantBilling.findMany({
      where: { dioceseId: { in: ids } },
      select: { dioceseId: true, ...DIOCESE_BILLING_SELECT },
    }),
    context.entities.Parish.findMany({
      where: {
        dioceseId: { in: ids },
        active: true,
        type: { in: [...DIOCESE_QUOTA_PARISH_TYPES] },
      },
      select: { dioceseId: true },
    }),
  ]);
  const billingByDiocese = new Map(
    billingRows.map((row: any) => [row.dioceseId, row]),
  );
  const usedByDiocese = new Map<string, number>();
  for (const row of parishRows as any[]) {
    if (!row.dioceseId) continue;
    usedByDiocese.set(row.dioceseId, (usedByDiocese.get(row.dioceseId) ?? 0) + 1);
  }
  for (const diocese of dioceses) {
    result.set(
      diocese.id,
      toDioceseDealPublicSummary({
        dioceseId: diocese.id,
        dioceseName: diocese.name,
        billing: billingByDiocese.get(diocese.id) ?? null,
        parishesUsed: usedByDiocese.get(diocese.id) ?? 0,
      }),
    );
  }
  return result;
}

/**
 * Quota + lifecycle for attaching a parish workspace to a diocese.
 * Negotiated deals never fall through to Stripe Checkout.
 */
export async function assertDioceseParishQuota(
  context: any,
  opts: { dioceseId: string; excludeParishId?: string | null },
): Promise<void> {
  const billing = await loadDioceseBilling(context, opts.dioceseId);
  if (!billing) return;

  const used = await countDioceseBillableParishes(context, opts.dioceseId, {
    excludeParishId: opts.excludeParishId,
  });

  if (isDioceseDealCovering(billing)) {
    if (parishQuotaReached(used, billing.maxParishes)) {
      throw new HttpError(
        403,
        dioceseParishQuotaMessage(used, billing.maxParishes as number),
      );
    }
    return;
  }

  if (isManualDioceseDeal(billing)) {
    throw new HttpError(403, dioceseDealBlockedNewParishMessage(billing));
  }
}

/**
 * Enforce parish-creation limits.
 *
 * - Negotiated / umbrella diocese coverage → allow only within parish quota
 * - Institutional umbrella / diocese coverage → allow
 * - `startTrial: true` → create an unpaid parish workspace so Stripe Checkout
 *   for Plano Paróquia can attach (no local entitlements)
 * - Otherwise use personal plan limits (grandfather in-app trial or paid)
 * - If still blocked, throw PARISH_TRIAL_AVAILABLE so the client can offer
 *   the Stripe parish trial checkout instead of a dead end
 */
export async function assertCanCreateParish(
  context: any,
  opts?: { dioceseId?: string | null; startTrial?: boolean },
): Promise<void> {
  if (!context.user) throw new HttpError(401);

  if (opts?.dioceseId) {
    await assertDioceseParishQuota(context, { dioceseId: opts.dioceseId });
  }

  const coverage = await resolveNewParishBilling(context, {
    dioceseId: opts?.dioceseId ?? null,
  });
  if (coverage.skip || isInstPlan(coverage.plan)) return;

  const ownedParishes = await countOwnedNonInstitutionalParishes(
    context,
    context.user.id,
  );

  // Explicit consent to create an unpaid parish so Stripe trial checkout can run.
  if (opts?.startTrial) {
    if (ownedParishes >= 1) {
      throw new HttpError(
        403,
        buildLimitMessage(
          'parish_limit',
          coverage.plan,
          ownedParishes,
          1,
        ),
      );
    }
    return;
  }

  // Heal personal product trial so "trialing" is not treated as free sentinel
  // (same pattern as assertCanCreateClass for PERSONAL workspaces).
  const freshUser = await ensureProductTrial(context, context.user.id);
  const plan = getPersonalPlanId(freshUser);
  const limits = await catalogLimits(context, plan);
  if (limits.maxParishes === null) return;

  if (ownedParishes >= limits.maxParishes) {
    if (ownedParishes < 1) {
      throw new HttpError(
        403,
        `${PARISH_TRIAL_AVAILABLE_PREFIX} Limite de paróquias do plano ${planName(plan)} atingido (${ownedParishes}/${limits.maxParishes}). Você pode iniciar 7 dias grátis do plano Paróquia para continuar.`,
      );
    }
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
    if (!context.user) throw new HttpError(401);
    // Fresh user + heal product trial so onboarding is not blocked by free sentinel.
    const freshUser = await ensureProductTrial(context, context.user.id);
    const plan = getPersonalPlanId(freshUser);
    const limits = await catalogLimits(context, plan);
    if (limits.maxClasses === null) return;

    const activeCount = await context.entities.CatechesisClass.count({
      where: { parishId, status: { not: 'ARCHIVED' } },
    });

    if (activeCount >= limits.maxClasses!) {
      try {
        const { refreshUserBillingFromStripe } = await import(
          '../../payment/stripe/syncUserSubscription'
        );
        const synced = await refreshUserBillingFromStripe(context, context.user.id);
        const syncedPlan = getPersonalPlanId(synced);
        const syncedLimits = await catalogLimits(context, syncedPlan);
        if (syncedLimits.maxClasses === null) return;
        if (activeCount < syncedLimits.maxClasses) return;
      } catch {
        // Fall through to the original limit error.
      }
      throw new HttpError(
        403,
        `LIMIT: Limite de turmas do plano ${planName(plan)} atingido (${activeCount}/${limits.maxClasses}). Faça upgrade.`,
      );
    }
    return;
  }

  const billing = await resolveEffectiveBilling(context, parishId);
  const effectivePlan = getEffectiveBillingPlan(billing);
  const planLimits = await catalogLimits(context, effectivePlan);

  const maxClasses = billing?.maxClasses != null ? billing.maxClasses : planLimits.maxClasses;
  if (maxClasses === null) return;

  let activeCount: number;
  if (!billing && (effectivePlan === 'CATECHIST_FREE' || effectivePlan === 'SINGLE')) {
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

export type EnrollmentCapacity = {
  /** null = unlimited */
  maxCatechumens: number | null;
  enrolledCount: number;
  /** Error to raise when the limit is reached (message depends on plan). */
  limitError: () => HttpError;
};

/**
 * Resolves the workspace's catechumen limit and current usage once. Bulk
 * callers (CSV import) use this to enforce the limit locally instead of
 * re-querying billing for every row.
 */
export async function resolveEnrollmentCapacity(
  context: any,
  parishId: string,
): Promise<EnrollmentCapacity> {
  const parish = await context.entities.Parish.findUnique({
    where: { id: parishId },
    select: { type: true },
  });

  if (parish?.type === 'PERSONAL') {
    if (!context.user) throw new HttpError(401);
    const freshUser = await ensureProductTrial(context, context.user.id);
    const plan = getPersonalPlanId(freshUser);
    const limits = await catalogLimits(context, plan);
    if (limits.maxCatechumens === null) {
      return { maxCatechumens: null, enrolledCount: 0, limitError: () => new HttpError(403) };
    }

    const enrolledCount = await context.entities.ClassEnrollment.count({
      where: { status: 'ENROLLED', class: { parishId } },
    });
    const max = limits.maxCatechumens;
    return {
      maxCatechumens: max,
      enrolledCount,
      limitError: () =>
        new HttpError(
          403,
          `LIMIT: Limite de catequizandos do plano ${planName(plan)} atingido (${enrolledCount}/${max}).`,
        ),
    };
  }

  const billing = await resolveEffectiveBilling(context, parishId);
  const effectivePlan = getEffectiveBillingPlan(billing);
  const planLimits = await catalogLimits(context, effectivePlan);

  const maxCatechumens = billing?.maxCatechumens != null ? billing.maxCatechumens : planLimits.maxCatechumens;
  if (maxCatechumens === null) {
    return { maxCatechumens: null, enrolledCount: 0, limitError: () => new HttpError(403) };
  }

  let enrolledCount: number;
  if (!billing && (effectivePlan === 'CATECHIST_FREE' || effectivePlan === 'SINGLE')) {
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

  return {
    maxCatechumens,
    enrolledCount,
    limitError: () =>
      new HttpError(
        403,
        buildLimitMessage('catechumen_limit', effectivePlan, enrolledCount, maxCatechumens),
      ),
  };
}

export async function assertCanEnrollCatechumen(
  context: any,
  parishId: string,
): Promise<void> {
  const capacity = await resolveEnrollmentCapacity(context, parishId);
  if (capacity.maxCatechumens === null) return;
  if (capacity.enrolledCount >= capacity.maxCatechumens) {
    throw capacity.limitError();
  }
}
