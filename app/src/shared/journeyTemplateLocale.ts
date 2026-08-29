export function matchesJourneyTemplateLocale(
  template: { locale?: string | null; parishId?: string | null },
  uiLocale: string,
): boolean {
  const locale = (template.locale || '').trim();
  if (!locale) return Boolean(template.parishId);
  return locale === uiLocale;
}

export function filterJourneyTemplatesByLocale<
  T extends { locale?: string | null; parishId?: string | null },
>(templates: T[], uiLocale: string): T[] {
  return templates.filter((template) =>
    matchesJourneyTemplateLocale(template, uiLocale),
  );
}
