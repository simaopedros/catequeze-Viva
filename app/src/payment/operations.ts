import { HttpError } from "wasp/server";
import type {
  GenerateCheckoutSession,
  GetCustomerPortalUrl,
  GetSubscriptionDetails,
  CancelSubscription,
  ChangeSubscriptionPlan,
} from "wasp/server/operations";
import * as z from "zod";
import { PaymentPlanId, paymentPlans, SubscriptionStatus } from "../payment/plans";
import { validateOrThrow } from "../server/validation";
import { paymentProcessor } from "./paymentProcessor";
import { stripeClient } from "./stripe/stripeClient";
import { requireStripePriceId } from "./paymentProcessorPlans";
import { isSubscriptionActiveLike, resolvePlanIdOrFree, type PlanId } from "../shared/pricing";
import { trackPricingEvent } from "./pricingEvents";

export type CheckoutSession = {
  sessionUrl: string | null;
  sessionId: string;
};

const generateCheckoutSessionSchema = z.object({
  planId: z.nativeEnum(PaymentPlanId),
  interval: z.enum(['monthly', 'annual']).optional().default('monthly'),
});

type GenerateCheckoutSessionInput = z.infer<typeof generateCheckoutSessionSchema>;

// Institutional plan IDs. The simplified structure has a single institutional
// plan (`unlimited`) which covers both parish and diocese workspaces.
const INSTITUTIONAL_PLAN_IDS: PaymentPlanId[] = [PaymentPlanId.Unlimited];
const MANAGEABLE_SUBSCRIPTION_STATUSES = new Set(['trialing', 'active', 'past_due']);

async function listManageableSubscriptions(customerId: string) {
  const subscriptions = await stripeClient.subscriptions.list({
    customer: customerId,
    status: 'all',
    limit: 10,
  });

  return subscriptions.data.filter((subscription) =>
    MANAGEABLE_SUBSCRIPTION_STATUSES.has(subscription.status),
  );
}

export const generateCheckoutSession: GenerateCheckoutSession<
  GenerateCheckoutSessionInput,
  CheckoutSession
> = async (rawInput, context) => {
  if (!context.user) {
    throw new HttpError(401, "Only authenticated users are allowed to perform this operation");
  }

  const { planId: paymentPlanId, interval } = validateOrThrow(
    generateCheckoutSessionSchema,
    rawInput,
  );
  const userId = context.user.id;
  const userEmail = context.user.email;
  if (!userEmail) {
    throw new HttpError(403, "User needs an email to make a payment.");
  }

  const paymentPlan = paymentPlans[paymentPlanId];

  // CatechistFree (sentinel) cannot be purchased
  if (paymentPlanId === PaymentPlanId.CatechistFree) {
    throw new HttpError(400, 'O plano "Sem assinatura" não requer pagamento. Escolha um plano pago.');
  }

  // The Unlimited plan is institutional: requires the user to own or coordinate
  // an institutional (non-PERSONAL) parish, or to be a diocese admin.
  if (INSTITUTIONAL_PLAN_IDS.includes(paymentPlanId) && !context.user.isAdmin) {
    const ownedParish = await context.entities.Parish.findFirst({
      where: { ownerId: context.user.id, type: { not: "PERSONAL" } },
    });
    const coordinatorMembership = !ownedParish
      ? await context.entities.Membership.findFirst({
          where: {
            userId: context.user.id,
            status: 'ACTIVE',
            role: { in: ['PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR', 'DIOCESE_ADMIN'] },
            parish: { type: { not: 'PERSONAL' } },
          },
          select: { id: true },
        })
      : null;
    if (!ownedParish && !coordinatorMembership) {
      throw new HttpError(
        403,
        'O plano Ilimitado requer que você crie ou seja administrador de uma paróquia ou diocese antes de contratá-lo. O Plano Único cobre o seu espaço pessoal.',
      );
    }
  }

  // Prevent duplicate subscriptions: if the user already has an active-like
  // subscription for this scope, they should use changeSubscriptionPlan instead.
  const isInstitutionalPlan = INSTITUTIONAL_PLAN_IDS.includes(paymentPlanId);
  const freshUser = await context.entities.User.findUnique({
    where: { id: userId },
    select: { subscriptionStatus: true, subscriptionPlan: true },
  });
  const hasActiveSub = isSubscriptionActiveLike(freshUser?.subscriptionStatus);
  if (hasActiveSub && !isInstitutionalPlan) {
    throw new HttpError(
      409,
      'Você já possui uma assinatura ativa. Para trocar de plano, use a opção de alterar plano no portal de pagamento.',
    );
  }


  let session;
  try {
    const result = await paymentProcessor.createCheckoutSession({
      userId,
      userEmail,
      paymentPlan,
      interval,
      prismaUserDelegate: context.entities.User,
    });
    session = result.session;
  } catch (err: any) {
    const message = err?.message || '';
    if (message.includes('Stripe Price ID não configurado')) {
      throw new HttpError(503, message);
    }
    const status = err?.response?.status ?? err?.statusCode;
    if (status === 401 || status === 403) {
      throw new HttpError(
        503,
        "Serviço de pagamento indisponível no momento. Verifique a configuração do Stripe (STRIPE_API_KEY) ou tente novamente mais tarde.",
      );
    }
    throw new HttpError(500, message || "Erro ao comunicar com o serviço de pagamento. Tente novamente.");
  }

  await trackPricingEvent(context, {
    userId,
    event: "checkout_started",
    sessionId: session.id,
    toPlan: paymentPlanId,
    processor: paymentProcessor.id ?? "stripe",
    interval,
  });

  return {
    sessionUrl: session.url,
    sessionId: session.id,
  };
};

