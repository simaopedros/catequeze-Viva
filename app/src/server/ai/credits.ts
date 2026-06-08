/**
 * AI credit management — check, deduct, reset.
 *
 * v2: Diocese AI credits are per-parish (50/month/parish, max 500), not per user.
 * Parish billing tracks aiCreditsUsed / aiCreditsReset for diocese umbrella.
 */
import { HttpError } from 'wasp/server';
import type { User, UserAiCredits } from '@prisma/client';
import {
  AI_CREDITS,
  planHasAiAccess,
  getMonthlyAllowance,
  getDailyLimit,
  getAiCreditScope,
  resolvePlanIdOrFree,
  PLANS,
  PRICING_VERSION,
} from '../../shared/aiCredits';
import { getDailyUsage, incrementDailyUsage } from './dailyUsage';

// ─── Credit check + deduction ──────────────────────────────────────────────

interface CreditContext {
  entities: {
    UserAiCredits: any;
    User: any;
    Membership?: any;
    Parish?: any;
    TenantBilling?: any;
  };
  user?: { id: string } | null;
}

/** Monthly allowance per parish under a diocese umbrella. */
const DIOCESE_PER_PARISH_ALLOWANCE = 50;

export function resolveUserAiAllowance(personalPlan: string | null, effectivePlan: string | null): number {
  if (!effectivePlan) return 0;
  const planId = resolvePlanIdOrFree(effectivePlan);

  // Diocese: per-parish model — allowance resolved per-parish, not per user.
  if (planId === 'diocese') {
    return DIOCESE_PER_PARISH_ALLOWANCE;
  }

  return getMonthlyAllowance(effectivePlan);
}

export async function resolveUserEffectivePlanAndStatus(
  context: any,
  userId: string,
  personalPlan: string | null,
): Promise<{ effectivePlan: string | null; isFreePlan: boolean; dioceseParishId?: string }> {
  let effectivePlan = personalPlan;
  let isFreePlan = !personalPlan || personalPlan === 'catechist_free' || personalPlan === 'CATECHIST_FREE';
  let dioceseParishId: string | undefined;

  if (context.entities.Membership && context.entities.TenantBilling) {
    const activeMemberships = await context.entities.Membership.findMany({
      where: { userId, status: 'ACTIVE' },
      select: { parishId: true },
    });
    if (activeMemberships.length > 0) {
      const parishIds = activeMemberships.map((m: any) => m.parishId);

      // Check diocese umbrella first (v2 per-parish model)
      if (context.entities.Parish) {
        const parishes = await context.entities.Parish.findMany({
          where: { id: { in: parishIds } },
          select: { dioceseId: true },
        });
        const dioceseIds = parishes.map((p: any) => p.dioceseId).filter(Boolean);

        if (dioceseIds.length > 0) {
          const dioceseBilling = await context.entities.TenantBilling.findFirst({
            where: {
              dioceseId: { in: dioceseIds },
              OR: [
                { status: 'ACTIVE' },
                { status: 'TRIAL', trialEndsAt: { gte: new Date() } },
              ],
              plan: 'DIOCESE',
            },
            select: { pricingVersion: true },
          });

          if (dioceseBilling) {
            // v2 (pricingVersion >= 2): per-parish model
            // v1 (pricingVersion < 2 or null): per-user model (legacy)
            const isV2 = (dioceseBilling.pricingVersion ?? 1) >= 2;
            effectivePlan = 'DIOCESE';
            isFreePlan = false;

            if (isV2) {
              // For v2, track which parish this user belongs to for per-parish deduction
              const firstParish = parishes.find((p: any) => p.dioceseId && dioceseIds.includes(p.dioceseId));
              if (firstParish) {
                dioceseParishId = activeMemberships.find((m: any) =>
                  parishes.some((p: any) => p.id === m.parishId && p.dioceseId)
                )?.parishId;
              }
            }
          }
        }
      }

      // If no diocese umbrella, check direct parish billing
      if (effectivePlan === personalPlan || isFreePlan) {
        const paidBilling = await context.entities.TenantBilling.findFirst({
          where: {
            parishId: { in: parishIds },
            OR: [
              { status: 'ACTIVE' },
              { status: 'TRIAL', trialEndsAt: { gte: new Date() } },
            ],
            plan: { in: ['PARISH', 'PARISH_ESSENTIAL', 'PARISH_COMPLETE', 'CATECHIST_PRO', 'CATECHIST_AI'] },
          },
          orderBy: { plan: 'asc' },
        });
        if (paidBilling) {
          effectivePlan = paidBilling.plan;
          isFreePlan = false;
        }
      }
    }
  }

  return { effectivePlan, isFreePlan, dioceseParishId };
}

/**
 * Check and deduct credits from the per-parish diocese pool (v2).
 * For v1 diocese (pricingVersion 1), falls back to per-user model.
 */
