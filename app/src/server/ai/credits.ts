/**
 * AI credit management — check, deduct, reset.
 */
import { HttpError } from 'wasp/server';
import type { User, UserAiCredits } from '@prisma/client';
import { AI_CREDITS, planHasAiAccess, getMonthlyAllowance, getDailyLimit } from '../../shared/aiCredits';
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

/**
 * Ensure the user has AI access and enough credits, then deduct.
 * Throws HttpError(402) if out of credits or on wrong plan.
 */
export function resolveUserAiAllowance(personalPlan: string | null, effectivePlan: string | null): number {
  if (!effectivePlan) return 0;

  const normEffective = effectivePlan.toUpperCase();
  if (normEffective === 'PARISH') {
    return 50; // 50 créditos para contas gerenciadas em plano Paróquia
  }
  if (normEffective === 'DIOCESE') {
    return 50; // 50 créditos por usuário ligado à diocese
  }
  if (normEffective === 'CATECHIST_PRO') {
    return 2; // 2 créditos/mês como amostra da IA
  }

  return getMonthlyAllowance(effectivePlan);
}

export async function resolveUserEffectivePlanAndStatus(
  context: any,
  userId: string,
  personalPlan: string | null
): Promise<{ effectivePlan: string | null; isFreePlan: boolean }> {
  let effectivePlan = personalPlan;
  let isFreePlan = !personalPlan || personalPlan === 'catechist_free' || personalPlan === 'CATECHIST_FREE';

  if (context.entities.Membership && context.entities.TenantBilling) {
    const activeMemberships = await context.entities.Membership.findMany({
      where: { userId, status: 'ACTIVE' },
      select: { parishId: true },
    });
    if (activeMemberships.length > 0) {
      const parishIds = activeMemberships.map((m: any) => m.parishId);
      const paidBilling = await context.entities.TenantBilling.findFirst({
        where: {
          parishId: { in: parishIds },
          OR: [
            { status: 'ACTIVE' },
            { status: 'TRIAL', trialEndsAt: { gte: new Date() } },
          ],
          plan: { in: ['PARISH', 'DIOCESE', 'CATECHIST_PRO', 'CATECHIST_AI'] },
        },
        orderBy: { plan: 'asc' },
      });
      if (paidBilling) {
        effectivePlan = paidBilling.plan;
        isFreePlan = false;
      } else if (context.entities.Parish) {
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
          });
          if (dioceseBilling) {
            effectivePlan = 'DIOCESE';
            isFreePlan = false;
          }
        }
      }
    }
  }

  return { effectivePlan, isFreePlan };
}

export async function assertAndDeductCredits(
  context: CreditContext,
  cost: number,
): Promise<{ creditsLeft: number }> {
  if (!context.user) throw new HttpError(401, 'Autenticação necessária');

  // Load user with subscription plan
  const user = await context.entities.User.findUnique({
    where: { id: context.user.id },
    select: { subscriptionPlan: true, credits: true },
  });
  if (!user) throw new HttpError(401);

  const plan = user.subscriptionPlan;
  const { effectivePlan, isFreePlan } = await resolveUserEffectivePlanAndStatus(context, context.user.id, plan);

  // Get or create credits record
  let credits = await context.entities.UserAiCredits.findUnique({
    where: { userId: context.user.id },
  });

  // For free plan with no prior usage, create a record with trial credits
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
    // Paid plan — auto-create on first use with monthly allowance
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
    // Should only happen if free plan + no credits record was somehow not created
    throw new HttpError(
      402,
      'Plano sem acesso à IA. Faça upgrade para Catequista IA ou Paróquia em /app/billing.',
    );
  }

  // Check if monthly reset is due (only for paid AI plans)
  const now = new Date();
  const lastReset = new Date(credits.lastReset);
  if (!isFreePlan && shouldReset(lastReset, now)) {
    const allowance = resolveUserAiAllowance(plan, effectivePlan);
    credits = await context.entities.UserAiCredits.update({
      where: { userId: context.user.id },
      data: {
        creditsLeft: allowance,
        lastReset: now,
      },
    });
  }

  // For free plan users, check trial credits
  if (isFreePlan) {
    if (credits.creditsLeft <= 0) {
      throw new HttpError(
        402,
        'Créditos de teste esgotados. Faça upgrade para Catequista IA para continuar usando a IA.',
      );
    }
  } else {
    // Paid plan — must have AI access
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

  // Enforce daily usage cap (abuse prevention)
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

  // Deduct credits
  const updated = await context.entities.UserAiCredits.update({
    where: { userId: context.user.id },
    data: { creditsLeft: { decrement: cost } },
  });

  // Track daily usage
  await incrementDailyUsage(context.entities, context.user.id, cost);

  return { creditsLeft: updated.creditsLeft };
}

// ─── Reset logic ───────────────────────────────────────────────────────────

function shouldReset(lastReset: Date, now: Date): boolean {
  // Reset if last reset was in a previous calendar month
  return (
    lastReset.getFullYear() < now.getFullYear() ||
    (lastReset.getFullYear() === now.getFullYear() &&
      lastReset.getMonth() < now.getMonth())
  );
}

/**
 * Monthly batch reset for all AI-plan users.
 * Called by the PgBoss scheduled job.
 */
export async function resetAllAiCredits(entities: any): Promise<number> {
  const now = new Date();

  // Find all users whose plan grants AI access and whose credits need reset
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
        data: {
          creditsLeft: allowance,
          lastReset: now,
        },
      });
      resetCount++;
    }
  }

  return resetCount;
}

/**
 * Get current credit status for a user.
 */
export async function getCreditsStatus(
  context: CreditContext,
): Promise<{ creditsLeft: number; plan: string | null; hasAiAccess: boolean; monthlyAllowance: number }> {
  if (!context.user) {
    return { creditsLeft: 0, plan: null, hasAiAccess: false, monthlyAllowance: 0 };
  }

  const user = await context.entities.User.findUnique({
    where: { id: context.user.id },
    select: { subscriptionPlan: true },
  });

  const plan = user?.subscriptionPlan ?? null;
  const { effectivePlan, isFreePlan } = await resolveUserEffectivePlanAndStatus(context, context.user.id, plan);

  const planHasAccess = planHasAiAccess(effectivePlan);
  const monthlyAllowance = resolveUserAiAllowance(plan, effectivePlan);

  const credits = await context.entities.UserAiCredits.findUnique({
    where: { userId: context.user.id },
  });

  // Free plan users: check if they still have trial credits
  if (isFreePlan) {
    if (!credits) {
      // Never used AI — 3 trial credits available
      return {
        creditsLeft: AI_CREDITS.FREE_TRIAL_CREDITS,
        plan: effectivePlan,
        hasAiAccess: true,
        monthlyAllowance: AI_CREDITS.FREE_TRIAL_CREDITS,
      };
    }
    // Has credits record — show actual remaining trial credits
    return {
      creditsLeft: credits.creditsLeft,
      plan: effectivePlan,
      hasAiAccess: credits.creditsLeft > 0,
      monthlyAllowance: AI_CREDITS.FREE_TRIAL_CREDITS,
    };
  }

  // Paid plan without AI access: no credits, no access
  if (!planHasAccess) {
    return { creditsLeft: 0, plan: effectivePlan, hasAiAccess: false, monthlyAllowance: 0 };
  }

  // Paid AI plan (Catechist AI, Parish, Diocese): show actual state
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
  };
}
