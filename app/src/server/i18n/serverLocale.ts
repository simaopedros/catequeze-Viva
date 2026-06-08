/**
 * Server-side locale helpers for dates and user locale resolution.
 */

export type ServerLocale = 'pt-BR' | 'en' | 'es';

const INTL_LOCALE_MAP: Record<ServerLocale, string> = {
  'pt-BR': 'pt-BR',
  es: 'es',
  en: 'en-US',
};

export function resolveUserLocale(user?: { locale?: string | null } | null): ServerLocale {
  const locale = user?.locale;
  if (locale === 'en' || locale === 'es' || locale === 'pt-BR') return locale;
  return 'pt-BR';
}

export function resolveIntlLocale(locale: ServerLocale): string {
  return INTL_LOCALE_MAP[locale] ?? 'pt-BR';
}

export function formatServerDate(
  date: Date | string | number,
  locale: ServerLocale,
  options?: Intl.DateTimeFormatOptions,
): string {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString(resolveIntlLocale(locale), options);
}

const PERIOD_LABELS: Record<ServerLocale, Record<string, string>> = {
  'pt-BR': {
    month: 'Último mês',
    quarter: 'Último trimestre',
    year: 'Último ano',
    all: 'Todo o período',
  },
  en: {
    month: 'Last month',
    quarter: 'Last quarter',
    year: 'Last year',
    all: 'All period',
  },
  es: {
    month: 'Último mes',
    quarter: 'Último trimestre',
    year: 'Último año',
    all: 'Todo el período',
  },
};

export function getPeriodLabel(period: string, locale: ServerLocale): string {
  return PERIOD_LABELS[locale]?.[period] ?? PERIOD_LABELS['pt-BR'][period] ?? period;
}

const MEETING_REMINDER: Record<ServerLocale, { title: string; classFallback: string }> = {
  'pt-BR': { title: 'Encontro amanhã', classFallback: 'Turma' },
  en: { title: 'Meeting tomorrow', classFallback: 'Class' },
  es: { title: 'Encuentro mañana', classFallback: 'Grupo' },
};

export function getMeetingReminderNotification(
  locale: ServerLocale,
  className: string | undefined,
  meetingTitle: string,
  date: Date,
): { title: string; body: string } {
  const t = MEETING_REMINDER[locale] ?? MEETING_REMINDER['pt-BR'];
  const name = className || t.classFallback;
  const dateStr = formatServerDate(date, locale);
  return {
    title: t.title,
    body: `${name}: "${meetingTitle}" — ${dateStr}`,
  };
}
