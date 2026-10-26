import { z } from "zod";

type Translate = (key: string, options?: Record<string, unknown>) => string;

function baseLocale(language: string) {
  if (language.startsWith("es")) return z.locales.es();
  if (language.startsWith("en")) return z.locales.en();
  return z.locales.pt();
}

/**
 * Zod's default messages are English ("Too big: expected string to have
 * <=100 characters"). Use the app language, with friendlier copy for the
 * issues forms hit most.
 */
export function configureZodLocale(language: string, t: Translate): void {
  const fallback = baseLocale(language).localeError;
  z.config({
    localeError: (issue) => {
      if (issue.code === "too_big" && issue.origin === "string") {
        return t("validation.native_too_long", { max: issue.maximum });
      }
      if (issue.code === "too_small" && issue.origin === "string") {
        return Number(issue.minimum) <= 1
          ? t("validation.native_required")
          : t("validation.native_too_short", { min: issue.minimum });
      }
      if (issue.code === "invalid_type" && issue.input === undefined) {
        return t("validation.native_required");
      }
      if (issue.code === "invalid_format" && issue.format === "email") {
        return t("validation.native_email");
      }
      return fallback?.(issue);
    },
  });
}
