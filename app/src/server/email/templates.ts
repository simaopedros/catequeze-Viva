import {
  EMAIL_MESSAGE,
  type EmailMessageId,
} from "../../shared/emailCatalog";
import { getEmailsCopy, interpolate, resolveCampaignCopy } from "../lifecycle/copy";
import type { ServerLocale } from "../i18n/serverLocale";
import { renderBrandedEmail } from "../../emails/renderEmail";
import type { LifecycleCampaign } from "../lifecycle/selectCampaign";

export type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
  heading: string;
};

type Payload = Record<string, unknown>;

function str(payload: Payload, key: string, fallback = ""): string {
  const value = payload[key];
  return typeof value === "string" ? value : fallback;
}

const LIFECYCLE_MESSAGE_TO_CAMPAIGN: Partial<
  Record<EmailMessageId, LifecycleCampaign>
> = {
  [EMAIL_MESSAGE.LIFECYCLE_ACTIVATE_CREATE_CLASS]: "activate_create_class",
  [EMAIL_MESSAGE.LIFECYCLE_ACTIVATE_ADD_PEOPLE]: "activate_add_people",
  [EMAIL_MESSAGE.LIFECYCLE_ACTIVATE_FIRST_ACTION]: "activate_first_action",
  [EMAIL_MESSAGE.LIFECYCLE_CONVERT_AFTER_VALUE]: "convert_after_value",
  [EMAIL_MESSAGE.LIFECYCLE_TRIAL_D3]: "trial_d3",
  [EMAIL_MESSAGE.LIFECYCLE_TRIAL_D1]: "trial_d1",
  [EMAIL_MESSAGE.LIFECYCLE_WINBACK_D1]: "winback_d1",
  [EMAIL_MESSAGE.LIFECYCLE_WINBACK_D3]: "winback_d3",
  [EMAIL_MESSAGE.LIFECYCLE_WINBACK_D7]: "winback_d7",
};

