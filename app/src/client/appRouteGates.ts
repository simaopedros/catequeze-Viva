/**
 * Route gates that must stay cheap: the required billing paywall should render
 * even when the user has no workspace yet and the lazy `app` i18n chunk is
 * still loading (or failed after a deploy).
 */

import { isSocialAppPath } from "../shared/socialFeatures";

/** Reading and publishing-adjacent surfaces that stay open on the free plan. */
const UNGATED_APP_PREFIXES = [
  "/app/billing",
  "/app/onboarding",
  "/app/select-workspace",
  "/app/bible",
  "/app/catechism",
  "/app/directory",
] as const;

export function isUngatedAppPath(pathname: string): boolean {
  if (pathname === "/account" || pathname.startsWith("/account/")) return true;
  if (isSocialAppPath(pathname)) return true;
  return UNGATED_APP_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

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
  "/blog",
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

/**
 * After Stripe Checkout, new accounts still have no PERSONAL workspace.
 * Sending them to billing traps them: AppShell used to skip onboarding on
 * `/app/billing` so the unpaid paywall could render.
 */
export function getPostCheckoutDestination(input: {
  needsOnboarding: boolean;
  sessionId?: string | null;
}): string {
  const params = new URLSearchParams();
  if (input.needsOnboarding) {
    params.set("checkout", "success");
  } else {
    params.set("status", "success");
  }
  if (input.sessionId) {
    params.set("session_id", input.sessionId);
  }
  const path = input.needsOnboarding ? "/app/onboarding" : "/app/billing";
  return `${path}?${params.toString()}`;
}

/**
 * Keep the user on billing only while it is still the required paywall.
 * After a paid/trialing subscription (or a Checkout success return), send
 * them on to onboarding if the workspace is not set up yet.
 */
export function shouldHoldOnboardingRedirectOnBilling(opts: {
  pathname: string;
  search?: string;
  hasPersonalAccess: boolean;
  isOnProductTrial: boolean;
}): boolean {
  if (!opts.pathname.includes("/billing")) return false;
  const raw = opts.search ?? "";
  const search = raw.startsWith("?") ? raw.slice(1) : raw;
  if (new URLSearchParams(search).get("status") === "success") {
    return false;
  }
  return !opts.hasPersonalAccess && !opts.isOnProductTrial;
}
