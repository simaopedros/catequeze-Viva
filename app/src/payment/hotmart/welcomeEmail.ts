import { EMAIL_MESSAGE } from "../../shared/emailCatalog";
import type { HotmartPlanSlug } from "./postback";
import {
  HOTMART_SET_PASSWORD_TTL_DAYS,
  createHotmartSetPasswordLink,
} from "./setPasswordLink";

export const HOTMART_LOGIN_URL = "https://catechis.app/login";
export const HOTMART_HELP_EMAIL = "contato@catechis.app";

export type HotmartPurchaseCopy = {
  subject: string;
  heading: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
  text: string;
};

function planPhrase(
  planSlug: HotmartPlanSlug | null | undefined,
  kind: "purchase" | "active",
): string {
  if (planSlug === "unlimited") {
    return kind === "purchase"
      ? "A compra foi confirmada e o acesso já está liberado para este e-mail."
      : "O plano está ativo para este e-mail. Para entrar, use o botão abaixo.";
  }
  return kind === "purchase"
    ? "A compra do Plano Catequista foi confirmada e o acesso já está liberado para este e-mail."
    : "O Plano Catequista está ativo para este e-mail. Para entrar, use o botão abaixo.";
}

function finishCopy(args: {
  subject: string;
  heading: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
}): HotmartPurchaseCopy {
  return {
    ...args,
    text: `${args.heading}\n\n${args.body}\n\n${args.ctaLabel}: ${args.ctaUrl}`,
  };
}

/** Account has no usable password yet. The link sets one and then the buyer can enter. */
export function buildHotmartAccessCopy(
  ctaUrl: string,
  planSlug?: HotmartPlanSlug | null,
): HotmartPurchaseCopy {
  const subject = "Seu acesso ao Catechis";
  const heading = "Seu acesso ao Catechis";
  const body = [
    "Olá,",
    "",
    planPhrase(planSlug, "purchase"),
    "",
    `Para entrar, defina uma senha pelo botão abaixo. O link expira em ${HOTMART_SET_PASSWORD_TTL_DAYS} dias e só pode ser usado uma vez.`,
    "",
    `Se precisar de ajuda, escreva para ${HOTMART_HELP_EMAIL}.`,
  ].join("\n");
  return finishCopy({
    subject,
    heading,
    body,
    ctaLabel: "Definir senha e entrar",
    ctaUrl,
  });
}

/** Confirmed account that already has a password. */
export function buildHotmartPlanActiveCopy(
  planSlug?: HotmartPlanSlug | null,
): HotmartPurchaseCopy {
  const subject = "Seu plano no Catechis está ativo";
  const heading = "Seu plano está ativo";
  const body = [
    "Olá,",
    "",
    planPhrase(planSlug, "active"),
    "",
    `Se precisar de ajuda, escreva para ${HOTMART_HELP_EMAIL}.`,
  ].join("\n");
  return finishCopy({
    subject,
    heading,
    body,
    ctaLabel: "Entrar",
    ctaUrl: HOTMART_LOGIN_URL,
  });
}

export function hotmartAccessIdempotencyKey(
  transaction: string | null,
  eventId: string,
): string {
  const key = (transaction || eventId || "").trim();
  return `hotmart.purchase_access:${key || "unknown"}`;
}

export function hotmartPlanActiveIdempotencyKey(
  transaction: string | null,
  eventId: string,
): string {
  const key = (transaction || eventId || "").trim();
  return `hotmart.purchase_active:${key || "unknown"}`;
}

type SendArgs = {
  email: string | null | undefined;
  transaction: string | null;
  eventId: string;
  userId?: string | null;
  planSlug?: HotmartPlanSlug | null;
  context?: { entities?: any };
};

async function deliver(
  args: SendArgs,
  copy: HotmartPurchaseCopy,
  idempotencyKey: string,
): Promise<"sent" | "skipped" | "failed"> {
  const to = (args.email || "").trim().toLowerCase();
  if (!to) return "skipped";
  try {
    const { enqueueEmail } = await import("../../server/email/service");
    await enqueueEmail({
      messageId: EMAIL_MESSAGE.BILLING_HOTMART_WELCOME,
      to,
      userId: args.userId || undefined,
      locale: "pt-BR",
      payload: {
        subject: copy.subject,
        heading: copy.heading,
        body: copy.body,
        ctaLabel: copy.ctaLabel,
        ctaUrl: copy.ctaUrl,
      },
      idempotencyKey,
      context: args.context,
    });
    return "sent";
  } catch (error) {
    console.warn(
      `[hotmart] purchase_email_failed id=${args.eventId} reason=${
        error instanceof Error ? error.message : "unknown"
      }`,
    );
    return "failed";
  }
}

/** Never throws. A delivery failure must not roll back the plan. */
export async function sendHotmartAccessEmailSafe(
  args: SendArgs,
): Promise<"sent" | "skipped" | "failed"> {
  const to = (args.email || "").trim().toLowerCase();
  if (!to) return "skipped";
  try {
    const ctaUrl = await createHotmartSetPasswordLink(to);
    return await deliver(
      args,
      buildHotmartAccessCopy(ctaUrl, args.planSlug),
      hotmartAccessIdempotencyKey(args.transaction, args.eventId),
    );
  } catch (error) {
    console.warn(
      `[hotmart] purchase_email_failed id=${args.eventId} reason=${
        error instanceof Error ? error.message : "unknown"
      }`,
    );
    return "failed";
  }
}

/** Never throws. A delivery failure must not roll back the plan. */
export async function sendHotmartPlanActiveEmailSafe(
  args: SendArgs,
): Promise<"sent" | "skipped" | "failed"> {
  return deliver(
    args,
    buildHotmartPlanActiveCopy(args.planSlug),
    hotmartPlanActiveIdempotencyKey(args.transaction, args.eventId),
  );
}
