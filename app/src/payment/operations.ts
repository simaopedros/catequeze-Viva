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
import { cancelWooviSubscription } from "./woovi/checkoutUtils";

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

  // Block Parish/Diocese purchase for users who don't own a parish
  if (['parish', 'diocese'].includes(paymentPlanId) && !context.user.isAdmin) {
    const ownedParish = await context.entities.Parish.findFirst({
      where: { ownerId: context.user.id },
    });
    if (!ownedParish) {
      throw new HttpError(
        403,
        'Apenas coordenadores donos de paróquia podem assinar planos Paróquia ou Diocese.',
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
    const status = err?.response?.status;
    if (status === 401 || status === 403) {
      throw new HttpError(
        503,
        "Serviço de pagamento indisponível no momento. Verifique a configuração do Woovi (WOOVI_APP_ID) ou tente novamente mais tarde.",
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
    select: { id: true, wooviCorrelationId: true, subscriptionStatus: true },
  });

  if (!user?.wooviCorrelationId) {
    throw new HttpError(400, "Nenhuma assinatura ativa encontrada.");
  }

  // Cancel on Woovi's side
  try {
    await cancelWooviSubscription(user.wooviCorrelationId);
  } catch (err: any) {
    console.error("Failed to cancel Woovi subscription:", err?.message || err);
    // Continue anyway — mark as deleted locally even if Woovi call fails
  }

  // Mark user's subscription as deleted
  await context.entities.User.update({
    where: { id: context.user.id },
    data: {
      subscriptionStatus: SubscriptionStatus.Deleted,
      subscriptionPlan: null,
      wooviCorrelationId: null,
    },
  });

  // Downgrade all parishes owned by this user to CATECHIST_FREE
  await context.entities.TenantBilling.updateMany({
    where: {
      parish: { ownerId: context.user.id },
    },
    data: {
      plan: "CATECHIST_FREE",
      status: "CANCELED",
      maxClasses: null,
      maxCatechumens: null,
    },
  });

  return { success: true };
};
