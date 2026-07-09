import { HttpError } from "wasp/server";
import type {
  GenerateCheckoutSession,
  GetCustomerPortalUrl,
  GetSubscriptionDetails,
  CancelSubscription,
  ChangeSubscriptionPlan,
} from "wasp/server/operations";
import * as z from "zod";
import {
  PaymentPlanId,
  paymentPlans,
  SubscriptionStatus,
  prettyPaymentPlanName,
} from "../payment/plans";
import { validateOrThrow } from "../server/validation";
import { paymentProcessor } from "./paymentProcessor";
import { stripeClient } from "./stripe/stripeClient";
import { requireStripePriceId } from "./paymentProcessorPlans";
import {
  isSubscriptionActiveLike,
  resolvePlanIdOrFree,
  type PlanId,
  PLANS,
  SUBSCRIPTION_TRIAL_DAYS,
} from "../shared/pricing";
import { trackPricingEvent } from "./pricingEvents";
import { detectCurrency } from "../shared/currency";
import { sendInitiateCheckoutToMeta } from "./meta/sendInitiateCheckout";

export type CheckoutSession = {
  sessionUrl: string | null;
  sessionId: string;
};

const generateCheckoutSessionSchema = z.object({
  planId: z.nativeEnum(PaymentPlanId),
  interval: z.enum(["monthly", "annual"]).optional().default("monthly"),
  priceId: z.string().optional(),
  planName: z.string().optional(),
  value: z.number().nonnegative().optional(),
  currency: z.string().optional(),
  initiate_checkout_event_id: z.string().optional(),
  fbp: z.string().optional(),
  fbc: z.string().optional(),
  fbclid: z.string().optional(),
  client_user_agent: z.string().optional(),
  event_source_url: z.string().optional(),
  landing_page_url: z.string().optional(),
  referrer: z.string().optional(),
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
  utm_content: z.string().optional(),
  utm_term: z.string().optional(),
});

type GenerateCheckoutSessionInput = z.infer<typeof generateCheckoutSessionSchema>;

const INSTITUTIONAL_PLAN_IDS: PaymentPlanId[] = [PaymentPlanId.Unlimited];
const MANAGEABLE_SUBSCRIPTION_STATUSES = new Set(["trialing", "active", "past_due"]);

async function listManageableSubscriptions(customerId: string) {
  const subscriptions = await stripeClient.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 10,
  });

  return subscriptions.data.filter((subscription) =>
    MANAGEABLE_SUBSCRIPTION_STATUSES.has(subscription.status),
  );
}

function getCheckoutValue(
  paymentPlanId: PaymentPlanId,
  interval: "monthly" | "annual",
): number | undefined {
  if (paymentPlanId === PaymentPlanId.Single) {
    const cents = interval === "annual" ? PLANS.single.prices.annualCents ?? PLANS.single.prices.monthlyCents : PLANS.single.prices.monthlyCents;
    return Number((cents / 100).toFixed(2));
  }

  if (paymentPlanId === PaymentPlanId.Unlimited) {
    const cents = interval === "annual" ? PLANS.unlimited.prices.annualCents ?? PLANS.unlimited.prices.monthlyCents : PLANS.unlimited.prices.monthlyCents;
    return Number((cents / 100).toFixed(2));
  }

  return undefined;
}

export const generateCheckoutSession: GenerateCheckoutSession<
  GenerateCheckoutSessionInput,
  CheckoutSession
