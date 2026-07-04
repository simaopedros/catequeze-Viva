export type MarketingEventName =
  | "landing_viewed"
  | "primary_cta_clicked"
  | "secondary_cta_clicked"
  | "pricing_viewed"
  | "plan_selected"
  | "signup_started"
  | "signup_completed"
  | "checkout_started"
  | "onboarding_started"
  | "onboarding_step_completed"
  | "first_class_created"
  | "activation_completed"
  | "invite_sent"
  | "invite_accepted"
  | "share_clicked";

type EventProperties = Record<
  string,
  string | number | boolean | null | undefined
>;

declare global {
  interface Window {
    plausible?: (event: string, options?: { props?: EventProperties }) => void;
  }
}

/** Send one privacy-safe event to every configured browser analytics provider. */
export function trackMarketingEvent(
  event: MarketingEventName,
  properties: EventProperties = {},
): void {
  if (typeof window === "undefined") return;
  const safeProperties = Object.fromEntries(
    Object.entries(properties).filter(([, value]) => value !== undefined),
  );

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...safeProperties });
  try {
    window.himetrica?.track?.(event, safeProperties);
  } catch {}
  try {
    window.plausible?.(event, { props: safeProperties });
  } catch {}
}

export function marketingLandingFromPath(pathname: string): string | null {
  if (pathname === "/") return "general";
  if (pathname === "/ia") return "ai";
  if (pathname === "/presenca") return "attendance";
  if (pathname === "/sistema") return "management";
  return null;
}
