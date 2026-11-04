import { createHash, timingSafeEqual } from "node:crypto";

export const HOTMART_POSTBACK_VERSION = "2.0.0";
export const DEFAULT_OVERDUE_GRACE_DAYS = 3;
/** Extra day so a missing Hotmart charge date still has a suspendable end. */
export const PERIOD_FALLBACK_GRACE_MS = 24 * 60 * 60 * 1000;

export type HotmartInterval = "monthly" | "annual";
export type HotmartPlanSlug = "single" | "unlimited";

export type MappedOffer = {
  planSlug: HotmartPlanSlug;
  interval: HotmartInterval;
};

const AMOUNT_CENTS: Record<number, MappedOffer> = {
  4700: { planSlug: "single", interval: "monthly" },
  29700: { planSlug: "single", interval: "annual" },
  9900: { planSlug: "unlimited", interval: "monthly" },
  99000: { planSlug: "unlimited", interval: "annual" },
};

const OFFER_ENV = [
  ["HOTMART_OFFER_SINGLE_MONTHLY", "single", "monthly"],
  ["HOTMART_OFFER_SINGLE_ANNUAL", "single", "annual"],
  ["HOTMART_OFFER_UNLIMITED_MONTHLY", "unlimited", "monthly"],
  ["HOTMART_OFFER_UNLIMITED_ANNUAL", "unlimited", "annual"],
  ["HOTMART_OFFER_DIOCESE_MONTHLY", "unlimited", "monthly"],
  ["HOTMART_OFFER_DIOCESE_ANNUAL", "unlimited", "annual"],
  ["HOTMART_PLAN_ID_SINGLE_MONTHLY", "single", "monthly"],
  ["HOTMART_PLAN_ID_SINGLE_ANNUAL", "single", "annual"],
  ["HOTMART_PLAN_ID_UNLIMITED_MONTHLY", "unlimited", "monthly"],
  ["HOTMART_PLAN_ID_UNLIMITED_ANNUAL", "unlimited", "annual"],
  ["HOTMART_PLAN_ID_DIOCESE_MONTHLY", "unlimited", "monthly"],
  ["HOTMART_PLAN_ID_DIOCESE_ANNUAL", "unlimited", "annual"],
] as const;

const SENSITIVE_KEYS = new Set([
  "document",
  "documents",
  "doc",
  "cpf",
  "phone",
  "checkout_phone",
  "address",
  "phone_local_code",
  "cell",
  "address_number",
  "neighborhood",
  "zipcode",
  "zip_code",
  "city",
  "state",
  "complement",
  "hottok",
  "token",
]);

export type HotmartEnv = {
  enabled: boolean;
  hottok: string;
  productUcodes: string[];
  graceDays: number;
};

export function readHotmartEnv(
  env: Record<string, string | undefined> = process.env,
): HotmartEnv {
  const grace = Number(env.HOTMART_OVERDUE_GRACE_DAYS || DEFAULT_OVERDUE_GRACE_DAYS);
  return {
    enabled: env.HOTMART_PRIMARY_CHECKOUT === "true",
    hottok: env.HOTMART_HOTTOK?.trim() || "",
    productUcodes: (env.HOTMART_PRODUCT_UCODES || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    graceDays: Number.isFinite(grace) && grace >= 0 ? grace : DEFAULT_OVERDUE_GRACE_DAYS,
  };
}

/** Compare without leaking the secret through early length returns or logs. */
export function hottokMatches(header: string | undefined, secret: string): boolean {
  if (!header || !secret) return false;
  const actual = createHash("sha256").update(header).digest();
  const expected = createHash("sha256").update(secret).digest();
  return timingSafeEqual(actual, expected);
}

export function headerHottok(headers: Record<string, unknown> | undefined): string | undefined {
  if (!headers) return undefined;
  const raw = headers["x-hotmart-hottok"] ?? headers["X-HOTMART-HOTTOK"];
  if (Array.isArray(raw)) return typeof raw[0] === "string" ? raw[0] : undefined;
  return typeof raw === "string" ? raw : undefined;
}

export function sanitizeHotmartPayload(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeHotmartPayload);
  if (!value || typeof value !== "object") return value;
  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const lower = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lower) || lower.includes("hottok") || lower.includes("token")) {
      continue;
    }
    if (lower === "email" && typeof child === "string") {
      out[key] = child.trim().toLowerCase();
      continue;
    }
    out[key] = sanitizeHotmartPayload(child);
  }
  return out;
}

