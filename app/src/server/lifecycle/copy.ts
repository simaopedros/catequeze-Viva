import { emails_en } from "../../i18n/resources_en";
import { emails_es } from "../../i18n/resources_es";
import { emails_pt_BR } from "../../i18n/resources_pt_BR";
import type { ServerLocale } from "../i18n/serverLocale";
import type { LifecycleCampaign } from "./selectCampaign";

type SimpleCampaignCopy = {
  subject: string;
  heading: string;
  body: string;
  cta: string;
};

type TrialCampaignCopy = {
  subject: string;
  heading: string;
  body_no_class: string;
  body_no_people: string;
  body_no_action: string;
  body_value: string;
  cta_next_step: string;
  cta_billing: string;
};

type EmailsNs = {
  fallback_name: string;
  fallback_class: string;
  footer_reason: string;
  unsubscribe: string;
  unsubscribed_title: string;
  unsubscribed_body: string;
  unsubscribe_invalid_title: string;
  unsubscribe_invalid_body: string;
  campaigns: {
    activate_create_class: SimpleCampaignCopy;
    activate_add_people: SimpleCampaignCopy;
    activate_first_action: SimpleCampaignCopy;
    convert_after_value: SimpleCampaignCopy;
    trial_d3: TrialCampaignCopy;
    trial_d1: TrialCampaignCopy;
    winback_d1: SimpleCampaignCopy;
    winback_d3: SimpleCampaignCopy;
    winback_d7: SimpleCampaignCopy;
  };
};

const BUNDLES: Record<ServerLocale, EmailsNs> = {
  "pt-BR": emails_pt_BR as unknown as EmailsNs,
  en: emails_en as unknown as EmailsNs,
  es: emails_es as unknown as EmailsNs,
};

export type CampaignCopyVars = {
  name: string;
  className: string;
  trialEndsAt: string;
  price: string;
};

export type CampaignCopyFlags = {
  hasClasses: boolean;
  hasPeople: boolean;
  firstValueReached: boolean;
};

export type ResolvedCampaignCopy = {
  subject: string;
  heading: string;
  body: string;
  cta: string;
  footerReason: string;
  unsubscribeLabel: string;
};

const TRIAL_CAMPAIGNS = new Set<LifecycleCampaign>(["trial_d3", "trial_d1"]);

export function interpolate(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(
    /\{\{(\w+)\}\}/g,
    (_, key: string) => vars[key] ?? "",
  );
}

export function getEmailsCopy(locale: ServerLocale): EmailsNs {
  return BUNDLES[locale] ?? BUNDLES["pt-BR"];
}

export function resolveCampaignCopy(
  campaign: LifecycleCampaign,
  locale: ServerLocale,
  flags: CampaignCopyFlags,
  vars: CampaignCopyVars,
): ResolvedCampaignCopy {
  const ns = getEmailsCopy(locale);
  const filled = {
    name: vars.name || ns.fallback_name,
    className: vars.className || ns.fallback_class,
    trialEndsAt: vars.trialEndsAt,
    price: vars.price,
  };

  if (TRIAL_CAMPAIGNS.has(campaign)) {
    const block = ns.campaigns[campaign as "trial_d3" | "trial_d1"];
    let body = block.body_no_action;
    if (flags.firstValueReached) body = block.body_value;
    else if (!flags.hasClasses) body = block.body_no_class;
    else if (!flags.hasPeople) body = block.body_no_people;
    const cta = flags.firstValueReached
      ? block.cta_billing
      : block.cta_next_step;
    return {
      subject: interpolate(block.subject, filled),
      heading: interpolate(block.heading, filled),
      body: interpolate(body, filled),
      cta: interpolate(cta, filled),
      footerReason: ns.footer_reason,
      unsubscribeLabel: ns.unsubscribe,
    };
  }

  const block = ns.campaigns[campaign] as SimpleCampaignCopy;
  return {
    subject: interpolate(block.subject, filled),
    heading: interpolate(block.heading, filled),
    body: interpolate(block.body, filled),
    cta: interpolate(block.cta, filled),
    footerReason: ns.footer_reason,
    unsubscribeLabel: ns.unsubscribe,
  };
}
