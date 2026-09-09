/**
 * Comunidade / Rhema (social feed) surfaces: sidebar item, app page, public
 * feed, shorts, profiles and every write operation.
 *
 * While this flag is false:
 *   - the sidebar item is hidden
 *   - /app/comunidade and the public /comunidade routes redirect away
 *   - feed queries answer empty and write operations answer 404
 */
export const SOCIAL_FEATURES_ENABLED = true;

/** Where visitors land when they hit a social URL while the module is off. */
export const SOCIAL_DISABLED_REDIRECT = "/";
export const SOCIAL_DISABLED_APP_REDIRECT = "/app";

export const SOCIAL_APP_PATHS = ["/app/comunidade"] as const;

export const SOCIAL_PUBLIC_PATHS = ["/comunidade", "/c"] as const;

export function isSocialAppPath(pathname: string): boolean {
  const path = pathname.split("?")[0];
  return SOCIAL_APP_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
}

export function isSocialPublicPath(pathname: string): boolean {
  const path = pathname.split("?")[0];
  return SOCIAL_PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
}

/** Sidebar / bottom-nav filter, mirroring shouldShowAiNavItem. */
export function shouldShowSocialNavItem(item: { to: string; iconKey: string }): boolean {
  if (SOCIAL_FEATURES_ENABLED) return true;
  if (item.iconKey === "community") return false;
  return !isSocialAppPath(item.to);
}
