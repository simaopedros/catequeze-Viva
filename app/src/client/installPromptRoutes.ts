const BLOCKED_APP_PREFIXES = [
  "/app/onboarding",
  "/app/billing",
  "/app/checkout",
];

/** The PWA install invite only belongs inside the signed-in app, away from setup and payment flows. */
export function shouldOfferInstallOnPath(pathname: string): boolean {
  if (pathname !== "/app" && !pathname.startsWith("/app/")) return false;
  return !BLOCKED_APP_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
