import {
  EMAIL_MESSAGE,
  PRODUCT_EVENT,
  type ProductEventName,
} from "../../shared/emailCatalog";
import { appBaseUrl } from "./config";
import { getEmailProvider } from "./factory";
import { logger } from "../logger";
import type { ServerLocale } from "../i18n/serverLocale";
import { enqueueEmail } from "./service";

export type ProductEventInput = {
  name: ProductEventName;
  email?: string | null;
  userId?: string;
  firstName?: string | null;
  lastName?: string | null;
  locale?: ServerLocale;
  isFamilyPortal?: boolean;
  isPaid?: boolean;
  properties?: Record<string, unknown>;
  context?: { entities?: any };
};

export async function emitProductEvent(input: ProductEventInput): Promise<void> {
  const email = input.email?.trim();
  if (!email) return;

  const provider = getEmailProvider();
  try {
    await provider.upsertContact({
      email,
      firstName: input.firstName,
      lastName: input.lastName,
      locale: input.locale,
      unsubscribed: false,
      properties: {
        userId: input.userId || "",
        locale: input.locale || "pt-BR",
        paid: Boolean(input.isPaid),
        family: Boolean(input.isFamilyPortal),
        event: input.name,
      },
    });
    await provider.emitEvent({
      name: input.name,
      email,
      userId: input.userId,
      properties: input.properties,
    });
  } catch (error) {
    logger.warn("[email] product event provider failed", {
      event: input.name,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  try {
    await orchestrateInApp(input, email);
  } catch (error) {
    logger.warn("[email] product event orchestration failed", {
      event: input.name,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function orchestrateInApp(input: ProductEventInput, email: string) {
  const locale = input.locale || "pt-BR";
  const billingUrl = `${appBaseUrl()}/app/billing`;
  const appUrl = `${appBaseUrl()}/app`;

  if (
    input.name === PRODUCT_EVENT.USER_SIGNED_UP &&
    !input.isFamilyPortal &&
    input.userId
  ) {
    await enqueueEmail({
      messageId: EMAIL_MESSAGE.LIFECYCLE_WELCOME,
      to: email,
      userId: input.userId,
      locale,
      payload: {
        name: input.firstName || "",
        ctaUrl: appUrl,
      },
      idempotencyKey: `lifecycle.welcome:${input.userId}`,
      context: input.context,
    });
    return;
  }

  if (input.name === PRODUCT_EVENT.PAYMENT_FAILED && input.userId) {
    await enqueueEmail({
      messageId: EMAIL_MESSAGE.BILLING_PAYMENT_FAILED,
      to: email,
      userId: input.userId,
      locale,
      payload: { name: input.firstName || "", ctaUrl: billingUrl },
      idempotencyKey: `billing.payment_failed:${input.userId}:${new Date().toISOString().slice(0, 10)}`,
      context: input.context,
    });
  }

  if (input.name === PRODUCT_EVENT.SUBSCRIPTION_CANCELED && input.userId) {
    await enqueueEmail({
      messageId: EMAIL_MESSAGE.BILLING_CANCELED,
      to: email,
      userId: input.userId,
      locale,
      payload: { name: input.firstName || "", ctaUrl: billingUrl },
      idempotencyKey: `billing.canceled:${input.userId}:${new Date().toISOString().slice(0, 10)}`,
      context: input.context,
    });
  }
}

export function emitProductEventSafe(input: ProductEventInput): void {
  void emitProductEvent(input).catch((error) => {
    logger.warn("[email] emitProductEventSafe", {
      error: error instanceof Error ? error.message : String(error),
    });
  });
}
