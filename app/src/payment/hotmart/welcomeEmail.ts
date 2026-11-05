import { EMAIL_MESSAGE } from "../../shared/emailCatalog";

export const HOTMART_SIGNUP_URL = "https://catechis.app/signup";
export const HOTMART_HELP_EMAIL = "contato@catechis.app";

export type HotmartWelcomeCopy = {
  subject: string;
  heading: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
  text: string;
};

/** Impersonal pt-BR copy for a Hotmart Plano Catequista purchase without a confirmed account. */
export function buildHotmartWelcomeCopy(): HotmartWelcomeCopy {
  const subject = "Sua compra do Plano Catequista no Catechis";
  const heading = "Bem-vindo ao Catechis";
  const body = [
    "Obrigado pela compra do Plano Catequista.",
    "",
    `Para liberar o acesso, crie sua conta em ${HOTMART_SIGNUP_URL} usando o mesmo e-mail da compra. Se você já se cadastrou, confirme esse e-mail.`,
    "",
    "Assim que a conta estiver confirmada com esse e-mail, o plano é liberado automaticamente.",
    "",
    `Se a compra foi feita com outro e-mail, escreva para ${HOTMART_HELP_EMAIL} que ajudamos a vincular.`,
  ].join("\n");
  const ctaLabel = "Criar conta";
  const ctaUrl = HOTMART_SIGNUP_URL;
  const text = `${heading}\n\n${body}\n\n${ctaLabel}: ${ctaUrl}`;
  return { subject, heading, body, ctaLabel, ctaUrl, text };
}

export function hotmartWelcomeIdempotencyKey(transaction: string | null, eventId: string): string {
  const key = (transaction || eventId || "").trim();
  return `hotmart.purchase_welcome:${key || "unknown"}`;
}

/**
 * Sends the one-shot welcome email when a PURCHASE_APPROVED could not activate a confirmed account.
 * Never throws: webhook processing must continue even if delivery fails.
 */
export async function sendHotmartWelcomeEmailSafe(args: {
  email: string | null | undefined;
  transaction: string | null;
  eventId: string;
  userId?: string | null;
  context?: { entities?: any };
}): Promise<"sent" | "skipped" | "failed"> {
  const to = (args.email || "").trim().toLowerCase();
  if (!to) return "skipped";
  const copy = buildHotmartWelcomeCopy();
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
      idempotencyKey: hotmartWelcomeIdempotencyKey(args.transaction, args.eventId),
      context: args.context,
    });
    return "sent";
  } catch (error) {
    console.warn(
      `[hotmart] welcome_email_failed id=${args.eventId} reason=${
        error instanceof Error ? error.message : "unknown"
      }`,
    );
    return "failed";
  }
}
