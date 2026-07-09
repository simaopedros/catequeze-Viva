import { detectCurrency } from "../../shared/currency";
import { SUBSCRIPTION_TRIAL_DAYS } from "../../shared/pricing";

declare global {
  interface Window {
    dataLayer: unknown[];
  }
}

const ATTRIBUTION_STORAGE_KEY = "cv_attribution_v1";
const FBC_COOKIE_NAME = "_fbc";
const FBP_COOKIE_NAME = "_fbp";
const FBC_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 90;

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

interface InitiateCheckoutPayload {
  event_id?: string;
  content_name: string;
  content_category?: string;
  plan_id: string;
  price_id?: string;
  value: number;
  currency?: string;
  trial_days?: number;
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function cleanObject(value: object): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined && entryValue !== null && entryValue !== ""),
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

export function getMetaBrowserIds(): {
  fbp?: string;
  fbc?: string;
} {
  return cleanObject({
    fbp: readCookie(FBP_COOKIE_NAME),
    fbc: readCookie(FBC_COOKIE_NAME),
  });
}

export function ensureFbcFromFbclid(nowMs = Date.now()): string | undefined {
  if (!isBrowser()) return undefined;

  const currentFbc = readCookie(FBC_COOKIE_NAME);
  if (currentFbc) {
    return currentFbc;
  }

  const fbclid = new URL(window.location.href).searchParams.get("fbclid");
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

export function buildViewPricingDataLayerEvent(): Record<string, unknown> {
  return {
    meta_event_name: "ViewContent",
    content_name: "Planos Catechis",
    content_category: "subscription",
    currency: detectCurrency(),
  };
}

export function buildInitiateCheckoutDataLayerEvent(
  payload: InitiateCheckoutPayload,
): Record<string, unknown> {
  return cleanObject({
    meta_event_name: "InitiateCheckout",
    event_id: payload.event_id,
    content_name: payload.content_name,
    content_category: payload.content_category ?? "subscription",
    plan_id: payload.plan_id,
    price_id: payload.price_id,
    value: payload.value,
    currency: payload.currency ?? detectCurrency(),
    trial_days: payload.trial_days ?? SUBSCRIPTION_TRIAL_DAYS,
  });
}

