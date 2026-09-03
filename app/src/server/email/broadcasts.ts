import { EMAIL_MESSAGE, EMAIL_TOPIC } from "../../shared/emailCatalog";
import type { ServerLocale } from "../i18n/serverLocale";
import { fromForStream } from "./config";
import { EMAIL_STREAM } from "../../shared/emailCatalog";
import { getEmailProvider } from "./factory";
import { getEmailPreferences } from "./preferences";
import { enqueueEmail } from "./service";
import { renderCatalogEmail } from "./templates";
import { isEmailSuppressed } from "./suppression";

export async function enqueueProductBroadcast(args: {
  to: string;
  userId?: string;
  locale?: ServerLocale;
  subject: string;
  body: string;
  ctaUrl?: string;
  context?: { entities?: any };
}) {
  const prefs = await getEmailPreferences({
    email: args.to,
    userId: args.userId,
    context: args.context,
  });
  if (!prefs[EMAIL_TOPIC.PRODUCT_UPDATES]) {
    return { skipped: "opted_out" as const };
  }
  if (await isEmailSuppressed(args.to, args.context)) {
    return { skipped: "suppressed" as const };
  }
  return enqueueEmail({
    messageId: EMAIL_MESSAGE.PRODUCT_BROADCAST,
    to: args.to,
    userId: args.userId,
    locale: args.locale || "pt-BR",
    payload: {
      subject: args.subject,
      heading: args.subject,
      body: args.body,
      ctaUrl: args.ctaUrl,
    },
    idempotencyKey: `product.broadcast:${args.to}:${args.subject}`,
    context: args.context,
  });
}

/** Provider-native Broadcasts (Resend) — used when a segment already lives there. */
export async function sendProviderBroadcast(args: {
  subject: string;
  body: string;
  locale?: ServerLocale;
}) {
  const rendered = renderCatalogEmail(
    EMAIL_MESSAGE.PRODUCT_BROADCAST,
    args.locale || "pt-BR",
    { subject: args.subject, heading: args.subject, body: args.body },
  );
  return getEmailProvider().sendBroadcast?.({
    subject: rendered.subject,
    html: rendered.html,
    from: fromForStream(EMAIL_STREAM.MARKETING),
    topic: EMAIL_TOPIC.PRODUCT_UPDATES,
  });
}
