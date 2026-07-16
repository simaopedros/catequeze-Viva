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
  | "onboarding_completed"
  | "first_class_created"
  | "activation_completed"
  | "activation_milestone_completed"
  | "first_value_reached"
  | "invite_sent"
  | "invite_accepted"
  | "share_clicked";

export type EventProperties = Record<
  string,
  string | number | boolean | null | undefined
>;

declare global {
  interface Window {
    dataLayer: unknown[];
    plausible?: (event: string, options?: { props?: EventProperties }) => void;
  }
}

/** Allowlist of client funnel event names (Path A — browser sinks only). */
export const MARKETING_EVENT_NAMES: readonly MarketingEventName[] = [
  "landing_viewed",
  "primary_cta_clicked",
  "secondary_cta_clicked",
  "pricing_viewed",
  "plan_selected",
  "signup_started",
  "signup_completed",
  "checkout_started",
  "onboarding_started",
  "onboarding_step_completed",
  "onboarding_completed",
  "first_class_created",
  "activation_completed",
  "activation_milestone_completed",
  "first_value_reached",
  "invite_sent",
  "invite_accepted",
  "share_clicked",
] as const;

const LANDING_ORIGIN_KEY = "cv-landing-origin";
const FIRST_VALUE_SENT_KEY = "cv-first-value-sent";
const ONBOARDING_COMPLETED_KEY = "cv-onboarding-completed-sent";

/**
 * Send one privacy-safe event to every configured browser analytics provider.
 *
 * Path A only: dataLayer / Plausible. Does NOT write PricingEvent
 * or update the admin funnel dashboard (that uses payment trackPricingEvent).
 */
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
    // Only call when Plausible script exposed the tracker (avoids bad CORS stubs).
    if (typeof window.plausible === "function") {
      window.plausible(event, { props: safeProperties });
    }
  } catch {
    /* ignore provider errors */
  }
}

export function marketingLandingFromPath(pathname: string): string | null {
  if (pathname === "/") return "general";
  if (pathname === "/ia") return "ai";
  if (pathname === "/presenca") return "attendance";
  if (pathname === "/sistema") return "management";
  return null;
}

/** Persist landing origin once for later onboarding / activation events. */
export function rememberLandingOrigin(pathname: string): void {
  if (typeof window === "undefined") return;
  const origin = marketingLandingFromPath(pathname);
  if (!origin) return;
  try {
    if (!sessionStorage.getItem(LANDING_ORIGIN_KEY)) {
      sessionStorage.setItem(LANDING_ORIGIN_KEY, origin);
    }
  } catch {
    /* ignore */
  }
}

export function getLandingOrigin(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(LANDING_ORIGIN_KEY);
  } catch {
    return null;
  }
}

export type ActivationProfile =
  | "personal"
  | "institutional"
  | "guardian"
  | "other";

/**
 * Emit first_value_reached once per browser profile (localStorage dedupe).
 * Returns true if the event was sent this call.
 */
export function trackFirstValueReached(props: {
  profile: ActivationProfile;
  workspace_type?: string | null;
  path: "attendance" | "meeting" | "both";
  duration_ms?: number;
}): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (localStorage.getItem(FIRST_VALUE_SENT_KEY) === "1") return false;
    localStorage.setItem(FIRST_VALUE_SENT_KEY, "1");
  } catch {
    /* still try to send once per session if storage blocked */
  }

  trackMarketingEvent("first_value_reached", {
    profile: props.profile,
    workspace_type: props.workspace_type ?? null,
    landing_origin: getLandingOrigin(),
    path: props.path,
    duration_ms: props.duration_ms ?? null,
  });
  return true;
}

/**
 * Emit onboarding_completed once (sessionStorage).
 */
export function trackOnboardingCompleted(props: {
  account_type: "personal" | "manager" | string;
  profile?: ActivationProfile;
  path?: string;
  duration_ms?: number;
}): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (sessionStorage.getItem(ONBOARDING_COMPLETED_KEY) === "1") return false;
    sessionStorage.setItem(ONBOARDING_COMPLETED_KEY, "1");
  } catch {
    /* continue */
  }

  trackMarketingEvent("onboarding_completed", {
    account_type: props.account_type,
    profile: props.profile ?? (props.account_type === "personal" ? "personal" : "institutional"),
    landing_origin: getLandingOrigin(),
    path: props.path ?? null,
    duration_ms: props.duration_ms ?? null,
  });
  return true;
}

export function trackActivationMilestone(props: {
  milestone: "class" | "people" | "attendance" | "meeting";
  profile?: ActivationProfile;
  workspace_type?: string | null;
}): void {
  trackMarketingEvent("activation_milestone_completed", {
    milestone: props.milestone,
    profile: props.profile ?? null,
    workspace_type: props.workspace_type ?? null,
    landing_origin: getLandingOrigin(),
  });
}