> = async (rawInput, context) => {
  if (!context.user) {
    throw new HttpError(401, "Only authenticated users are allowed to perform this operation");
  }

  const input = validateOrThrow(generateCheckoutSessionSchema, rawInput);
  const { planId: paymentPlanId, interval } = input;
  const userId = context.user.id;
  const userEmail = context.user.email;
  if (!userEmail) {
    throw new HttpError(403, "User needs an email to make a payment.");
  }

  const paymentPlan = paymentPlans[paymentPlanId];

  if (paymentPlanId === PaymentPlanId.CatechistFree) {
    throw new HttpError(400, 'O plano "Sem assinatura" não requer pagamento. Escolha um plano pago.');
  }

  if (INSTITUTIONAL_PLAN_IDS.includes(paymentPlanId) && !context.user.isAdmin) {
    const ownedParish = await context.entities.Parish.findFirst({
      where: { ownerId: context.user.id, type: { not: "PERSONAL" } },
    });
    const coordinatorMembership = !ownedParish
      ? await context.entities.Membership.findFirst({
          where: {
            userId: context.user.id,
            status: "ACTIVE",
            role: { in: ["PARISH_COORDINATOR", "COMMUNITY_COORDINATOR", "DIOCESE_ADMIN"] },
            parish: { type: { not: "PERSONAL" } },
          },
          select: { id: true },
        })
      : null;
    if (!ownedParish && !coordinatorMembership) {
      throw new HttpError(
        403,
        "O plano Ilimitado requer que você crie ou seja administrador de uma paróquia ou diocese antes de contratá-lo. O Plano Único cobre o seu espaço pessoal.",
      );
    }
  }

  const isInstitutionalPlan = INSTITUTIONAL_PLAN_IDS.includes(paymentPlanId);
  const freshUser = await context.entities.User.findUnique({
    where: { id: userId },
    select: { subscriptionStatus: true, subscriptionPlan: true },
  });
  const hasActiveSub = isSubscriptionActiveLike(freshUser?.subscriptionStatus);
  if (hasActiveSub && !isInstitutionalPlan) {
    throw new HttpError(
      409,
      "Você já possui uma assinatura ativa. Para trocar de plano, use a opção de alterar plano no portal de pagamento.",
    );
  }

  const planName = input.planName ?? prettyPaymentPlanName(paymentPlanId);
  const checkoutValue = input.value ?? getCheckoutValue(paymentPlanId, interval) ?? 0;
  const currency = input.currency ?? detectCurrency();
  const isCreditsPlan = paymentPlan.effect.kind === "credits";

  let session;
  try {
    const result = await paymentProcessor.createCheckoutSession({
      userId,
      userEmail,
      paymentPlan,
      interval,
      prismaUserDelegate: context.entities.User,
      tracking: {
        priceId: input.priceId,
        planId: paymentPlanId,
        planName,
        value: checkoutValue,
        currency,
        initiateCheckoutEventId: input.initiate_checkout_event_id,
        fbp: input.fbp,
        fbc: input.fbc,
        fbclid: input.fbclid,
        clientUserAgent: input.client_user_agent,
        eventSourceUrl: input.event_source_url,
        landingPageUrl: input.landing_page_url,
        referrer: input.referrer,
        utmSource: input.utm_source,
        utmMedium: input.utm_medium,
        utmCampaign: input.utm_campaign,
        utmContent: input.utm_content,
        utmTerm: input.utm_term,
      },
    });
    session = result.session;
  } catch (err: any) {
    const message = err?.message || "";
    if (message.includes("Stripe Price ID não configurado")) {
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

  // Same event_id as browser Pixel InitiateCheckout for Meta deduplication.
  // Fallback keeps CAPI coverage when the client omits the id.
  const initiateCheckoutEventId =
    input.initiate_checkout_event_id?.trim() ||
    `initiate_checkout_${session.id}`;

  await sendInitiateCheckoutToMeta({
    userId,
    email: userEmail,
    eventId: initiateCheckoutEventId,
    planId: paymentPlanId,
    planName,
    value: checkoutValue,
    currency,
    priceId: input.priceId,
    contentCategory: isCreditsPlan ? "ai_credits" : "subscription",
    trialDays: isCreditsPlan ? 0 : SUBSCRIPTION_TRIAL_DAYS,
    fbp: input.fbp,
    fbc: input.fbc,
    fbclid: input.fbclid,
    clientUserAgent: input.client_user_agent,
    eventSourceUrl: input.event_source_url,
    stripeSessionId: session.id,
    prisma: { trackedEvent: (context.entities as any).TrackedEvent },
    req: (context as any).req,
  });

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
    for (const subscription of subscriptions) {
      await stripeClient.subscriptions.update(subscription.id, {
        cancel_at_period_end: true,
      });
    }
  } catch (err: any) {
    console.error("Failed to schedule Stripe subscription cancellation:", err?.message || err);
  }

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
