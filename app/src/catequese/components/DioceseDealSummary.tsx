import { Handshake } from "lucide-react";
import { useTranslation } from "react-i18next";

export type DioceseDealSummaryProps = {
  dioceseName: string;
  status?: string | null;
  covering?: boolean;
  parishesUsed?: number;
  maxParishes?: number | null;
  maxClasses?: number | null;
  maxCatechists?: number | null;
  maxCatechumens?: number | null;
  startsAt?: string | Date | null;
  endsAt?: string | Date | null;
  /** Hide commercial terms — cúria / parish view. */
  readOnly?: boolean;
};

function formatMaybeDate(value: string | Date | null | undefined, locale: string) {
  if (!value) return null;
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(locale, {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function DioceseDealSummary({
  dioceseName,
  status,
  covering,
  parishesUsed = 0,
  maxParishes,
  maxClasses,
  maxCatechists,
  maxCatechumens,
  startsAt,
  endsAt,
}: DioceseDealSummaryProps) {
  const { t, i18n } = useTranslation("billing");
  const locale = i18n.language || "pt-BR";
  const statusKey = String(status || "NONE").toUpperCase();
  const parishCap =
    maxParishes == null ? t("deal.parishes_unlimited") : String(maxParishes);
  const startLabel = formatMaybeDate(startsAt, locale);
  const endLabel = formatMaybeDate(endsAt, locale);

  return (
    <section
      data-testid="diocese-deal-summary"
      data-status={statusKey}
      data-covering={covering ? "true" : "false"}
      className="rounded-sm border border-border/70 bg-white p-5 space-y-3"
    >
      <div className="flex items-start gap-3">
        <div className="rounded-sm border border-border/70 bg-muted/30 p-2">
          <Handshake className="h-5 w-5 text-brand-ink" />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {t("deal.eyebrow")}
          </p>
          <h2 className="text-sm font-semibold tracking-tight text-brand-ink">
            {dioceseName}
          </h2>
          <p className="text-sm text-muted-foreground">
            {covering ? t("deal.covering_desc") : t("deal.paused_desc")}
          </p>
        </div>
        <span className="inline-flex items-center rounded-full border border-border/70 bg-muted/30 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-ink">
          {t(`deal.status_${statusKey}`, {
            defaultValue: t("deal.status_NONE"),
          })}
        </span>
      </div>
      <dl className="grid gap-3 sm:grid-cols-3 text-sm">
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {t("deal.parishes")}
          </dt>
          <dd className="mt-1 font-semibold text-brand-ink">
            {t("deal.parishes_used", { used: parishesUsed, max: parishCap })}
          </dd>
        </div>
        {maxClasses != null && (
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {t("deal.classes")}
            </dt>
            <dd className="mt-1 font-semibold text-brand-ink">{maxClasses}</dd>
          </div>
        )}
        {maxCatechists != null && (
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {t("deal.catechists")}
            </dt>
            <dd className="mt-1 font-semibold text-brand-ink">
              {maxCatechists}
            </dd>
          </div>
        )}
        {maxCatechumens != null && (
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {t("deal.catechumens")}
            </dt>
            <dd className="mt-1 font-semibold text-brand-ink">
              {maxCatechumens}
            </dd>
          </div>
        )}
      </dl>
      {(startLabel || endLabel) && (
        <p className="text-xs text-muted-foreground">
          {startLabel && t("deal.starts", { date: startLabel })}
          {startLabel && endLabel ? " · " : ""}
          {endLabel && t("deal.ends", { date: endLabel })}
        </p>
      )}
    </section>
  );
}