export function renderCatalogEmail(
  messageId: EmailMessageId,
  locale: ServerLocale,
  payload: Payload,
): RenderedEmail {
  const ns = getEmailsCopy(locale);
  const footerExtra = str(payload, "unsubscribeUrl")
    ? `${ns.footer_reason}<br/><a href="${str(payload, "unsubscribeUrl")}" style="color:#64748b">${ns.unsubscribe}</a>`
    : ns.footer_reason;

  const campaign = LIFECYCLE_MESSAGE_TO_CAMPAIGN[messageId];
  if (campaign) {
    const copy = resolveCampaignCopy(
      campaign,
      locale,
      {
        hasClasses: Boolean(payload.hasClasses),
        hasPeople: Boolean(payload.hasPeople),
        firstValueReached: Boolean(payload.firstValueReached),
      },
      {
        name: str(payload, "name"),
        className: str(payload, "className"),
        trialEndsAt: str(payload, "trialEndsAt"),
        price: str(payload, "price"),
      },
    );
    const rendered = renderBrandedEmail({
      heading: copy.heading,
      body: copy.body,
      ctaLabel: copy.cta,
      ctaUrl: str(payload, "ctaUrl"),
      footer: `${copy.footerReason} ${copy.unsubscribeLabel}: ${str(payload, "unsubscribeUrl")}`,
    });
    return { ...rendered, subject: copy.subject, heading: copy.heading };
  }

  if (messageId === EMAIL_MESSAGE.LIFECYCLE_WELCOME) {
    const subject = interpolate(ns.welcome.subject, {
      name: str(payload, "name", ns.fallback_name),
    });
    const rendered = renderBrandedEmail({
      heading: ns.welcome.heading,
      body: interpolate(ns.welcome.body, {
        name: str(payload, "name", ns.fallback_name),
      }),
      ctaLabel: ns.welcome.cta,
      ctaUrl: str(payload, "ctaUrl"),
      footer: footerExtra,
    });
    return { ...rendered, subject, heading: ns.welcome.heading };
  }

  if (
    messageId === EMAIL_MESSAGE.INVITE_FAMILY ||
    messageId === EMAIL_MESSAGE.INVITE_STAFF
  ) {
    const block =
      messageId === EMAIL_MESSAGE.INVITE_FAMILY ? ns.invite.family : ns.invite.staff;
    const vars = {
      location: str(payload, "location"),
      role: str(payload, "roleLabel"),
      link: str(payload, "link"),
    };
    const rendered = renderBrandedEmail({
      heading: interpolate(block.heading, vars),
      body: interpolate(block.body, vars),
      ctaLabel: block.cta,
      ctaUrl: vars.link,
      footer: ns.invite.footer,
    });
    return {
      ...rendered,
      subject: interpolate(block.subject, vars),
      heading: interpolate(block.heading, vars),
    };
  }

  if (messageId === EMAIL_MESSAGE.SUPPORT_REPLY) {
    const rendered = renderBrandedEmail({
      heading: ns.support_reply.heading,
      body: `${interpolate(ns.support_reply.greeting, { name: str(payload, "name") })}\n\n${ns.support_reply.intro}\n\n${str(payload, "body")}\n\n${ns.support_reply.outro}`,
      ctaLabel: ns.support_reply.cta,
      ctaUrl: str(payload, "ctaUrl"),
      footer: ns.support_reply.footer,
    });
    return {
      ...rendered,
      subject: ns.support_reply.subject,
      heading: ns.support_reply.heading,
    };
  }

  if (
    messageId === EMAIL_MESSAGE.BILLING_CANCELED ||
    messageId === EMAIL_MESSAGE.BILLING_PAYMENT_FAILED ||
    messageId === EMAIL_MESSAGE.BILLING_INSTITUTIONAL_TRIAL_D3 ||
    messageId === EMAIL_MESSAGE.BILLING_INSTITUTIONAL_TRIAL_D1
  ) {
    const key =
      messageId === EMAIL_MESSAGE.BILLING_CANCELED
        ? "canceled"
        : messageId === EMAIL_MESSAGE.BILLING_PAYMENT_FAILED
          ? "payment_failed"
          : messageId === EMAIL_MESSAGE.BILLING_INSTITUTIONAL_TRIAL_D3
            ? "institutional_trial_d3"
            : "institutional_trial_d1";
    const block = ns.billing[key];
    const vars = {
      name: str(payload, "name", ns.fallback_name),
      parishName: str(payload, "parishName"),
    };
    const rendered = renderBrandedEmail({
      heading: interpolate(block.heading, vars),
      body: interpolate(block.body, vars),
      ctaLabel: block.cta,
      ctaUrl: str(payload, "ctaUrl"),
      footer: ns.billing.footer,
    });
    return {
      ...rendered,
      subject: interpolate(block.subject, vars),
      heading: interpolate(block.heading, vars),
    };
  }

  if (
    messageId === EMAIL_MESSAGE.PASTORAL_ANNOUNCEMENT ||
    messageId === EMAIL_MESSAGE.PASTORAL_MESSAGE ||
    messageId === EMAIL_MESSAGE.PRODUCT_BROADCAST
  ) {
    const heading = str(payload, "subject") || str(payload, "heading");
    const rendered = renderBrandedEmail({
      heading,
      body: str(payload, "body"),
      ctaLabel: str(payload, "ctaLabel") || undefined,
      ctaUrl: str(payload, "ctaUrl") || undefined,
      footer: str(payload, "footer") || ns.broadcast.footer,
    });
    return { ...rendered, subject: heading, heading };
  }

  if (
    messageId === EMAIL_MESSAGE.AUTH_VERIFY ||
    messageId === EMAIL_MESSAGE.AUTH_PASSWORD_RESET
  ) {
    const heading = str(payload, "subject");
    const rendered = renderBrandedEmail({
      heading,
      body: str(payload, "body"),
      ctaLabel: str(payload, "ctaLabel"),
      ctaUrl: str(payload, "link"),
      footer: str(payload, "footer"),
    });
    return { ...rendered, subject: heading, heading };
  }

  const heading = str(payload, "subject") || messageId;
  const rendered = renderBrandedEmail({
    heading,
    body: str(payload, "body"),
    ctaUrl: str(payload, "ctaUrl") || undefined,
    footer: footerExtra,
  });
  return { ...rendered, subject: heading, heading };
}
