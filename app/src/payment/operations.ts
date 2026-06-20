import { HttpError } from "wasp/server";
import type {
  GenerateCheckoutSession,
  GetCustomerPortalUrl,
  CancelSubscription,
  ChangeSubscriptionPlan,
} from "wasp/server/operations";
import * as z from "zod";
import { PaymentPlanId, paymentPlans, SubscriptionStatus } from "../payment/plans";
import { validateOrThrow } from "../server/validation";
import { paymentProcessor } from "./paymentProcessor";
import { stripeClient } from "./stripe/stripeClient";
import { requireStripePriceId } from "./paymentProcessorPlans";
import { PRICING_VERSION, isSubscriptionActiveLike } from "../shared/pricing";

/**
 * Detect the client's country from request headers.
 * Uses Cloudflare's `cf-ipcountry` header when behind Cloudflare proxy,
 * falls back to `Accept-Language` header parsing.
 */
function getClientCountry(context: any): string | undefined {
  // Wasp operations use context.req (Express request), not context.request
  const req = context?.req || context?.request;
  const headers = req?.headers;
  if (!headers) return undefined;

  // Cloudflare IP country header (most reliable)
  const cfCountry = headers['cf-ipcountry'];
  if (typeof cfCountry === 'string' && cfCountry.length === 2) {
    return cfCountry.toUpperCase();
  }

  // Fallback: parse Accept-Language (e.g. "pt-BR,pt;q=0.9,en;q=0.8")
  const acceptLang = headers['accept-language'];
  if (typeof acceptLang === 'string') {
    const match = acceptLang.match(/[a-z]{2}-([A-Z]{2})/);
    if (match) return match[1];
  }

  return undefined;
}

export type CheckoutSession = {
  sessionUrl: string | null;
  sessionId: string;
};

const generateCheckoutSessionSchema = z.object({
  planId: z.nativeEnum(PaymentPlanId),
  interval: z.enum(['monthly', 'annual']).optional().default('monthly'),
  currency: z.enum(['BRL', 'USD']).optional(),
});

type GenerateCheckoutSessionInput = z.infer<typeof generateCheckoutSessionSchema>;

// Institutional plan IDs (including legacy "parish")
const INSTITUTIONAL_PLAN_IDS: string[] = ['parish', 'parish_essential', 'parish_complete', 'diocese'];

export const generateCheckoutSession: GenerateCheckoutSession<
  GenerateCheckoutSessionInput,
  CheckoutSession
> = async (rawInput, context) => {
  if (!context.user) {
    throw new HttpError(401, "Only authenticated users are allowed to perform this operation");
  }

  const { planId: paymentPlanId, interval, currency: inputCurrency } = validateOrThrow(
    generateCheckoutSessionSchema,
    rawInput,
  );
  const userId = context.user.id;
  const userEmail = context.user.email;
  if (!userEmail) {
    throw new HttpError(403, "User needs an email to make a payment.");
  }

  const paymentPlan = paymentPlans[paymentPlanId];

  // CatechistFree cannot be purchased
  if (paymentPlanId === PaymentPlanId.CatechistFree) {
    throw new HttpError(400, 'O plano Catequista Grátis não requer pagamento.');
  }

  // Institutional plans require a parish (or diocese admin for diocese plan)
  if (INSTITUTIONAL_PLAN_IDS.includes(paymentPlanId) && !context.user.isAdmin) {
    if (paymentPlanId === 'diocese') {
      const dioceseAdmin = await (context.entities as any).Membership.findFirst({
        where: { userId: context.user.id, role: 'DIOCESE_ADMIN', status: 'ACTIVE' },
      });
      if (!dioceseAdmin) {
        throw new HttpError(
          403,
          'O plano Diocese requer que você seja administrador de uma diocese. Peça ao administrador da plataforma para atribuir essa função.',
        );
      }
    } else {
      // Accept parish owner OR coordinator+ membership on an institutional parish
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
          'O plano institucional requer que você crie ou seja administrador de uma paróquia antes de contratá-lo. Planos pessoais (Catequista Pro/IA) cobrem apenas o seu espaço pessoal.',
        );
      }
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

  // Track checkout_started event (for abandonment funnel)
  try {
    await (context.entities as any).PricingEvent.create({
      data: {
        userId,
        event: 'checkout_started',
        sessionId: '', // will be updated after session creation
        toPlan: paymentPlanId,
        processor: paymentProcessor.id ?? 'stripe',
        interval,
        pricingVersion: PRICING_VERSION,
      },
    });
  } catch {
    // Non-critical — don't block checkout
  }

  let session;
  try {
    // Prefer country detected on the server when available. The client-provided
    // currency is a fallback for local/dev or deployments without country headers.
    const clientCountry = getClientCountry(context);
    const currency = clientCountry
      ? clientCountry === 'BR' ? 'BRL' : 'USD'
      : inputCurrency || 'USD';

    const result = await paymentProcessor.createCheckoutSession({
      userId,
      userEmail,
      paymentPlan,
      interval,
      currency,
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

  try {
    // Schedule cancellation at period end — do NOT cancel immediately.
    // Access is preserved until the current period expires.
    const subscriptions = await stripeClient.subscriptions.list({
      customer: user.paymentProcessorUserId,
      status: "active",
    });
    for (const subscription of subscriptions.data) {
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

    // Find the active subscription via Stripe customer ID
    const subscriptions = await stripeClient.subscriptions.list({
      customer: user.paymentProcessorUserId,
      status: 'active',
      limit: 1,
    });
    const stripeSubscriptionId = subscriptions.data[0]?.id;
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