export const getCustomerPortalUrl: GetCustomerPortalUrl<
  void,
  string | null
> = async (_args, context) => {
  if (!context.user) {
    throw new HttpError(401, "Only authenticated users are allowed to perform this operation");
  }
  return paymentProcessor.fetchCustomerPortalUrl({
    userId: context.user.id,
    prismaUserDelegate: context.entities.User,
  });
};

/**
 * Resolve the user's current subscription interval ('month' | 'year' | null)
 * and effective plan by reading the active subscription from Stripe at runtime.
 * Falls back gracefully (interval = null) when there is no Stripe customer,
 * no active subscription, or the Stripe API is unreachable.
 */
export const getSubscriptionDetails: GetSubscriptionDetails<
  void,
  { interval: 'month' | 'year' | null; planId: PlanId; status: string | null }
> = async (_args, context) => {
  if (!context.user) {
    throw new HttpError(401, "Only authenticated users are allowed to perform this operation");
  }

  const user = await context.entities.User.findUnique({
    where: { id: context.user.id },
    select: { paymentProcessorUserId: true, subscriptionStatus: true, subscriptionPlan: true },
  });

  const fallback = {
    interval: null as 'month' | 'year' | null,
    planId: resolvePlanIdOrFree(user?.subscriptionPlan),
    status: user?.subscriptionStatus ?? null,
  };

  if (!user?.paymentProcessorUserId) return fallback;

  try {
    const sub = (await listManageableSubscriptions(user.paymentProcessorUserId))[0];
    if (!sub) return fallback;

    const rawInterval =
      sub.items.data[0]?.price?.recurring?.interval ??
      sub.items.data[0]?.plan?.interval ??
      null;
    const interval: 'month' | 'year' | null =
      rawInterval === 'month' || rawInterval === 'year' ? rawInterval : null;

    return { interval, planId: resolvePlanIdOrFree(user.subscriptionPlan), status: user.subscriptionStatus };
  } catch {
    // Stripe unavailable — degrade gracefully so the billing page still renders.
    return fallback;
  }
};

export const cancelSubscription: CancelSubscription<
  void,
  { success: boolean }
> = async (_args, context) => {
  if (!context.user) {
    throw new HttpError(401, "Only authenticated users are allowed to perform this operation.");
  }

  const user = await context.entities.User.findUnique({
    where: { id: context.user.id },
    select: { id: true, paymentProcessorUserId: true, subscriptionStatus: true },
  });

  if (!user?.paymentProcessorUserId) {
    throw new HttpError(400, "Nenhuma assinatura ativa encontrada.");
  }

  const subscriptions = await listManageableSubscriptions(user.paymentProcessorUserId);
  if (subscriptions.length === 0) {
    throw new HttpError(400, "Nenhuma assinatura ativa encontrada.");
  }

  try {
    // Schedule cancellation at period end for active or trialing subscriptions.
    // Access is preserved until the current period or trial expires.
    for (const subscription of subscriptions) {
      await stripeClient.subscriptions.update(subscription.id, {
        cancel_at_period_end: true,
      });
    }
  } catch (err: any) {
    console.error("Failed to schedule Stripe subscription cancellation:", err?.message || err);
  }

  // Set cancel_at_period_end — access continues until webhook fires subscription.deleted.
  // Do NOT zero out subscriptionPlan or cascade cancel yet.
  await context.entities.User.update({
    where: { id: context.user.id },
    data: {
      subscriptionStatus: SubscriptionStatus.CancelAtPeriodEnd,
    },
  });

  return { success: true };
};

export const changeSubscriptionPlan: ChangeSubscriptionPlan<
  { planId: string; interval?: 'monthly' | 'annual' },
  { success: boolean }
> = async (rawInput, context) => {
  if (!context.user) {
    throw new HttpError(401, "Only authenticated users are allowed to perform this operation.");
  }

  const { planId: paymentPlanId, interval } = rawInput;
  const userId = context.user.id;

  const user = await context.entities.User.findUnique({
    where: { id: userId },
    select: { id: true, paymentProcessorUserId: true, subscriptionStatus: true },
  });

  if (!user?.paymentProcessorUserId) {
    throw new HttpError(400, "Nenhuma assinatura ativa encontrada para alterar.");
  }

  const paymentPlan = paymentPlans[paymentPlanId as PaymentPlanId];
  if (!paymentPlan || paymentPlanId === PaymentPlanId.CatechistFree) {
    throw new HttpError(400, "Plano inválido para alteração.");
  }

  try {
    const priceId = requireStripePriceId(paymentPlan, interval || 'monthly');

    // Find the current active/trialing subscription via Stripe customer ID
    const stripeSubscriptionId = (await listManageableSubscriptions(user.paymentProcessorUserId))[0]?.id;
    if (!stripeSubscriptionId) {
      throw new HttpError(400, "Nenhuma assinatura ativa encontrada para alterar.");
    }

    const subscription = await stripeClient.subscriptions.retrieve(stripeSubscriptionId);
    const itemId = subscription.items.data[0]?.id;

    await stripeClient.subscriptions.update(stripeSubscriptionId, {
      items: [{ id: itemId, price: priceId }],
      proration_behavior: 'always_invoice',
      metadata: { fromPlan: user.subscriptionStatus || '', toPlan: paymentPlanId },
    });

    await context.entities.User.update({
      where: { id: userId },
      data: { subscriptionPlan: paymentPlanId },
    });
  } catch (err: any) {
    console.error("Failed to change subscription plan:", err?.message || err);
    throw new HttpError(500, "Erro ao alterar plano. Tente novamente ou contacte o suporte.");
  }

  return { success: true };
};
