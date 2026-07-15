import { detectCurrency } from "../../shared/currency";
import { SUBSCRIPTION_TRIAL_DAYS } from "../../shared/pricing";

declare global {
  interface Window {
    dataLayer: unknown[];
    fbq?: MetaFbq;
    _fbq?: MetaFbq;
  }
}

type MetaFbq = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[];
  loaded?: boolean;
  version?: string;
  push?: (...args: unknown[]) => void;
};

const ATTRIBUTION_STORAGE_KEY = "cv_attribution_v1";
const FBC_COOKIE_NAME = "_fbc";
const FBP_COOKIE_NAME = "_fbp";
const FBC_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 90;
const META_CONTENT_TYPE = "product";
const META_CONTENT_CATEGORY = "subscription";

/** Standard Meta Pixel event names used for SaaS ads optimization. */
export type MetaStandardEventName =
  | "PageView"
  | "ViewContent"
  | "Lead"
  | "CompleteRegistration"
  | "InitiateCheckout"
  | "StartTrial"
  | "Subscribe"
  | "Purchase";

export interface AttributionSnapshot {
  fbclid?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  landing_page_url?: string;
  referrer?: string;
}

export interface MetaCheckoutTrackingFields {
  initiate_checkout_event_id?: string;
  fbp?: string;
  fbc?: string;
  fbclid?: string;
  client_user_agent?: string;
  event_source_url?: string;
  landing_page_url?: string;
  referrer?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  planName?: string;
  value?: number;
  currency?: string;
  planId?: string;
  priceId?: string;
}

interface InitiateCheckoutPayload {
  event_id?: string;
  content_name: string;
  content_category?: string;
  content_ids?: string[];
  content_type?: string;
  plan_id: string;
  price_id?: string;
  value: number;
  currency?: string;
  trial_days?: number;
  num_items?: number;
}

interface CompleteRegistrationPayload {
  event_id?: string;
  method?: string;
  content_name?: string;
  content_category?: string;
  status?: boolean;
}

interface LeadPayload {
  event_id?: string;
  content_name: string;
  content_category?: string;
  content_ids?: string[];
  content_type?: string;
  plan_id?: string;
  value?: number;
  currency?: string;
}

interface StartTrialPayload {
  event_id?: string;
  content_name?: string;
  content_category?: string;
  content_ids?: string[];
  plan_id?: string;
  value?: number;
  currency?: string;
  trial_days?: number;
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function cleanObject(value: object): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).filter(
      ([, entryValue]) =>
        entryValue !== undefined && entryValue !== null && entryValue !== "",
    ),
  );
}

function readCookie(name: string): string | undefined {
  if (!isBrowser()) return undefined;

  const prefix = `${name}=`;
  const cookie = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));

  if (!cookie) return undefined;
  return decodeURIComponent(cookie.slice(prefix.length));
}

function writeCookie(name: string, value: string, maxAgeSeconds: number): void {
  if (!isBrowser()) return;

  document.cookie = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    `Max-Age=${maxAgeSeconds}`,
    "SameSite=Lax",
  ].join("; ");
}

function readStoredAttribution(): AttributionSnapshot {
  if (!isBrowser()) return {};

  try {
    const raw = window.localStorage.getItem(ATTRIBUTION_STORAGE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw) as AttributionSnapshot;
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function writeStoredAttribution(value: AttributionSnapshot): AttributionSnapshot {
  if (!isBrowser()) return value;

  try {
    window.localStorage.setItem(
      ATTRIBUTION_STORAGE_KEY,
      JSON.stringify(cleanObject(value)),
    );
  } catch {}

  return value;
}

function getClientMetaPixelId(): string | undefined {
  const pixelId = (
    import.meta.env.REACT_APP_META_PIXEL_ID as string | undefined
  )?.trim();
  return pixelId || undefined;
}

/**
 * Push a structured event to GTM dataLayer.
 * Always includes meta_event_name when provided so GTM can map to Pixel.
 */
export function pushDataLayerEvent(
  eventName: string,
  payload: Record<string, unknown> = {},
): void {
  if (!isBrowser()) return;

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: eventName,
    ...cleanObject(payload),
  });
}

