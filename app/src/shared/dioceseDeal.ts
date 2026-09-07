/**
 * Negotiated diocese subscriptions (Cúria deals).
 *
 * These are commercial/ops licenses on TenantBilling — not a public pricing
 * SKU and not Stripe Checkout. Coverage still flows through the existing
 * diocese umbrella (plan unlimited/diocese + ACTIVE).
 */

export const DIOCESE_DEAL_PROCESSOR = "MANUAL" as const;

export const DIOCESE_DEAL_STATUSES = [
  "ACTIVE",
  "SUSPENDED",
  "INACTIVE",
] as const;

export type DioceseDealStatus = (typeof DIOCESE_DEAL_STATUSES)[number];

export const DIOCESE_DEAL_PLAN = "unlimited";

/** Parish workspaces that consume a diocese parish seat. Cúria (DIOCESE) does not. */
export const DIOCESE_QUOTA_PARISH_TYPES = ["PARISH", "COMMUNITY"] as const;

export type DioceseDealBilling = {
  plan?: string | null;
  status?: string | null;
  trialEndsAt?: Date | string | null;
  manualDeal?: boolean | null;
  processor?: string | null;
  maxParishes?: number | null;
  maxClasses?: number | null;
  maxCatechumens?: number | null;
  maxCatechists?: number | null;
  startsAt?: Date | string | null;
  endsAt?: Date | string | null;
};

export function isDioceseUmbrellaPlan(plan: string | null | undefined): boolean {
  const key = String(plan || "")
    .trim()
    .toUpperCase();
  return key === "UNLIMITED" || key === "DIOCESE";
}

export function isManualDioceseDeal(
  billing: DioceseDealBilling | null | undefined,
): boolean {
  if (!billing) return false;
  if (billing.manualDeal) return true;
  return (
    String(billing.processor || "").toUpperCase() === DIOCESE_DEAL_PROCESSOR
  );
}

function coerceDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** ACTIVE deals may declare a commercial window; outside it they do not cover. */
export function isDioceseDealWindowOpen(
  billing: DioceseDealBilling | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!billing) return false;
  const startsAt = coerceDate(billing.startsAt);
  if (startsAt && startsAt.getTime() > now.getTime()) return false;
  const endsAt = coerceDate(billing.endsAt);
  if (endsAt && endsAt.getTime() < now.getTime()) return false;
  return true;
}

/**
 * Complimentary / Stripe diocese licenses keep ACTIVE, PAST_DUE and open TRIAL.
 * Negotiated MANUAL deals cover only while ACTIVE (and inside the window).
 */
function isLegacyDioceseLicenseActive(
  billing: DioceseDealBilling,
  now: Date,
): boolean {
  const status = String(billing.status || "").toUpperCase();
  if (status === "ACTIVE" || status === "PAST_DUE") return true;
  if (status === "TRIAL") {
    const trialEndsAt = coerceDate(billing.trialEndsAt);
    return Boolean(trialEndsAt && trialEndsAt.getTime() >= now.getTime());
  }
  return false;
}

export function normalizeDioceseDealStatus(
  status: string | null | undefined,
): DioceseDealStatus | null {
  const key = String(status || "")
    .trim()
    .toUpperCase();
  if (key === "ACTIVE") return "ACTIVE";
  if (key === "SUSPENDED") return "SUSPENDED";
  if (key === "INACTIVE" || key === "CANCELED") return "INACTIVE";
  return null;
}

/**
 * Parish inherits diocese entitlement while the license covers.
 * Negotiated deals: ACTIVE + commercial window. Other diocese licenses:
 * existing ACTIVE / PAST_DUE / open TRIAL semantics.
 */
export function isDioceseDealCovering(
  billing: DioceseDealBilling | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!billing) return false;
  if (!isDioceseUmbrellaPlan(billing.plan)) return false;
  if (!isDioceseDealWindowOpen(billing, now)) return false;
  if (isManualDioceseDeal(billing)) {
    return String(billing.status || "").toUpperCase() === "ACTIVE";
  }
  return isLegacyDioceseLicenseActive(billing, now);
}

export function parishQuotaReached(
  used: number,
  maxParishes: number | null | undefined,
): boolean {
  if (maxParishes == null) return false;
  return used >= maxParishes;
}

export function canAddParishUnderDeal(opts: {
  covering: boolean;
  parishesUsed: number;
  maxParishes: number | null | undefined;
}): boolean {
  if (!opts.covering) return false;
  return !parishQuotaReached(opts.parishesUsed, opts.maxParishes);
}

/** Server HttpError copy — always pt-BR (product locale). */
export function dioceseDealBlockedNewParishMessage(
  billing: DioceseDealBilling | null | undefined,
): string {
  const status = normalizeDioceseDealStatus(billing?.status);
  if (status === "SUSPENDED") {
    return "O acordo pastoral desta diocese está suspenso. Os dados das paróquias continuam guardados; não é possível abrir novas paróquias até a cúria regularizar o acordo com a Catequese Viva. Não é necessário assinar no cartão.";
  }
  if (status === "INACTIVE") {
    return "O acordo pastoral desta diocese está inativo. Os dados existentes permanecem. Fale com a Catequese Viva para reativar a cobertura — este caminho não passa pelo checkout.";
  }
  if (!isDioceseDealWindowOpen(billing)) {
    return "O acordo pastoral desta diocese está fora do período combinado. Os dados existentes permanecem. Fale com a Catequese Viva para renovar a cobertura.";
  }
  return "Esta diocese ainda não tem um acordo pastoral ativo. Fale com a Catequese Viva para combinar a cobertura das paróquias.";
}

export function dioceseParishQuotaMessage(used: number, max: number): string {
  return `A diocese atingiu o número de paróquias combinado no acordo (${used}/${max}). Os espaços atuais continuam; para incluir outra paróquia, fale com a Catequese Viva para ampliar o acordo. Não é necessário assinar no cartão.`;
}

export type DioceseDealPublicSummary = {
  dioceseId: string;
  dioceseName: string;
  status: string | null;
  covering: boolean;
  manualDeal: boolean;
  parishesUsed: number;
  maxParishes: number | null;
  maxClasses: number | null;
  maxCatechumens: number | null;
  maxCatechists: number | null;
  startsAt: Date | string | null;
  endsAt: Date | string | null;
  canAddParish: boolean;
};

export function toDioceseDealPublicSummary(opts: {
  dioceseId: string;
  dioceseName: string;
  billing: DioceseDealBilling | null | undefined;
  parishesUsed: number;
}): DioceseDealPublicSummary {
  const covering = isDioceseDealCovering(opts.billing);
  const maxParishes = opts.billing?.maxParishes ?? null;
  return {
    dioceseId: opts.dioceseId,
    dioceseName: opts.dioceseName,
    status: opts.billing?.status ?? null,
    covering,
    manualDeal: isManualDioceseDeal(opts.billing),
    parishesUsed: opts.parishesUsed,
    maxParishes,
    maxClasses: opts.billing?.maxClasses ?? null,
    maxCatechumens: opts.billing?.maxCatechumens ?? null,
    maxCatechists: opts.billing?.maxCatechists ?? null,
    startsAt: opts.billing?.startsAt ?? null,
    endsAt: opts.billing?.endsAt ?? null,
    canAddParish: canAddParishUnderDeal({
      covering,
      parishesUsed: opts.parishesUsed,
      maxParishes,
    }),
  };
}
