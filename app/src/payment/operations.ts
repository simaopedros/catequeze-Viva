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

export type CheckoutSession = {
  sessionUrl: string | null;
  sessionId: string;
};

const generateCheckoutSessionSchema = z.nativeEnum(PaymentPlanId);

type GenerateCheckoutSessionInput = z.infer<
  typeof generateCheckoutSessionSchema
>;

export const generateCheckoutSession: GenerateCheckoutSession<
  GenerateCheckoutSessionInput,
  CheckoutSession
> = async (rawPaymentPlanId, context) => {
  if (!context.user) {
    throw new HttpError(
      401,
      "Only authenticated users are allowed to perform this operation",
    );
  }

  const paymentPlanId = validateOrThrow(
    generateCheckoutSessionSchema,
    rawPaymentPlanId,
  );
  const userId = context.user.id;
  const userEmail = context.user.email;
  if (!userEmail) {
    // If using the usernameAndPassword Auth method, switch to an Auth method that provides an email.
    throw new HttpError(403, "User needs an email to make a payment.");
  }

  const paymentPlan = paymentPlans[paymentPlanId];

  // CatechistFree cannot be purchased
  if (paymentPlanId === 'catechist_free') {
    throw new HttpError(400, 'O plano Catequista Grátis não requer pagamento.');
  }

  // Make the purchase SCOPE explicit:
  // - Personal plans (Pro/AI) always apply to the buyer's personal space.
  // - Institutional plans (Parish/Diocese) cover an institution and require the
  //   buyer to own a parish (so the license has a tenant to attach to).
  const isInstitutionalPlan = ['parish', 'diocese'].includes(paymentPlanId);
  if (isInstitutionalPlan && !context.user.isAdmin) {
    const ownedParish = await context.entities.Parish.findFirst({
      where: { ownerId: context.user.id, type: { not: "PERSONAL" } },
    });
    if (!ownedParish) {
      throw new HttpError(
        403,
        'O plano Paróquia/Diocese é institucional: crie ou seja dono de uma paróquia antes de contratá-lo. Planos pessoais (Catequista Pro/IA) cobrem apenas o seu espaço pessoal.',
      );
    }
  }

  let session;
  try {
    const result = await paymentProcessor.createCheckoutSession({
      userId,
      userEmail,
      paymentPlan,
      prismaUserDelegate: context.entities.User,
    });
    session = result.session;
  } catch (err: any) {
    const status = err?.response?.status ?? err?.statusCode;
    if (status === 401 || status === 403) {
      throw new HttpError(
        503,
        "Serviço de pagamento indisponível no momento. Verifique a configuração do Stripe (STRIPE_API_KEY) ou tente novamente mais tarde.",
      );
    }
    throw new HttpError(
      500,
      "Erro ao comunicar com o serviço de pagamento. Tente novamente.",
    );
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
    throw new HttpError(
      401,
      "Only authenticated users are allowed to perform this operation",
    );
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

  // Cancel the user's active Stripe subscription(s). We cancel immediately so
  // the in-app state and the tenant billing cascade stay consistent; the
  // `customer.subscription.deleted` webhook will also fire and is idempotent.
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
    // Continue anyway — mark as deleted locally even if the Stripe call fails.
  }

  // Mark user's subscription as deleted
  await context.entities.User.update({
    where: { id: context.user.id },
    data: {
      subscriptionStatus: SubscriptionStatus.Deleted,
      subscriptionPlan: null,
    },
  });

  // Downgrade every tenant billed through this user (owned parishes and
  // administered/owned dioceses) to CATECHIST_FREE — same cascade used by the
  // payment webhook.
  await cascadeCancelToTenantBilling(context, context.user.id);

  return { success: true };
};
