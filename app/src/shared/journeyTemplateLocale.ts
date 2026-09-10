export function matchesJourneyTemplateLocale(
  template: { locale?: string | null; parishId?: string | null },
  uiLocale: string,
): boolean {
  // Parish-owned templates are authored for that workspace — always visible.
  if (template.parishId) return true;
  const locale = (template.locale || "").trim();
  // Legacy global rows without locale stay visible in every UI language.
  if (!locale) return true;
  return locale === uiLocale;
}

export function filterJourneyTemplatesByLocale<
  T extends { locale?: string | null; parishId?: string | null },
>(templates: T[], uiLocale: string): T[] {
  return templates.filter((template) =>
    matchesJourneyTemplateLocale(template, uiLocale),
  );
}

/**
 * Prisma `where` for listing templates. Locale is applied in memory because
 * `locale` is a required String — `{ locale: null }` makes Prisma 5 throw,
 * which the UI treated as an empty list (especially for isAdmin users).
 */
export function buildJourneyTemplateListWhere(args: {
  isAdmin: boolean;
  parishIds: string[];
  dioceseIds: string[];
  hasOnlyPersonal: boolean;
}): Record<string, unknown> | undefined {
  if (args.isAdmin) return undefined;
  if (args.parishIds.length === 0) {
    return { parishId: null };
  }
  if (args.hasOnlyPersonal) {
    return {
      OR: [{ parishId: { in: args.parishIds } }, { parishId: null }],
    };
  }
  return {
    OR: [
      { parishId: { in: args.parishIds } },
      { parish: { dioceseId: { in: args.dioceseIds } } },
      { parishId: null },
      { dioceseId: { in: args.dioceseIds }, ownerType: "DIOCESE" },
    ],
  };
}
