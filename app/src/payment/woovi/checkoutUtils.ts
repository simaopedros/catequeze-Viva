import { randomUUID } from "crypto";
import { env } from "wasp/server";
import { User } from "wasp/entities";
import type { PaymentPlan } from "../plans";
import { PaymentPlanId } from "../plans";
import { getPaymentProcessorPlanId } from "../paymentProcessorPlans";
import { wooviClient } from "./wooviClient";

/**
 * Creates a Woovi subscription (PIX Automático) or one-time charge (PIX Simples)
 * depending on the WOOVI_PIX_MODE env var.
 *
 * Returns the payment link URL for the user to complete payment.
 */
export async function createWooviCheckout(args: {
  user: { id: User["id"]; email: string; firstName?: string | null; lastName?: string | null };
  paymentPlan: PaymentPlan;
}): Promise<{ sessionUrl: string; correlationID: string }> {
  const { user, paymentPlan } = args;
  const pixMode = env.WOOVI_PIX_MODE || "automatico";
  const planValueCents = getPlanValueCents(paymentPlan.id);
  const correlationID = `user-${user.id}-${paymentPlan.id}-${randomUUID().slice(0, 8)}`;
  const customerName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;
  const planComment = getPlanComment(paymentPlan.id);

  if (pixMode === "automatico") {
    return createSubscription({ correlationID, valueCents: planValueCents, customerName, userEmail: user.email, planComment });
  } else {
    return createCharge({ correlationID, valueCents: planValueCents, customerName, userEmail: user.email, planComment });
  }
}

/**
 * Creates a Woovi checkout for a parish/tenant plan.
 */
export async function createWooviParishCheckout(args: {
  parishId: string;
  parishName: string;
  adminEmail: string;
  paymentPlan: PaymentPlan;
}): Promise<{ sessionUrl: string; correlationID: string }> {
  const { parishId, parishName, adminEmail, paymentPlan } = args;
  const pixMode = env.WOOVI_PIX_MODE || "automatico";
  const planValueCents = getPlanValueCents(paymentPlan.id);
  const correlationID = `parish-${parishId}-${paymentPlan.id}-${randomUUID().slice(0, 8)}`;
  const planComment = getPlanComment(paymentPlan.id);

  if (pixMode === "automatico") {
    return createSubscription({ correlationID, valueCents: planValueCents, customerName: parishName, userEmail: adminEmail, planComment });
  } else {
    return createCharge({ correlationID, valueCents: planValueCents, customerName: parishName, userEmail: adminEmail, planComment });
  }
}

async function createSubscription(args: {
  correlationID: string;
  valueCents: number;
  customerName: string;
  userEmail: string;
  planComment: string;
}): Promise<{ sessionUrl: string; correlationID: string }> {
  const { correlationID, valueCents, customerName, userEmail, planComment } = args;

  const { data } = await wooviClient.post("/subscriptions", {
    correlationID,
    value: valueCents,
    interval: "MONTHLY",
    comment: planComment,
    customer: {
      name: customerName,
      email: userEmail,
    },
  });

  return {
    sessionUrl: data.subscription.paymentLinkUrl,
    correlationID,
  };
}

async function createCharge(args: {
  correlationID: string;
  valueCents: number;
  customerName: string;
  userEmail: string;
  planComment: string;
}): Promise<{ sessionUrl: string; correlationID: string }> {
  const { correlationID, valueCents, customerName, userEmail, planComment } = args;

  const { data } = await wooviClient.post("/charge", {
    correlationID,
    value: valueCents,
    comment: planComment,
    customer: {
      name: customerName,
      email: userEmail,
    },
  });

  return {
    sessionUrl: data.charge.paymentLinkUrl,
    correlationID,
  };
}

/** Cancels a Woovi subscription by its correlationID. */
export async function cancelWooviSubscription(correlationID: string): Promise<void> {
  await wooviClient.delete(`/subscriptions/${correlationID}`);
}

function getPlanValueCents(planId: PaymentPlanId): number {
  switch (planId) {
    case PaymentPlanId.CatechistPro:
      return 900; // R$ 9,00
    case PaymentPlanId.CatechistAi:
      return 2900; // R$ 29,00
    case PaymentPlanId.Parish:
      return 4900; // R$ 49,00
    case PaymentPlanId.Diocese:
      return 14900; // R$ 149,00
    default:
      throw new Error(`Plan ${planId} does not have a price`);
  }
}

function getPlanComment(planId: PaymentPlanId): string {
  switch (planId) {
    case PaymentPlanId.CatechistPro:
      return "Catequista Pro - mensal";
    case PaymentPlanId.CatechistAi:
      return "Catequista IA - mensal";
    case PaymentPlanId.Parish:
      return "Plano Paróquia - mensal";
    case PaymentPlanId.Diocese:
      return "Plano Diocese - mensal";
    default:
      return "Assinatura Catequese Viva";
  }
}