export function mapHotmartOffer(
  input: {
    offerCode?: string | null;
    planId?: string | number | null;
    planName?: string | null;
    amountReais?: number | null;
  },
  env: Record<string, string | undefined> = process.env,
): MappedOffer | null {
  const offerCode = (input.offerCode || "").trim();
  const planId = input.planId == null ? "" : String(input.planId).trim();
  for (const [name, planSlug, interval] of OFFER_ENV) {
    const codes = (env[name] || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    if (offerCode && codes.includes(offerCode)) return { planSlug, interval };
    if (planId && name.startsWith("HOTMART_PLAN_ID_") && codes.includes(planId)) {
      return { planSlug, interval };
    }
  }

  if (typeof input.amountReais === "number" && Number.isFinite(input.amountReais)) {
    const cents = Math.round(input.amountReais * 100);
    if (AMOUNT_CENTS[cents]) return AMOUNT_CENTS[cents];
  }

  const name = (input.planName || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (!name) return null;
  const annual = /anual|annual/.test(name);
  const interval: HotmartInterval = annual ? "annual" : "monthly";
  if (/dioces|paroqu|parish|unlimited/.test(name)) return { planSlug: "unlimited", interval };
  if (/cateq|catechist|single/.test(name)) return { planSlug: "single", interval };
  return null;
}

export type HotmartEffect =
  | { kind: "record" }
  | { kind: "activate"; offer: MappedOffer; recurrence: number; accessEndsAt: Date | null; paidAt: Date | null }
  | { kind: "past_due"; accessEndsAt: Date | null }
  | { kind: "cancel_period_end"; accessEndsAt: Date | null }
  | { kind: "revoke" }
  | { kind: "switch_plan"; offer: MappedOffer; accessEndsAt: Date | null }
  | { kind: "update_charge_date"; accessEndsAt: Date | null }
  | { kind: "ignore"; reason: string }
  | { kind: "fail"; reason: string };

export type ParsedPostback = {
  id: string;
  event: string;
  version: string;
  transaction: string | null;
  email: string | null;
  subscriberCode: string | null;
  productUcode: string | null;
  effect: HotmartEffect;
};

function asRecord(value: unknown): Record<string, any> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, any>)
    : null;
}

function text(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function lowerEmail(value: unknown): string | null {
  const raw = text(value);
  return raw ? raw.toLowerCase() : null;
}

export function parseHotmartDate(value: unknown): Date | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    const ms = value < 10_000_000_000 ? value * 1000 : value;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === "string" && value.trim()) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function amountReais(purchase: Record<string, any> | null): number | null {
  const candidates = [
    purchase?.original_offer_price?.value,
    purchase?.full_price?.value,
    purchase?.price?.value,
  ];
  for (const candidate of candidates) {
    const amount = typeof candidate === "number" ? candidate : Number(candidate);
    if (Number.isFinite(amount) && amount > 0) return amount;
  }
  return null;
}

function offerFromPurchase(data: Record<string, any>, env: Record<string, string | undefined>): MappedOffer | null {
  const purchase = asRecord(data.purchase);
  const subscription = asRecord(data.subscription);
  const plan = asRecord(subscription?.plan) || asRecord(purchase?.plan);
  return mapHotmartOffer(
    {
      offerCode: text(asRecord(purchase?.offer)?.code) || text(asRecord(plan?.offer)?.code) || text(asRecord(plan?.offer)?.key),
      planId: plan?.id,
      planName: text(plan?.name),
      amountReais: amountReais(purchase),
    },
    env,
  );
}

function subscriberCodeFrom(data: Record<string, any>): string | null {
  return (
    text(asRecord(asRecord(data.subscription)?.subscriber)?.code) ||
    text(asRecord(data.subscriber)?.code) ||
    text(asRecord(data.subscription)?.subscriber_code) ||
    text(data.subscriber_code)
  );
}

function emailFrom(data: Record<string, any>): string | null {
  return (
    lowerEmail(asRecord(data.buyer)?.email) ||
    lowerEmail(asRecord(data.subscriber)?.email) ||
    lowerEmail(asRecord(asRecord(data.subscription)?.subscriber)?.email)
  );
}

function accessEndsAtFrom(data: Record<string, any>): Date | null {
  const purchase = asRecord(data.purchase);
  const subscription = asRecord(data.subscription);
  return (
    parseHotmartDate(purchase?.date_next_charge) ||
    parseHotmartDate(subscription?.date_next_charge) ||
    parseHotmartDate(data.date_next_charge)
  );
}

export function accessEndFromPeriod(start: Date, interval: HotmartInterval): Date {
  const end = new Date(start.getTime());
  if (interval === "annual") end.setUTCFullYear(end.getUTCFullYear() + 1);
  else end.setUTCMonth(end.getUTCMonth() + 1);
  return new Date(end.getTime() + PERIOD_FALLBACK_GRACE_MS);
}

function purchaseStart(data: Record<string, any>): Date | null {
  const purchase = asRecord(data.purchase);
  return parseHotmartDate(purchase?.approved_date) || parseHotmartDate(purchase?.order_date);
}