async function assertAndDeductDioceseCredits(
  context: CreditContext,
  cost: number,
  parishId: string,
  userId: string,
): Promise<{ creditsLeft: number }> {
  // Find the parish billing to check/use its AI pool
  const parishBilling = await context.entities.TenantBilling.findUnique({
    where: { parishId },
    select: {
      id: true, plan: true,
      // We need aiCredits fields from TenantBilling — these track parish pool
      // For now, we use UserAiCredits as an approximation until schema migration
    },
  });

  // Check the user's credits record (per-parish pool tracked via user for now)
  let credits = await context.entities.UserAiCredits.findUnique({
    where: { userId },
  });

  // Auto-create if missing
  if (!credits) {
    credits = await context.entities.UserAiCredits.create({
      data: {
        userId,
        creditsLeft: DIOCESE_PER_PARISH_ALLOWANCE,
        lastReset: new Date(),
      },
    });
  }

  // Monthly reset check
  const now = new Date();
  const lastReset = new Date(credits.lastReset);
  if (shouldReset(lastReset, now)) {
    credits = await context.entities.UserAiCredits.update({
      where: { userId },
      data: { creditsLeft: DIOCESE_PER_PARISH_ALLOWANCE, lastReset: now },
    });
  }

  if (credits.creditsLeft < cost) {
    throw new HttpError(
      402,
      `Créditos insuficientes da paróquia (${credits.creditsLeft} restantes, ${cost} necessários). Os créditos renovam no próximo mês.`,
    );
  }

  // Enforce daily limit (diocese: 20/day)
  const dailyLimit = getDailyLimit('diocese');
  if (dailyLimit > 0) {
    const todayUsage = await getDailyUsage(context.entities, userId);
    if (todayUsage + cost > dailyLimit) {
      throw new HttpError(
        429,
        `Limite diário de IA atingido (${dailyLimit} créditos/dia). Tente novamente amanhã.`,
      );
    }
  }

  const updated = await context.entities.UserAiCredits.update({
    where: { userId },
    data: { creditsLeft: { decrement: cost } },
  });

  await incrementDailyUsage(context.entities, userId, cost);
  return { creditsLeft: updated.creditsLeft };
}

export async function assertAndDeductCredits(
  context: CreditContext,
  cost: number,
): Promise<{ creditsLeft: number }> {
  if (!context.user) throw new HttpError(401, 'Autenticação necessária');

  const user = await context.entities.User.findUnique({
    where: { id: context.user.id },
    select: { subscriptionPlan: true, credits: true },
  });
  if (!user) throw new HttpError(401);

  const plan = user.subscriptionPlan;
  const { effectivePlan, isFreePlan, dioceseParishId } = await resolveUserEffectivePlanAndStatus(
    context, context.user.id, plan,
  );

  // Diocese v2: per-parish pool
  if (effectivePlan === 'DIOCESE' && dioceseParishId) {
    return assertAndDeductDioceseCredits(context, cost, dioceseParishId, context.user.id);
  }

  // Standard deduction (personal, parish, legacy diocese v1)
  let credits = await context.entities.UserAiCredits.findUnique({
    where: { userId: context.user.id },
  });

  if (!credits && isFreePlan) {
    credits = await context.entities.UserAiCredits.create({
      data: {
        userId: context.user.id,
        creditsLeft: AI_CREDITS.FREE_TRIAL_CREDITS,
        lastReset: new Date(),
      },
    });
  }

  if (!credits && !isFreePlan) {
    const allowance = resolveUserAiAllowance(plan, effectivePlan);
    credits = await context.entities.UserAiCredits.create({
      data: {
        userId: context.user.id,
        creditsLeft: allowance,
        lastReset: new Date(),
      },
    });
  }

  if (!credits) {
    throw new HttpError(
      402,
      'Plano sem acesso à IA. Faça upgrade para Catequista IA ou Paróquia em /app/billing.',
    );
  }

  const now = new Date();
  const lastReset = new Date(credits.lastReset);
  if (!isFreePlan && shouldReset(lastReset, now)) {
    const allowance = resolveUserAiAllowance(plan, effectivePlan);
    credits = await context.entities.UserAiCredits.update({
      where: { userId: context.user.id },
      data: { creditsLeft: allowance, lastReset: now },
    });
  }

  if (isFreePlan) {
    if (credits.creditsLeft <= 0) {
      throw new HttpError(
        402,
        'Créditos de teste esgotados. Faça upgrade para Catequista IA para continuar usando a IA.',
      );
    }
  } else {
    if (!planHasAiAccess(effectivePlan)) {
      throw new HttpError(
        402,
        'Plano sem acesso à IA. Faça upgrade para Catequista IA ou Paróquia em /app/billing.',
      );
    }

    if (credits.creditsLeft < cost) {
      throw new HttpError(
        402,
        `Créditos insuficientes (${credits.creditsLeft} restantes, ${cost} necessários). Seus créditos renovam no próximo mês.`,
      );
    }
  }

  const dailyLimit = getDailyLimit(effectivePlan ?? user.subscriptionPlan);
  if (dailyLimit > 0) {
    const todayUsage = await getDailyUsage(context.entities, context.user.id);
    if (todayUsage + cost > dailyLimit) {
      throw new HttpError(
        429,
        `Limite diário de IA atingido (${dailyLimit} créditos/dia). Tente novamente amanhã.`,
      );
    }
  }

  const updated = await context.entities.UserAiCredits.update({
    where: { userId: context.user.id },
    data: { creditsLeft: { decrement: cost } },
  });

  await incrementDailyUsage(context.entities, context.user.id, cost);

  return { creditsLeft: updated.creditsLeft };
}

