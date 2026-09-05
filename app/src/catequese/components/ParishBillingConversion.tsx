import { useState, type ComponentType } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
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
import { BillingIntervalToggle } from "./BillingIntervalToggle";

export type BillingConversionVariant = "parish" | "catechist";

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
  variant?: BillingConversionVariant;
  planClassLimit?: number | null;
  planCatechumenLimit?: number | null;
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
  features = [],
  monthlyCents,
  annualCents,
  defaultInterval,
  onIntervalChange,
  onSubscribe,
  upgrading,
  error,
  variant = "parish",
  planClassLimit,
  planCatechumenLimit,
}: ParishBillingConversionProps) {
  const { t } = useTranslation("billing");
  const [interval, setInterval] = useState<BillingInterval>(defaultInterval);
  const ns = variant === "catechist" ? "catechist_offer" : "parish_offer";
  const testId =
    variant === "catechist"
      ? "personal-billing-conversion"
      : "parish-billing-conversion";
  const HeroIcon: ComponentType<{
    className?: string;
    strokeWidth?: number;
  }> = variant === "catechist" ? BookOpen : Church;

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
    ? t(`${ns}.headline_no_trial`)
    : trialDaysLeft == null
      ? t(`${ns}.headline_trial_active`)
      : trialDaysLeft <= 0
        ? t(`${ns}.headline_trial_ended`)
        : t(`${ns}.headline_trial`, { count: trialDaysLeft });

  const resultCopy = isTrial
    ? t(`${ns}.result_trial`)
    : t(`${ns}.result_no_trial`);

  const priceLabel = showAnnual
    ? formatMonthlyFromAnnualCents(annualCents!)
    : hasMonthly
      ? formatPrice(monthlyCents!)
      : "—";

  const planClassesUnlimited =
    variant === "parish" ||
    planClassLimit == null ||
    !Number.isFinite(planClassLimit);
  const planCatechumensUnlimited =
    variant === "parish" ||
    planCatechumenLimit == null ||
    !Number.isFinite(planCatechumenLimit);

  return (
    <div className="mx-auto max-w-3xl space-y-8" data-testid={testId}>
      <section
        data-testid={`${
          variant === "catechist" ? "personal" : "parish"
        }-conversion-hero`}
        className="relative overflow-hidden rounded-sm border border-border/70 bg-white px-5 py-6 sm:px-8 sm:py-8"
      >
        <div className="relative z-[1] space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-gold/15 text-brand-gold">
                <HeroIcon className="h-5 w-5" aria-hidden />
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
                {t(`${ns}.trial_badge`)}
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
        <HeroIcon
          className="pointer-events-none absolute -bottom-6 -right-4 hidden h-40 w-40 text-brand-gold/25 sm:block"
          strokeWidth={1}
          aria-hidden
        />
      </section>

      <section
        data-testid={`${
          variant === "catechist" ? "personal" : "parish"
        }-conversion-usage`}
        aria-label={t(`${ns}.usage_aria`)}
        className="grid items-center gap-4 rounded-sm border border-border/60 bg-muted/25 px-4 py-5 sm:grid-cols-[1fr_auto_1fr] sm:px-6"
      >
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {t(`${ns}.usage_trial_label`)}
          </p>
          <div className="space-y-2">
            <UsageStat
              icon={Users}
              label={t(`${ns}.usage_class`, { count: classesUsed })}
            />
            <UsageStat
              icon={Users}
              label={t(`${ns}.usage_catechumen`, {
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
            {t(`${ns}.usage_plan_label`)}
          </p>
          <div className="space-y-2">
            <UsageStat
              icon={planClassesUnlimited ? InfinityIcon : Users}
              unlimited={planClassesUnlimited}
              label={
                planClassesUnlimited
                  ? t(`${ns}.usage_unlimited_classes`)
                  : t(`${ns}.usage_plan_classes`, { count: planClassLimit })
              }
            />
            <UsageStat
              icon={planCatechumensUnlimited ? InfinityIcon : Users}
              unlimited={planCatechumensUnlimited}
              label={
                planCatechumensUnlimited
                  ? t(`${ns}.usage_unlimited_catechumens`)
                  : t(`${ns}.usage_plan_catechumens`, {
                      count: planCatechumenLimit,
                    })
              }
            />
          </div>
        </div>
      </section>

      <BillingIntervalToggle
        interval={interval}
        onChange={selectInterval}
        discountPercent={discount}
        ns={ns}
      />

      <section
        data-testid={`${
          variant === "catechist" ? "personal" : "parish"
        }-conversion-plan`}
        className="relative rounded-sm border-2 border-brand-gold/70 bg-white p-5 sm:p-7"
      >
        <span className="absolute -top-3 right-5 inline-flex items-center gap-1 rounded-full bg-brand-gold px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-ink">
          <Star className="h-3 w-3" aria-hidden />
          {t(`${ns}.most_popular`)}
        </span>

        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {planName}
          </p>
          <h2 className="text-lg font-semibold tracking-tight text-brand-ink sm:text-xl">
            {t(`${ns}.plan_result`)}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t(`${ns}.plan_audience`)}
          </p>
        </div>

        <div className="mt-6">
          <p className="flex flex-wrap items-baseline gap-1 text-brand-ink">
            <span className="text-4xl font-semibold tracking-tight sm:text-5xl">
              {priceLabel}
            </span>
            <span className="text-base text-muted-foreground">
              {t(`${ns}.per_month`)}
            </span>
          </p>
          {showAnnual && hasAnnual && (
            <div className="mt-2 space-y-0.5 text-sm text-muted-foreground">
              <p>
                {t(`${ns}.billed_annually`, {
                  price: formatPrice(annualCents!),
                })}
              </p>
              {yearlySavings > 0 && (
                <p className="font-semibold text-brand-gold-muted">
                  {t(`${ns}.save_year`, {
                    price: formatPrice(yearlySavings),
                  })}
                </p>
              )}
            </div>
          )}
        </div>

        <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
          {(features ?? []).map((feature) => (
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
              {t(`${ns}.cta`)}
              <ArrowUpRight className="h-4 w-4" />
            </>
          )}
        </Button>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5" aria-hidden />
          {t(`${ns}.secure_payment`)}
        </p>
      </section>

      {variant === "parish" && (
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
              prefill={t("request_diocese_prefill", {
                name: parishName || "—",
              })}
              cta={t("parish_offer.diocese_cta")}
              question={t("parish_offer.diocese_question")}
            />
          </div>
        </section>
      )}

      <footer
        data-testid={`${
          variant === "catechist" ? "personal" : "parish"
        }-conversion-support`}
        className="flex flex-col items-center gap-2 border-t border-border/60 pt-6 text-center"
      >
        <p className="text-sm text-muted-foreground">
          {t(`${ns}.support_question`)}
        </p>
        <SalesWhatsAppCta
          placement="billing_plans"
          variant="row"
          className="justify-center"
          cta={t(`${ns}.support_cta`)}
        />
      </footer>
    </div>
  );
}
