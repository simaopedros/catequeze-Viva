import { SOCIAL_FEATURES_ENABLED } from "./socialFeatures";

/**
 * Routes the family portal (guardians / catechumens) may keep open.
 * Navigation filter is UX only — server access-control remains authoritative.
 */
export function isFamilyPortalPath(
  pathname: string,
  socialEnabled = SOCIAL_FEATURES_ENABLED,
): boolean {
  const path = pathname.split("?")[0];

  if (
    path === "/app" ||
    path === "/app/calendar" ||
    path.startsWith("/app/messages") ||
    path.startsWith("/app/meetings/") ||
    path === "/app/documents" ||
    path.startsWith("/app/documents/") ||
    path === "/app/consents" ||
    path.startsWith("/app/consents/") ||
    path === "/app/bible" ||
    path.startsWith("/app/bible/") ||
    path === "/app/catechism" ||
    path.startsWith("/app/catechism/")
  ) {
    return true;
  }

  if (!socialEnabled) return false;

  return (
    path === "/app/comunidade" ||
    path.startsWith("/app/comunidade/") ||
    path === "/comunidade" ||
    path.startsWith("/comunidade/")
  );
}
