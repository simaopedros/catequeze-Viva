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
