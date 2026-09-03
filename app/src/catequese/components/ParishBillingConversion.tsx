import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  Church,
  Infinity as InfinityIcon,
  Loader2,
  Lock,
  Star,
  Users,
} from "lucide-react";
import { Button } from "../../client/components/ui/button";
import { SalesWhatsAppCta } from "../../client/components/SalesWhatsAppCta";
import { cn } from "../../client/utils";
import {
  annualDiscountPercent,
  formatMonthlyFromAnnualCents,
  formatPrice,
} from "../../shared/currency";
import type { BillingInterval } from "../lib/intendedPlan";

export type ParishBillingConversionProps = {
  parishName: string;
  isTrial: boolean;
  trialDaysLeft: number | null;
  trialEndsLabel: string | null;
  classesUsed: number;
  catechumensUsed: number;
  planName: string;
  features: string[];
  monthlyCents?: number;
  annualCents?: number;
  defaultInterval: BillingInterval;
  onIntervalChange?: (interval: BillingInterval) => void;
  onSubscribe: (interval: BillingInterval) => void;
  upgrading: boolean;
  error?: string | null;
};

function UsageStat({
  icon: Icon,
  label,
  unlimited,
}: {
  icon: typeof Users;
  label: string;
  unlimited?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-sm border border-border/60 bg-white px-3 py-2.5">
      <Icon
        className={cn(
          "h-4 w-4 shrink-0",
          unlimited ? "text-success" : "text-brand-ink",
        )}
        aria-hidden
      />
      <span
        className={cn(
          "text-sm font-semibold tracking-tight",
          unlimited ? "text-success" : "text-brand-ink",
        )}
      >
        {label}
      </span>
    </div>
  );
}