/**
 * Fire a Meta standard event via dataLayer (GTM) and optional native fbq.
 * event_id enables browser ↔ CAPI deduplication in Meta Events Manager.
 */
export function trackMetaStandardEvent(
  dataLayerEvent: string,
  metaEventName: MetaStandardEventName,
  payload: Record<string, unknown> = {},
): void {
  const cleaned = cleanObject(payload);
  const eventId =
    typeof cleaned.event_id === "string" ? cleaned.event_id : undefined;

  pushDataLayerEvent(dataLayerEvent, {
    meta_event_name: metaEventName,
    ...cleaned,
  });

  if (!isBrowser()) return;

  // Ensure native pixel stub exists when configured (handles race before MetaPixelScripts mounts).
  if (typeof window.fbq !== "function" && isMetaPixelConfigured()) {
    initMetaPixel();
  }

  if (typeof window.fbq !== "function") {
    if (import.meta.env.DEV) {
      console.info(
        `[meta-pixel] fbq unavailable; dataLayer only for ${metaEventName}`,
        cleaned,
      );
    }
    return;
  }

  const { event_id: _eventId, meta_event_name: _meta, ...fbqParams } = cleaned;
  try {
    if (eventId) {
      window.fbq("track", metaEventName, fbqParams, { eventID: eventId });
    } else {
      window.fbq("track", metaEventName, fbqParams);
    }
    if (import.meta.env.DEV) {
      console.info(`[meta-pixel] fbq track ${metaEventName}`, {
        eventID: eventId,
        ...fbqParams,
      });
    }
  } catch {
    // Pixel must never break product flows
  }
}

export function getMetaBrowserIds(): {
  fbp?: string;
  fbc?: string;
} {
  return cleanObject({
    fbp: readCookie(FBP_COOKIE_NAME),
    fbc: readCookie(FBC_COOKIE_NAME),
  }) as { fbp?: string; fbc?: string };
}

export function ensureFbcFromFbclid(nowMs = Date.now()): string | undefined {
  if (!isBrowser()) return undefined;

  const currentFbc = readCookie(FBC_COOKIE_NAME);
  if (currentFbc) {
    return currentFbc;
  }

  const fbclid =
    new URL(window.location.href).searchParams.get("fbclid") ||
    readStoredAttribution().fbclid;
  if (!fbclid) {
    return undefined;
  }

  const generatedFbc = `fb.1.${nowMs}.${fbclid}`;
  writeCookie(FBC_COOKIE_NAME, generatedFbc, FBC_COOKIE_MAX_AGE_SECONDS);
  return generatedFbc;
}

export function persistAttributionParams(): AttributionSnapshot {
  if (!isBrowser()) return {};

  const currentUrl = new URL(window.location.href);
  const params = currentUrl.searchParams;
  const existing = readStoredAttribution();
  const nextSnapshot: AttributionSnapshot = {
    fbclid: params.get("fbclid") || existing.fbclid,
    utm_source: params.get("utm_source") || existing.utm_source,
    utm_medium: params.get("utm_medium") || existing.utm_medium,
    utm_campaign: params.get("utm_campaign") || existing.utm_campaign,
    utm_content: params.get("utm_content") || existing.utm_content,
    utm_term: params.get("utm_term") || existing.utm_term,
    landing_page_url: existing.landing_page_url || currentUrl.toString(),
    referrer: existing.referrer || document.referrer || undefined,
  };

  return writeStoredAttribution(nextSnapshot);
}

export function getPersistedAttributionParams(): AttributionSnapshot {
  return readStoredAttribution();
}

