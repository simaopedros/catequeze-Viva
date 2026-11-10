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
  getProductTrialEndsAt,
  PRODUCT_TRIAL_PLAN_ID,
  type PlanLimits,
} from "../../shared/planLimits";
import { loadPlanCatalog } from "../pricing/planCatalogService";
import { PRISMA_INSTITUTIONAL_PLANS } from "../../shared/pricing";

export type { PlanLimits } from "../../shared/planLimits";

export { isBillingActive, getEffectiveBillingPlan, isInstitutionalPlan };

/** Diocese umbrella covers parishes when TenantBilling is ACTIVE with unlimited/diocese. */
export function isDioceseUmbrellaPlan(plan: string | null | undefined): boolean {
  const key = String(plan || "").trim().toUpperCase();
  return key === "UNLIMITED" || key === "DIOCESE";
}

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
      select: {
        plan: true, status: true, trialEndsAt: true,
        maxClasses: true, maxCatechumens: true,
        maxCatechists: true, maxParishes: true,
      },
    });

    if (dioceseBilling && isBillingActive(dioceseBilling) && isDioceseUmbrellaPlan(dioceseBilling.plan)) {
      return {
        plan: dioceseBilling.plan,
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
          select: { dioceseId: true, plan: true, status: true, trialEndsAt: true, maxClasses: true, maxCatechumens: true, maxCatechists: true, maxParishes: true },
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
      if (isBillingActive(db) && isDioceseUmbrellaPlan(db.plan)) {
        result.set(parish.id, { plan: db.plan as any, status: db.status, trialEndsAt: db.trialEndsAt, maxClasses: db.maxClasses, maxCatechumens: db.maxCatechumens, maxCatechists: db.maxCatechists, maxParishes: db.maxParishes });
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
      select: { plan: true, status: true, trialEndsAt: true },
    });
    if (dioceseBilling && isBillingActive(dioceseBilling) && isDioceseUmbrellaPlan(dioceseBilling.plan)) {
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

const PRODUCT_TRIAL_USER_SELECT = {
  subscriptionStatus: true,
  subscriptionPlan: true,
  createdAt: true,
  paymentProcessorUserId: true,
  trialEndsAt: true,
  datePaid: true,
} as const;

type ProductTrialUser = {
  subscriptionStatus: string | null;
  subscriptionPlan: string | null;
  createdAt: Date;
  paymentProcessorUserId: string | null;
  trialEndsAt: Date | null;
  datePaid: Date | null;
};

/**
 * A brand-new account that never touched billing: no Stripe customer, no
 * subscription status, no previous trial, never paid, on the free sentinel,
 * and still inside the 7-day signup window.
 */
export function isEligibleForNoCardProductTrial(
  user: Partial<ProductTrialUser> | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!user) return false;
  if (user.paymentProcessorUserId) return false;
  if (user.subscriptionStatus) return false;
  if (user.trialEndsAt) return false;
  if (user.datePaid) return false;
  const plan = (user.subscriptionPlan || '').toLowerCase();
  if (plan && plan !== 'catechist_free') return false;
  return isProductTrialWindowOpen(user.createdAt, now);
}

/**
 * Load the user billing row and keep the in-app 7-day product trial healthy.
 * - New accounts (see isEligibleForNoCardProductTrial) get `trialing` on
 *   PRODUCT_TRIAL_PLAN_ID until createdAt + 7 days, without a card.
 * - Existing in-app `trialing` inside the signup window gets a missing
 *   personal plan id healed.
 * Never touches users already managed by Stripe (paymentProcessorUserId set)
 * and never re-grants once a trial or subscription status was recorded.
 */
export async function ensureProductTrial(
  context: any,
  userId: string,
): Promise<ProductTrialUser> {
  const user: ProductTrialUser | null = await context.entities.User.findUnique({
    where: { id: userId },
    select: PRODUCT_TRIAL_USER_SELECT,
  });
  if (!user) {
    throw new HttpError(401);
  }

  // Stripe-managed or already paid — leave alone.
  if (user.paymentProcessorUserId) return user;
  if (isSubscriptionActiveLike(user.subscriptionStatus)) return user;

  if (isEligibleForNoCardProductTrial(user)) {
    // Conditional write so concurrent requests (or a Stripe webhook landing
    // in between) cannot double-grant or clobber a real subscription.
    await context.entities.User.updateMany({
      where: {
        id: userId,
        subscriptionStatus: null,
        paymentProcessorUserId: null,
        trialEndsAt: null,
        datePaid: null,
      },
      data: {
        subscriptionStatus: 'trialing',
        subscriptionPlan: PRODUCT_TRIAL_PLAN_ID,
        trialEndsAt: getProductTrialEndsAt(user.createdAt),
      },
    });
    const refreshed: ProductTrialUser | null = await context.entities.User.findUnique({
      where: { id: userId },
      select: PRODUCT_TRIAL_USER_SELECT,
    });
    return refreshed ?? user;
  }

  if (isProductTrialStatus(user.subscriptionStatus) && isProductTrialWindowOpen(user.createdAt)) {
    // Ensure plan id is a real personal plan during grandfather trial.
    if ((user.subscriptionPlan || '').toLowerCase() === 'catechist_free' || !user.subscriptionPlan) {
      return context.entities.User.update({
        where: { id: userId },
        data: { subscriptionPlan: PRODUCT_TRIAL_PLAN_ID },
        select: PRODUCT_TRIAL_USER_SELECT,
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

/**
 * Enforce parish-creation limits.
 *
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

/** One quota scope for enforcement and the lightweight usage query. */
async function resolveQuotaScope(context: any, parishId: string) {
  if (!context.user) throw new HttpError(401);
  const parish = await context.entities.Parish.findUnique({
    where: { id: parishId },
    select: { type: true },
  });
  if (!parish) throw new HttpError(404, "Paróquia não encontrada.");
  const personal = parish.type === "PERSONAL";
  const billing = personal
    ? null
    : await resolveEffectiveBilling(context, parishId);
  const plan = personal
    ? getPersonalPlanId(await ensureProductTrial(context, context.user.id))
    : getEffectiveBillingPlan(billing);
  const limits = await catalogLimits(context, plan);
  let classWhere: any = { parishId, status: { not: "ARCHIVED" } };
  if (
    !personal &&
    !billing &&
    (plan === "CATECHIST_FREE" || plan === "SINGLE")
  ) {
    const links = await context.entities.ClassCatechist.findMany({
      where: { userId: context.user.id },
      select: { classId: true },
    });
    classWhere = {
      id: { in: links.map((l: any) => l.classId) },
      status: { not: "ARCHIVED" },
    };
  }
  // Preserve the existing ENROLLED scope for people, including archived and
  // concluded classes. Only the class quota excludes archived classes.
  const { status: _classStatus, ...peopleClassWhere } = classWhere;
  return {
    plan,
    classWhere,
    peopleClassWhere,
    personal,
    maxClasses: billing?.maxClasses ?? limits.maxClasses,
    maxCatechumens: billing?.maxCatechumens ?? limits.maxCatechumens,
  };
}

/** Fetch only distinct IDs, never student details or enrollment history. */
export async function countPlanPeople(
  context: any,
  classWhere: any,
): Promise<Set<string>> {
  const people = await context.entities.ClassEnrollment.findMany({
    where: { status: "ENROLLED", class: classWhere },
    select: { catechumenProfileId: true },
    distinct: ["catechumenProfileId"],
  });
  return new Set(people.map((p: any) => p.catechumenProfileId));
}

export async function resolvePlanUsage(context: any, parishId: string) {
  const scope = await resolveQuotaScope(context, parishId);
  const [classesUsed, people] = await Promise.all([
    context.entities.CatechesisClass.count({ where: scope.classWhere }),
    countPlanPeople(context, scope.peopleClassWhere),
  ]);
  return { ...scope, classesUsed, people, catechumensUsed: people.size };
}

export async function assertCanCreateClass(
  context: any,
  parishId: string,
): Promise<void> {
  const scope = await resolveQuotaScope(context, parishId);
  if (scope.maxClasses === null) return;
  const count = await context.entities.CatechesisClass.count({
    where: scope.classWhere,
  });
  if (count >= scope.maxClasses) {
    if (scope.personal) {
      try {
        const { refreshUserBillingFromStripe } = await import(
          "../../payment/stripe/syncUserSubscription"
        );
        const synced = await refreshUserBillingFromStripe(
          context,
          context.user.id,
        );
        const limits = await catalogLimits(context, getPersonalPlanId(synced));
        if (limits.maxClasses === null || count < limits.maxClasses) return;
      } catch {
        // Preserve the existing fallback to the quota error if sync fails.
      }
    }
    throw new HttpError(
      403,
      buildLimitMessage("class_limit", scope.plan, count, scope.maxClasses),
    );
  }
}

export type EnrollmentCapacity = {
  maxCatechumens: number | null;
  enrolledCount: number;
  people: Set<string>;
  limitError: () => HttpError;
};

export async function resolveEnrollmentCapacity(
  context: any,
  parishId: string,
): Promise<EnrollmentCapacity> {
  const scope = await resolveQuotaScope(context, parishId);
  const people = await countPlanPeople(context, scope.peopleClassWhere);
  return {
    maxCatechumens: scope.maxCatechumens,
    enrolledCount: people.size,
    people,
    limitError: () =>
      new HttpError(
        403,
        buildLimitMessage(
          "catechumen_limit",
          scope.plan,
          people.size,
          scope.maxCatechumens!,
        ),
      ),
  };
}

export function assertEnrollmentCapacity(
  capacity: EnrollmentCapacity,
  profileId: string,
): void {
  if (capacity.people.has(profileId) || capacity.maxCatechumens === null)
    return;
  if (capacity.people.size >= capacity.maxCatechumens)
    throw capacity.limitError();
}

export async function assertCanEnrollCatechumen(
  context: any,
  parishId: string,
  profileId: string,
): Promise<void> {
  assertEnrollmentCapacity(
    await resolveEnrollmentCapacity(context, parishId),
    profileId,
  );
}

function restorationFits(
  usage: Awaited<ReturnType<typeof resolvePlanUsage>>,
  restoredPeople: Set<string>,
): boolean {
  return (
    (usage.maxClasses === null || usage.classesUsed + 1 <= usage.maxClasses) &&
    (usage.maxCatechumens === null ||
      new Set([...usage.people, ...restoredPeople]).size <=
        usage.maxCatechumens)
  );
}

export async function assertCanRestoreClass(
  context: any,
  parishId: string,
  classId: string,
): Promise<void> {
  const usage = await resolvePlanUsage(context, parishId);
  const restoredPeople = await countPlanPeople(context, {
    id: classId,
    parishId,
  });
  if (!restorationFits(usage, restoredPeople)) {
    throw new HttpError(
      403,
      "Não é possível restaurar esta turma: o limite de turmas ou de pessoas distintas do plano seria excedido. Libere vagas ou altere o plano.",
    );
  }
}

export const getPlanUsage = async (
  args: { parishId: string; restoreClassId?: string },
  context: any,
) => {
  if (!context.user) throw new HttpError(401);
  const { requireWorkspaceAccess, assertClassInScope } = await import(
    "./sharedScope"
  );
  const access = await requireWorkspaceAccess(context, args.parishId);
  const usage = await resolvePlanUsage(context, args.parishId);
  let canRestore: boolean | null = null;
  if (args.restoreClassId) {
    assertClassInScope(access, args.restoreClassId);
    const cls = await context.entities.CatechesisClass.findUnique({
      where: { id: args.restoreClassId },
      select: { parishId: true, status: true },
    });
    if (!cls || cls.parishId !== args.parishId) throw new HttpError(404);
    const people = await countPlanPeople(context, {
      id: args.restoreClassId,
      parishId: args.parishId,
    });
    canRestore = cls.status === "ARCHIVED" && restorationFits(usage, people);
  }
  return {
    plan: usage.plan,
    classesUsed: usage.classesUsed,
    catechumensUsed: usage.catechumensUsed,
    maxClasses: usage.maxClasses,
    maxCatechumens: usage.maxCatechumens,
    canRestore,
  };
};