export function ParishBillingConversion({
  parishName,
  isTrial,
  trialDaysLeft,
  trialEndsLabel,
  classesUsed,
  catechumensUsed,
  planName,
  features,
  monthlyCents,
  annualCents,
  defaultInterval,
  onIntervalChange,
  onSubscribe,
  upgrading,
  error,
}: ParishBillingConversionProps) {
  const { t } = useTranslation("billing");
  const [interval, setInterval] = useState<BillingInterval>(defaultInterval);

  const selectInterval = (next: BillingInterval) => {
    setInterval(next);
    onIntervalChange?.(next);
  };

  const hasAnnual = typeof annualCents === "number" && annualCents > 0;
  const hasMonthly = typeof monthlyCents === "number" && monthlyCents > 0;
  const showAnnual = interval === "annual" && hasAnnual;
  const discount =
    hasMonthly && hasAnnual
      ? annualDiscountPercent(monthlyCents, annualCents)
      : 0;
  const yearlySavings =
    hasMonthly && hasAnnual ? monthlyCents * 12 - annualCents : 0;

  const headline = !isTrial
    ? t("parish_offer.headline_no_trial")
    : trialDaysLeft == null
      ? t("parish_offer.headline_trial_active")
      : trialDaysLeft <= 0
        ? t("parish_offer.headline_trial_ended")
        : t("parish_offer.headline_trial", { count: trialDaysLeft });

  const resultCopy = isTrial
    ? t("parish_offer.result_trial")
    : t("parish_offer.result_no_trial");

  const priceLabel = showAnnual
    ? formatMonthlyFromAnnualCents(annualCents!)
    : hasMonthly
      ? formatPrice(monthlyCents!)
      : "—";

  return (
    <div
      className="mx-auto max-w-3xl space-y-8"
      data-testid="parish-billing-conversion"
    >
      <section
        data-testid="parish-conversion-hero"
        className="relative overflow-hidden rounded-sm border border-border/70 bg-white px-5 py-6 sm:px-8 sm:py-8"
      >
        <div className="relative z-[1] space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-gold/15 text-brand-gold">
                <Church className="h-5 w-5" aria-hidden />
              </div>
              <p className="truncate text-sm font-semibold tracking-tight text-brand-ink sm:text-base">
                {parishName}
              </p>
            </div>
            {isTrial && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-gold/30 bg-brand-gold/12 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-gold-muted">
                <span
                  className="h-1.5 w-1.5 rounded-full bg-brand-gold"
                  aria-hidden
                />
                {t("parish_offer.trial_badge")}
              </span>
            )}
          </div>

          <div className="max-w-xl space-y-2">
            <h1 className="font-sans text-title-sm font-semibold tracking-tight text-brand-ink sm:text-title-md">
              {headline}
            </h1>
            {isTrial && trialEndsLabel && (
              <p className="text-sm font-medium text-brand-gold-muted">
                {trialEndsLabel}
              </p>
            )}
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-body">
              {resultCopy}
            </p>
          </div>
        </div>
        <Church
          className="pointer-events-none absolute -bottom-6 -right-4 hidden h-40 w-40 text-brand-gold/25 sm:block"
          strokeWidth={1}
          aria-hidden
        />
      </section>

      <section
        data-testid="parish-conversion-usage"
        aria-label={t("parish_offer.usage_aria")}
        className="grid items-center gap-4 rounded-sm border border-border/60 bg-muted/25 px-4 py-5 sm:grid-cols-[1fr_auto_1fr] sm:px-6"
      >
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {t("parish_offer.usage_trial_label")}
          </p>
          <div className="space-y-2">
            <UsageStat
              icon={Users}
              label={t("parish_offer.usage_class", { count: classesUsed })}
            />
            <UsageStat
              icon={Users}
              label={t("parish_offer.usage_catechumen", {
                count: catechumensUsed,
              })}
            />
          </div>
        </div>

        <div className="flex justify-center text-muted-foreground" aria-hidden>
          <ArrowDown className="h-5 w-5 sm:hidden" />
          <ArrowRight className="hidden h-5 w-5 sm:block" />
        </div>

        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {t("parish_offer.usage_plan_label")}
          </p>
          <div className="space-y-2">
            <UsageStat
              icon={InfinityIcon}
              unlimited
              label={t("parish_offer.usage_unlimited_classes")}
            />
            <UsageStat
              icon={InfinityIcon}
              unlimited
              label={t("parish_offer.usage_unlimited_catechumens")}
            />
          </div>
        </div>
      </section>

      <div className="flex justify-center">
        <div
          className="inline-flex items-center rounded-full border border-border/70 bg-white p-1"
          role="tablist"
          aria-label={t("parish_offer.interval_aria")}
        >
          <button
            type="button"
            role="tab"
            aria-selected={interval === "monthly"}
            data-testid="billing-interval-monthly"
            onClick={() => selectInterval("monthly")}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition-colors",
              interval === "monthly"
                ? "bg-brand-ink text-white"
                : "text-muted-foreground hover:text-brand-ink",
            )}
          >
            {t("parish_offer.interval_monthly")}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={interval === "annual"}
            data-testid="billing-interval-annual"
            onClick={() => selectInterval("annual")}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors",
              interval === "annual"
                ? "bg-brand-ink text-white"
                : "text-muted-foreground hover:text-brand-ink",
            )}
          >
            {t("parish_offer.interval_annual")}
            {discount > 0 && (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                  interval === "annual"
                    ? "bg-brand-gold text-brand-ink"
                    : "bg-brand-gold/15 text-brand-gold-muted",
                )}
              >
                {t("parish_offer.annual_discount", { percent: discount })}
              </span>
            )}
          </button>
        </div>
      </div>

      <section
        data-testid="parish-conversion-plan"
        className="relative rounded-sm border-2 border-brand-gold/70 bg-white p-5 sm:p-7"
      >
        <span className="absolute -top-3 right-5 inline-flex items-center gap-1 rounded-full bg-brand-gold px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-ink">
          <Star className="h-3 w-3" aria-hidden />
          {t("parish_offer.most_popular")}
        </span>

        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {planName}
          </p>
          <h2 className="text-lg font-semibold tracking-tight text-brand-ink sm:text-xl">
            {t("parish_offer.plan_result")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("parish_offer.plan_audience")}
          </p>
        </div>

        <div className="mt-6">
          <p className="flex flex-wrap items-baseline gap-1 text-brand-ink">
            <span className="text-4xl font-semibold tracking-tight sm:text-5xl">
              {priceLabel}
            </span>
            <span className="text-base text-muted-foreground">
              {t("parish_offer.per_month")}
            </span>
          </p>
          {showAnnual && hasAnnual && (
            <div className="mt-2 space-y-0.5 text-sm text-muted-foreground">
              <p>
                {t("parish_offer.billed_annually", {
                  price: formatPrice(annualCents!),
                })}
              </p>
              {yearlySavings > 0 && (
                <p className="font-semibold text-brand-gold-muted">
                  {t("parish_offer.save_year", {
                    price: formatPrice(yearlySavings),
                  })}
                </p>
              )}
            </div>
          )}
        </div>

        <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
          {features.map((feature) => (
            <li
              key={feature}
              className="flex items-start gap-2 text-sm text-brand-ink"
            >
              <Check
                className="mt-0.5 h-4 w-4 shrink-0 text-success"
                aria-hidden
              />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        {error && (
          <p
            role="alert"
            className="mt-5 rounded-sm border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        )}

        <Button
          size="lg"
          className="mt-6 h-12 w-full rounded-sm text-sm font-semibold"
          data-testid="billing-offer-cta"
          onClick={() => onSubscribe(interval)}
          disabled={upgrading}
        >
          {upgrading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("redirecting")}
            </>
          ) : (
            <>
              {t("parish_offer.cta")}
              <ArrowUpRight className="h-4 w-4" />
            </>
          )}
        </Button>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5" aria-hidden />
          {t("parish_offer.secure_payment")}
        </p>
      </section>

      <section
        data-testid="parish-conversion-diocese"
        className="rounded-sm border border-border/60 bg-muted/20 px-5 py-4"
      >
        <h2 className="text-sm font-semibold tracking-tight text-brand-ink">
          {t("parish_offer.diocese_title")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("parish_offer.diocese_desc")}
        </p>
        <div className="mt-3">
          <SalesWhatsAppCta
            placement="billing_diocese_coverage"
            variant="inline"
            prefill={t("request_diocese_prefill", { name: parishName || "—" })}
            cta={t("parish_offer.diocese_cta")}
            question={t("parish_offer.diocese_question")}
          />
        </div>
      </section>

      <footer
        data-testid="parish-conversion-support"
        className="flex flex-col items-center gap-2 border-t border-border/60 pt-6 text-center"
      >
        <p className="text-sm text-muted-foreground">
          {t("parish_offer.support_question")}
        </p>
        <SalesWhatsAppCta
          placement="billing_plans"
          variant="row"
          className="justify-center"
          cta={t("parish_offer.support_cta")}
        />
      </footer>
    </div>
  );
}
