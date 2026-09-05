/**
 * Route gates that must stay cheap: the required billing paywall should render
 * even when the user has no workspace yet and the lazy `app` i18n chunk is
 * still loading (or failed after a deploy).
 */

const PUBLIC_PATH_PREFIXES = [
  "/ia",
  "/presenca",
  "/sistema",
  "/pricing",
  "/obrigado",
  "/about",
  "/privacy",
  "/terms",
  "/contact",
  "/login",
  "/signup",
  "/request-password-reset",
  "/password-reset",
  "/email-verification",
  "/oauth",
];

export function isPublicOnlyPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/** Billing copy lives in the core i18n bundle. Do not wait on `app` namespaces. */
export function needsFullAppNamespaces(pathname: string): boolean {
  if (isPublicOnlyPath(pathname)) return false;
  if (pathname.startsWith("/app/billing")) return false;
  return true;
}

/**
 * Onboarding-style chrome (no sidebar) for the required paywall before the
 * user has a personal/institutional workspace. The empty app shell reads as a
 * blank page.
 */
export function isMinimalAppPath(
  pathname: string,
  opts?: {
    needsOnboarding?: boolean;
    contextReady?: boolean;
    hasWorkspace?: boolean;
  },
): boolean {
  if (pathname === "/app/onboarding" || pathname === "/app/select-workspace") {
    return true;
  }
  if (!pathname.startsWith("/app/billing")) return false;
  if (opts?.hasWorkspace) return false;
  // Until bootstrap resolves, keep the focused paywall so a new unpaid
  // account never paints the empty sidebar/topbar chrome.
  if (opts?.contextReady === false) return true;
  return Boolean(opts?.needsOnboarding);
}

/** SubscriptionGate: never hold an always-accessible route on `checked`. */
export function shouldRenderGatedRoute(opts: {
  userLoaded: boolean;
  alwaysAccessible: boolean;
  hasAccess: boolean;
  isBillingManager: boolean;
  checked: boolean;
}): boolean {
  if (!opts.userLoaded) return false;
  if (opts.alwaysAccessible) return true;
  if (!opts.hasAccess && opts.isBillingManager) return false;
  return opts.checked;
}
