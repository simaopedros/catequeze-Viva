import crypto from "node:crypto";
import { env } from "wasp/server";
import { logger } from "../../server/logger";

export interface MetaEventUserData {
  email?: string;
  /** Unhashed phone number — hashed before send. E.164 format recommended (e.g. +5531999999999). */
  phone?: string;
  /** Unhashed external user id — hashed before send. */
  external_id?: string;
  fbp?: string;
  fbc?: string;
  client_ip_address?: string;
  client_user_agent?: string;
}

export interface MetaEventCustomData {
  currency?: string;
  value?: number;
  content_name?: string;
  content_category?: string;
  content_ids?: string[];
  content_type?: string;
  num_items?: number;
  /** CompleteRegistration success flag (Meta accepts bool/string). */
  status?: boolean | string;
  subscription_id?: string;
  stripe_customer_id?: string;
  stripe_session_id?: string;
  invoice_id?: string;
  plan_id?: string;
  trial_days?: number;
}

export interface MetaEventParams {
  event_name: string;
  event_time: number;
  event_id: string;
  event_source_url?: string;
  user_data?: MetaEventUserData;
  custom_data?: MetaEventCustomData;
}

interface MetaGraphPayload {
  data: Array<{
    event_name: string;
    event_time: number;
    event_id: string;
    action_source: "website";
    event_source_url?: string;
    user_data?: Record<string, unknown>;
    custom_data?: Record<string, unknown>;
  }>;
  test_event_code?: string;
}

export function isMetaCapiConfigured(): boolean {
  return Boolean(env.META_PIXEL_ID && env.META_CAPI_ACCESS_TOKEN);
}

/** @deprecated use isMetaCapiConfigured */
function isConfigured(): boolean {
  return isMetaCapiConfigured();
}

export function normalizeEmail(email?: string | null): string | undefined {
  if (!email) return undefined;

  const normalized = email.trim().toLowerCase();
  return normalized.length > 0 ? normalized : undefined;
}

export function sha256(value?: string | null): string | undefined {
  if (!value) return undefined;

  return crypto.createHash("sha256").update(value).digest("hex");
}

export function cleanObject(value: object): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => {
      if (entryValue === undefined || entryValue === null) return false;
      if (Array.isArray(entryValue)) return entryValue.length > 0;
      return entryValue !== "";
    }),
  );
}

export function buildMetaEventRequestBody(
  params: MetaEventParams,
): MetaGraphPayload {
  const normalizedEmail = normalizeEmail(params.user_data?.email);
  const emailHash = sha256(normalizedEmail);
  const externalIdHash = sha256(
    params.user_data?.external_id?.trim()
      ? params.user_data.external_id.trim()
      : undefined,
  );
  
  // Hash phone if provided — Meta requires digits only (no spaces/dashes) for best match.
  // E.164 format recommended: +5531999999999
  const normalizedPhone = params.user_data?.phone?.replace(/\D/g, "");
  const phoneHash = sha256(normalizedPhone);

  const userData = cleanObject({
    em: emailHash ? [emailHash] : undefined,
    ph: phoneHash ? [phoneHash] : undefined,
    external_id: externalIdHash ? [externalIdHash] : undefined,
    fbp: params.user_data?.fbp,
    fbc: params.user_data?.fbc,
    client_ip_address: params.user_data?.client_ip_address,
    client_user_agent: params.user_data?.client_user_agent,
  });

  const eventPayload = cleanObject({
    event_name: params.event_name,
    event_time: params.event_time,
    event_id: params.event_id,
    action_source: "website" as const,
    event_source_url: params.event_source_url,
    user_data: Object.keys(userData).length > 0 ? userData : undefined,
    custom_data:
      params.custom_data && Object.keys(cleanObject(params.custom_data)).length > 0
        ? cleanObject(params.custom_data)
        : undefined,
  });

  return cleanObject({
    data: [eventPayload],
    test_event_code: env.META_TEST_EVENT_CODE || undefined,
  }) as unknown as MetaGraphPayload;
}

export async function sendMetaEvent(params: MetaEventParams): Promise<unknown> {
  if (!isConfigured()) {
    throw new Error("Meta CAPI is not configured");
  }

  const endpoint = `https://graph.facebook.com/${env.META_GRAPH_VERSION}/${env.META_PIXEL_ID}/events?access_token=${env.META_CAPI_ACCESS_TOKEN}`;
  const payload = buildMetaEventRequestBody(params);

  logger.info("[meta-capi] sending event", {
    eventName: params.event_name,
    eventId: params.event_id,
    hasTestCode: Boolean(env.META_TEST_EVENT_CODE),
  });

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const responseJson = await response.json().catch(() => ({}));
  if (!response.ok) {
    logger.error("[meta-capi] request failed", {
      eventName: params.event_name,
      eventId: params.event_id,
      status: response.status,
      response: responseJson,
    });
    throw new Error(
      `Meta CAPI request failed with status ${response.status}: ${JSON.stringify(responseJson)}`,
    );
  }

  logger.info("[meta-capi] request succeeded", {
    eventName: params.event_name,
    eventId: params.event_id,
  });

  return responseJson;
}




