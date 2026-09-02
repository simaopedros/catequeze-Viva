import { useTranslation } from "react-i18next";

/**
 * Resolve a key from a landing namespace, falling back to the main `landing` ns.
 * Returns `any` so string keys and returnObjects arrays both type-check in JSX.
 */
export function useLandingText(ns: string = "landing") {
  const { t } = useTranslation(ns);
  const { t: tLanding } = useTranslation("landing");

  return (key: string, options?: Record<string, unknown>): any => {
    const value = t(key, options as any);
    if (options?.returnObjects) {
      if (value && typeof value === "object") return value;
      const fallback = tLanding(key, options as any);
      return fallback && typeof fallback === "object" ? fallback : value;
    }
    if (typeof value === "string" && value !== key) return value;
    return tLanding(key, options as any);
  };
}

/** Avoid rendering the raw i18n key when a dynamic catalog slug has no copy. */
export function landingCopy(
  tr: (key: string, options?: Record<string, unknown>) => any,
  key: string,
  fallback: string,
): string {
  const value = tr(key);
  return typeof value === "string" && value !== key ? value : fallback;
}

export function landingFeatureList(
  tr: (key: string, options?: Record<string, unknown>) => any,
  key: string,
  fallback: string[],
): string[] {
  const value = tr(key, { returnObjects: true });
  return Array.isArray(value) && value.length > 0 ? (value as string[]) : fallback;
}
