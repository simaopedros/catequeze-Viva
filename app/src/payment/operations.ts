import { HttpError } from "wasp/server";
import type {
  GenerateCheckoutSession,
  GetCustomerPortalUrl,
  CancelSubscription,
} from "wasp/server/operations";
import * as z from "zod";
import { PaymentPlanId, paymentPlans, SubscriptionStatus } from "../payment/plans";
import { validateOrThrow } from "../server/validation";
import { paymentProcessor } from "./paymentProcessor";
import { stripeClient } from "./stripe/stripeClient";
import { cascadeCancelToTenantBilling } from "./billingCascade";
import { PRICING_VERSION } from "../shared/pricing";

export type CheckoutSession = {
  sessionUrl: string | null;
  sessionId: string;
};

const generateCheckoutSessionSchema = z.object({
  planId: z.nativeEnum(PaymentPlanId),
  interval: z.enum(['monthly', 'annual']).optional().default('monthly'),
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
      const ownedParish = await context.entities.Parish.findFirst({
        where: { ownerId: context.user.id, type: { not: "PERSONAL" } },
      });
      if (!ownedParish) {
        throw new HttpError(
          403,
          'O plano institucional requer que você crie ou seja dono de uma paróquia antes de contratá-lo. Planos pessoais (Catequista Pro/IA) cobrem apenas o seu espaço pessoal.',
        );
      }
    }
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
    const subscriptions = await stripeClient.subscriptions.list({
      customer: user.paymentProcessorUserId,
      status: "active",
    });
    for (const subscription of subscriptions.data) {
      await stripeClient.subscriptions.cancel(subscription.id);
    }
  } catch (err: any) {
    console.error("Failed to cancel Stripe subscription:", err?.message || err);
  }

  await context.entities.User.update({
    where: { id: context.user.id },
    data: {
      subscriptionStatus: SubscriptionStatus.Deleted,
      subscriptionPlan: null,
    },
  });

  await cascadeCancelToTenantBilling(context, context.user.id);

  return { success: true };
};