// ─── Reset logic ───────────────────────────────────────────────────────────

function shouldReset(lastReset: Date, now: Date): boolean {
  return (
    lastReset.getFullYear() < now.getFullYear() ||
    (lastReset.getFullYear() === now.getFullYear() &&
      lastReset.getMonth() < now.getMonth())
  );
}

export async function resetAllAiCredits(entities: any): Promise<number> {
  const now = new Date();

  const creditsToReset = await entities.UserAiCredits.findMany({
    where: {
      user: {
        subscriptionPlan: { in: AI_CREDITS.AI_PLANS },
      },
    },
    include: {
      user: { select: { subscriptionPlan: true } },
    },
  });

  let resetCount = 0;
  for (const record of creditsToReset) {
    const lastReset = new Date(record.lastReset);
    if (shouldReset(lastReset, now)) {
      const plan = record.user?.subscriptionPlan;
      const allowance = getMonthlyAllowance(plan);
      await entities.UserAiCredits.update({
        where: { id: record.id },
        data: { creditsLeft: allowance, lastReset: now },
      });
      resetCount++;
    }
  }

  // Also reset parish pools under diocese
  const dioceseParishCredits = await entities.UserAiCredits.findMany({
    where: {
      user: {
        memberships: {
          some: {
            status: 'ACTIVE',
            parish: {
              diocese: {
                billing: {
                  plan: 'DIOCESE',
                  status: 'ACTIVE',
                  pricingVersion: { gte: 2 },
                },
              },
            },
          },
        },
      },
    },
    include: {
      user: { select: { subscriptions: true } },
    },
  });

  // Note: The above query may need adjustment based on actual schema.
  // For now, the per-parish pool users are reset alongside regular users
  // since both use UserAiCredits.

  return resetCount;
}

export async function getCreditsStatus(
  context: CreditContext,
): Promise<{
  creditsLeft: number; plan: string | null; hasAiAccess: boolean;
  monthlyAllowance: number; scope?: string;
}> {
  if (!context.user) {
    return { creditsLeft: 0, plan: null, hasAiAccess: false, monthlyAllowance: 0 };
  }

  const user = await context.entities.User.findUnique({
    where: { id: context.user.id },
    select: { subscriptionPlan: true },
  });

  const plan = user?.subscriptionPlan ?? null;
  const { effectivePlan, isFreePlan, dioceseParishId } = await resolveUserEffectivePlanAndStatus(
    context, context.user.id, plan,
  );

  const planHasAccess = planHasAiAccess(effectivePlan);
  const monthlyAllowance = resolveUserAiAllowance(plan, effectivePlan);

  const credits = await context.entities.UserAiCredits.findUnique({
    where: { userId: context.user.id },
  });

  if (isFreePlan) {
    if (!credits) {
      return {
        creditsLeft: AI_CREDITS.FREE_TRIAL_CREDITS,
        plan: effectivePlan,
        hasAiAccess: true,
        monthlyAllowance: AI_CREDITS.FREE_TRIAL_CREDITS,
      };
    }
    return {
      creditsLeft: credits.creditsLeft,
      plan: effectivePlan,
      hasAiAccess: credits.creditsLeft > 0,
      monthlyAllowance: AI_CREDITS.FREE_TRIAL_CREDITS,
    };
  }

  if (!planHasAccess) {
    return { creditsLeft: 0, plan: effectivePlan, hasAiAccess: false, monthlyAllowance: 0 };
  }

  let creditsLeft = credits?.creditsLeft ?? monthlyAllowance;
  if (credits) {
    const lastReset = new Date(credits.lastReset);
    if (shouldReset(lastReset, new Date())) {
      creditsLeft = monthlyAllowance;
    }
  }

  return {
    creditsLeft,
    plan: effectivePlan,
    hasAiAccess: true,
    monthlyAllowance,
    scope: effectivePlan === 'DIOCESE' && dioceseParishId ? 'per_parish' : 'user',
  };
}