export function createEventId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}`;
}

/** Checkout/attribution payload to forward into Stripe + Meta CAPI. */
export function buildCheckoutTrackingFields(args: {
  planId: string;
  planName: string;
  value: number;
  currency?: string;
  priceId?: string;
  initiateCheckoutEventId?: string;
}): MetaCheckoutTrackingFields & {
  planId: string;
  planName: string;
  value: number;
  currency: string;
  priceId?: string;
  initiate_checkout_event_id: string;
} {
  const attribution = getPersistedAttributionParams();
  const ensuredFbc = ensureFbcFromFbclid();
  const browserIds = getMetaBrowserIds();
  const eventId =
    args.initiateCheckoutEventId ?? createEventId("initiate_checkout");

  return {
    planId: args.planId,
    planName: args.planName,
    value: args.value,
    currency: args.currency ?? detectCurrency(),
    priceId: args.priceId,
    initiate_checkout_event_id: eventId,
    fbp: browserIds.fbp,
    fbc: ensuredFbc ?? browserIds.fbc,
    fbclid: attribution.fbclid,
    client_user_agent:
      typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    event_source_url:
      typeof window !== "undefined" ? window.location.href : undefined,
    landing_page_url: attribution.landing_page_url,
    referrer: attribution.referrer,
    utm_source: attribution.utm_source,
    utm_medium: attribution.utm_medium,
    utm_campaign: attribution.utm_campaign,
    utm_content: attribution.utm_content,
    utm_term: attribution.utm_term,
  };
}

export function buildViewPricingDataLayerEvent(options?: {
  plan_ids?: string[];
  content_name?: string;
}): Record<string, unknown> {
  return cleanObject({
    meta_event_name: "ViewContent",
    content_name: options?.content_name ?? "Planos Catechis",
    content_category: META_CONTENT_CATEGORY,
    content_type: META_CONTENT_TYPE,
    content_ids: options?.plan_ids,
    currency: detectCurrency(),
  });
}

export function buildInitiateCheckoutDataLayerEvent(
  payload: InitiateCheckoutPayload,
): Record<string, unknown> {
  return cleanObject({
    meta_event_name: "InitiateCheckout",
    event_id: payload.event_id,
    content_name: payload.content_name,
    content_category: payload.content_category ?? META_CONTENT_CATEGORY,
    content_type: payload.content_type ?? META_CONTENT_TYPE,
    content_ids: payload.content_ids ?? [payload.plan_id],
    plan_id: payload.plan_id,
    price_id: payload.price_id,
    value: payload.value,
    currency: payload.currency ?? detectCurrency(),
    trial_days: payload.trial_days ?? SUBSCRIPTION_TRIAL_DAYS,
    num_items: payload.num_items ?? 1,
  });
}

export function buildCompleteRegistrationDataLayerEvent(
  payload: CompleteRegistrationPayload = {},
): Record<string, unknown> {
  return cleanObject({
    meta_event_name: "CompleteRegistration",
    event_id: payload.event_id ?? createEventId("complete_registration"),
    content_name: payload.content_name ?? "Signup Catechis",
    content_category: payload.content_category ?? META_CONTENT_CATEGORY,
    method: payload.method ?? "email",
    status: payload.status ?? true,
  });
}

export function buildLeadDataLayerEvent(
  payload: LeadPayload,
): Record<string, unknown> {
  return cleanObject({
    meta_event_name: "Lead",
    event_id: payload.event_id ?? createEventId("lead"),
    content_name: payload.content_name,
    content_category: payload.content_category ?? META_CONTENT_CATEGORY,
    content_type: payload.content_type ?? META_CONTENT_TYPE,
    content_ids: payload.content_ids ?? (payload.plan_id ? [payload.plan_id] : undefined),
    plan_id: payload.plan_id,
    value: payload.value,
    currency: payload.currency ?? detectCurrency(),
  });
}

export function buildStartTrialDataLayerEvent(
  payload: StartTrialPayload,
): Record<string, unknown> {
  return cleanObject({
    meta_event_name: "StartTrial",
    event_id: payload.event_id,
    content_name: payload.content_name ?? "Trial Catechis",
    content_category: payload.content_category ?? META_CONTENT_CATEGORY,
    content_ids: payload.content_ids,
    plan_id: payload.plan_id,
    value: payload.value ?? 0,
    currency: payload.currency ?? detectCurrency(),
    trial_days: payload.trial_days ?? SUBSCRIPTION_TRIAL_DAYS,
  });
}

/** Dedup StrictMode double-mount / rapid remounts of the same path. */
let lastPageViewKey = "";
let lastPageViewAt = 0;

export function trackPageView(path?: string, title?: string): void {
  const pagePath = path ?? (isBrowser() ? window.location.pathname : undefined);
  const now = Date.now();
  const key = pagePath ?? "";
  if (key && key === lastPageViewKey && now - lastPageViewAt < 800) {
    return;
  }
  lastPageViewKey = key;
  lastPageViewAt = now;

  trackMetaStandardEvent("page_view", "PageView", {
    page_path: pagePath,
    page_title: title ?? (isBrowser() ? document.title : undefined),
    page_location: isBrowser() ? window.location.href : undefined,
  });
}

export function trackViewPricing(options?: {
  plan_ids?: string[];
  content_name?: string;
}): void {
  trackMetaStandardEvent(
    "view_pricing",
    "ViewContent",
    buildViewPricingDataLayerEvent(options),
  );
}

export function trackInitiateCheckout(payload: InitiateCheckoutPayload): void {
  trackMetaStandardEvent(
    "initiate_checkout",
    "InitiateCheckout",
    buildInitiateCheckoutDataLayerEvent(payload),
  );
}

export function trackCompleteRegistration(
  payload: CompleteRegistrationPayload = {},
): void {
  trackMetaStandardEvent(
    "complete_registration",
    "CompleteRegistration",
    buildCompleteRegistrationDataLayerEvent(payload),
  );
}

export function trackLead(payload: LeadPayload): void {
  trackMetaStandardEvent("generate_lead", "Lead", buildLeadDataLayerEvent(payload));
}

export function trackStartTrialBrowser(payload: StartTrialPayload): void {
  trackMetaStandardEvent(
    "start_trial_success_page",
    "StartTrial",
    buildStartTrialDataLayerEvent(payload),
  );
}

type WindowWithMetaInit = Window & {
  /** Survives StrictMode remounts and module HMR better than a module Set. */
  __catequeseMetaPixelInited?: Record<string, true>;
};

/**
 * Initialize the native Meta Pixel (fbq) when REACT_APP_META_PIXEL_ID is set.
 * GTM can still load its own Pixel; use the same Pixel ID and event_id for dedup.
 * Returns true if the pixel was (or already is) initialized.
 *
 * Never calls fbq('init') twice for the same ID (avoids Meta "Duplicate Pixel ID").
 */
export function initMetaPixel(): boolean {
  if (!isBrowser()) return false;

  const pixelId = getClientMetaPixelId();
  if (!pixelId) return false;

  const w = window as WindowWithMetaInit;
  w.__catequeseMetaPixelInited = w.__catequeseMetaPixelInited || {};
  if (w.__catequeseMetaPixelInited[pixelId]) {
    return true;
  }

  // Localhost: keep dataLayer only — native fbq is noisy (Duplicate ID + "Ignoring Event")
  // and GTM often loads the same pixel in parallel.
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    w.__catequeseMetaPixelInited[pixelId] = true;
    if (import.meta.env.DEV) {
      console.info(
        "[meta-pixel] skip native fbq init on localhost (dataLayer still works)",
      );
    }
    return false;
  }

  try {
    const hadFbq = typeof window.fbq === "function";

    if (!hadFbq) {
      const fbq = function (...args: unknown[]) {
        const self = fbq as MetaFbq;
        if (self.callMethod) {
          self.callMethod(...args);
        } else {
          self.queue.push(args);
        }
      } as MetaFbq;

      fbq.push = fbq;
      fbq.loaded = true;
      fbq.version = "2.0";
      fbq.queue = [];
      window.fbq = fbq;
      window._fbq = fbq;
    }

    const alreadyLoaded = document.querySelector(
      'script[src*="connect.facebook.net"][src*="fbevents.js"]',
    );
    if (!alreadyLoaded) {
      const script = document.createElement("script");
      script.async = true;
      script.src = "https://connect.facebook.net/en_US/fbevents.js";
      document.head.appendChild(script);
    }

    // If fbq already existed (GTM / previous init), do not call init again —
    // Meta logs "Duplicate Pixel ID" and double-counts.
    if (!hadFbq) {
      window.fbq!("init", pixelId);
    }

    w.__catequeseMetaPixelInited[pixelId] = true;
    return true;
  } catch {
    return false;
  }
}

export function isMetaPixelConfigured(): boolean {
  return Boolean(getClientMetaPixelId());
}