function resolveAccessEnd(
  data: Record<string, any>,
  offer: MappedOffer | null,
  start: Date | null,
): Date | null {
  const explicit = accessEndsAtFrom(data);
  if (explicit) return explicit;
  if (!offer) return null;
  return accessEndFromPeriod(start ?? new Date(), offer.interval);
}

function switchOffer(data: Record<string, any>, env: Record<string, string | undefined>): MappedOffer | null {
  const plans = Array.isArray(data.plans) ? data.plans : [];
  const current = plans.find((plan) => asRecord(plan)?.current) || plans[plans.length - 1];
  const plan = asRecord(current) || asRecord(asRecord(data.subscription)?.plan);
  if (!plan) return null;
  return mapHotmartOffer(
    {
      offerCode: text(asRecord(plan.offer)?.code) || text(asRecord(plan.offer)?.key) || text(plan.offer_code),
      planId: plan.id,
      planName: text(plan.name),
      amountReais: typeof plan.price === "number" ? plan.price : null,
    },
    env,
  );
}

export function parseHotmartPostback(
  body: unknown,
  env: Record<string, string | undefined> = process.env,
): { ok: true; parsed: ParsedPostback } | { ok: false; reason: string } {
  const root = asRecord(body);
  if (!root) return { ok: false, reason: "invalid_body" };
  const version = text(root.version);
  const event = text(root.event);
  const id = text(root.id);
  if (version !== HOTMART_POSTBACK_VERSION || !event || !id) {
    return { ok: false, reason: "invalid_envelope" };
  }
  const data = asRecord(root.data) || {};
  const purchase = asRecord(data.purchase);
  const transaction = text(purchase?.transaction) || text(data.transaction);
  const productUcode = text(asRecord(data.product)?.ucode);
  const base = {
    id,
    event,
    version,
    transaction,
    email: emailFrom(data),
    subscriberCode: subscriberCodeFrom(data),
    productUcode,
  };

  if (event === "PURCHASE_COMPLETE") {
    return { ok: true, parsed: { ...base, effect: { kind: "record" } } };
  }
  if (event === "PURCHASE_APPROVED") {
    const offer = offerFromPurchase(data, env);
    if (!offer) return { ok: true, parsed: { ...base, effect: { kind: "fail", reason: "unmapped_offer" } } };
    const paidAt = parseHotmartDate(purchase?.approved_date) || parseHotmartDate(purchase?.order_date);
    return {
      ok: true,
      parsed: {
        ...base,
        effect: {
          kind: "activate",
          offer,
          recurrence: Number(purchase?.recurrence_number) || 1,
          accessEndsAt: resolveAccessEnd(data, offer, paidAt),
          paidAt,
        },
      },
    };
  }
  if (event === "PURCHASE_DELAYED" || event === "PURCHASE_PROTEST") {
    return { ok: true, parsed: { ...base, effect: { kind: "past_due", accessEndsAt: accessEndsAtFrom(data) } } };
  }
  if (event === "PURCHASE_CANCELED" || event === "PURCHASE_EXPIRED") {
    return { ok: true, parsed: { ...base, effect: { kind: "past_due", accessEndsAt: accessEndsAtFrom(data) } } };
  }
  if (event === "PURCHASE_REFUNDED" || event === "PURCHASE_CHARGEBACK") {
    return { ok: true, parsed: { ...base, effect: { kind: "revoke" } } };
  }
  if (event === "SUBSCRIPTION_CANCELLATION") {
    return {
      ok: true,
      parsed: { ...base, effect: { kind: "cancel_period_end", accessEndsAt: accessEndsAtFrom(data) } },
    };
  }
  if (event === "SWITCH_PLAN") {
    const offer = switchOffer(data, env);
    if (!offer) return { ok: true, parsed: { ...base, effect: { kind: "fail", reason: "unmapped_offer" } } };
    return {
      ok: true,
      parsed: {
        ...base,
        effect: { kind: "switch_plan", offer, accessEndsAt: resolveAccessEnd(data, offer, purchaseStart(data)) },
      },
    };
  }
  if (event === "UPDATE_SUBSCRIPTION_CHARGE_DATE") {
    const accessEndsAt = accessEndsAtFrom(data);
    if (!accessEndsAt) {
      return { ok: true, parsed: { ...base, effect: { kind: "fail", reason: "missing_charge_date" } } };
    }
    return { ok: true, parsed: { ...base, effect: { kind: "update_charge_date", accessEndsAt } } };
  }
  return { ok: true, parsed: { ...base, effect: { kind: "ignore", reason: "unhandled_event" } } };
}

export function productIsAllowed(productUcode: string | null, allowlist: string[]): boolean {
  if (!productUcode) return false;
  return allowlist.includes(productUcode);
}
