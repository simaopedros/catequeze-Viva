/**
 * One-off trial extension notice (Oct 2026) — hardcoded pt-BR copy.
 * Do not add en/es bundles; all locales use these strings.
 */

import { APP_TIMEZONE } from "../../shared/calendarDate";
import { interpolate } from "./copy";

export const TRIAL_EXTENSION_CAMPAIGN = "trial_extension_2026_10" as const;

export const TRIAL_EXTENSION_FALLBACK_NAME = "catequista";
export const TRIAL_EXTENSION_FALLBACK_CLASS = "sua turma";

export const TRIAL_EXTENSION_FOOTER_REASON =
  "Você recebe este e-mail porque criou uma conta no Catechis.";
export const TRIAL_EXTENSION_UNSUBSCRIBE_LABEL =
  "Não quero mais estes e-mails";

export type TrialExtensionVariant = "A" | "B";

type VariantCopy = {
  subject: string;
  preheader: string;
  body: string;
  cta: string;
};

export const TRIAL_EXTENSION_COPY: Record<TrialExtensionVariant, VariantCopy> =
  {
    A: {
      subject: "Liberamos mais 14 dias para sua turma, sem cartão",
      preheader: "Seu acesso ao Catechis está ativo de novo até {{data}}",
      body: "Olá, {{nome}}. Ajustamos o período de teste do Catechis e reabrimos seu acesso por mais 14 dias, até {{data}}, sem precisar de cartão. Sua turma {{turma}} e tudo o que você já registrou continuam salvos. Aproveite para lançar a presença e preparar os próximos encontros. Se quiser continuar depois, basta assinar o Plano Catequista na área Assinatura.",
      cta: "Abrir minha turma",
    },
    B: {
      subject: "Mais 7 dias grátis para começar sua catequese",
      preheader: "Crie a primeira turma em poucos minutos, sem cartão",
      body: "Olá, {{nome}}. Reabrimos seu teste do Catechis por mais 7 dias, até {{data}}, sem cartão. Leva cerca de 2 minutos para criar a primeira turma e começar a chamada e os encontros num só lugar.",
      cta: "Criar minha turma",
    },
  };

export function selectTrialExtensionVariant(
  hasClassInMembershipParish: boolean,
): TrialExtensionVariant {
  return hasClassInMembershipParish ? "A" : "B";
}

/** CTA A: first class page when available, else /app. CTA B: create class. */
export function resolveTrialExtensionCtaPath(
  variant: TrialExtensionVariant,
  firstClassId?: string | null,
): string {
  if (variant === "B") return "/app/classes/new";
  return firstClassId ? `/app/classes/${firstClassId}` : "/app";
}

export function formatTrialEndsAtSaoPaulo(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: APP_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export type TrialExtensionCopyVars = {
  nome: string;
  data: string;
  turma: string;
};

export function resolveTrialExtensionCopy(
  variant: TrialExtensionVariant,
  vars: TrialExtensionCopyVars,
): {
  subject: string;
  heading: string;
  preheader: string;
  body: string;
  cta: string;
  footerReason: string;
  unsubscribeLabel: string;
} {
  const filled = {
    nome: vars.nome.trim() || TRIAL_EXTENSION_FALLBACK_NAME,
    data: vars.data,
    turma: vars.turma.trim() || TRIAL_EXTENSION_FALLBACK_CLASS,
  };
  const block = TRIAL_EXTENSION_COPY[variant];
  const subject = interpolate(block.subject, filled);
  return {
    subject,
    heading: subject,
    preheader: interpolate(block.preheader, filled),
    body: interpolate(block.body, filled),
    cta: interpolate(block.cta, filled),
    footerReason: TRIAL_EXTENSION_FOOTER_REASON,
    unsubscribeLabel: TRIAL_EXTENSION_UNSUBSCRIBE_LABEL,
  };
}
