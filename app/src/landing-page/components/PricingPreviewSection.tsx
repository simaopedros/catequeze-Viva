import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, Check, Star } from "lucide-react";
import { useScrollReveal } from "../hooks/useScrollReveal";
import { trackMarketingEvent } from "../../client/analytics/marketingAnalytics";
import {
  trackLead,
  trackViewPricing,
} from "../../client/analytics/metaTracking";
import { PRICING_PREVIEW } from "../content/landingContent";
import { Button } from "../../client/components/ui/button";
import {
  formatEquivalentMonthlyPrice,
  formatPrice,
} from "../../shared/currency";
import { PLANS } from "../../shared/pricing";
import { cn } from "../../client/utils";
import { useLandingText, landingCopy, landingFeatureList } from "../hooks/useLandingText";
import { usePlanCatalog } from "../../client/hooks/usePlanCatalog";

type BillingInterval = "monthly" | "annual";

function formatPlanPrice(
  planId: string,
  interval: BillingInterval,
  getBySlug: (slug: string) => { prices: { interval: string; unitAmountCents: number; isActive: boolean }[] },
): {
  display: string;
  periodKey: "per_month" | "per_year";
  monthlyEquivalent?: string;
} {
  const plan = getBySlug(planId);
  const monthly = plan.prices.find((price) => price.interval === "monthly" && price.isActive);
  const annual = plan.prices.find((price) => price.interval === "annual" && price.isActive);
  if (!monthly && !annual) {
    const def = PLANS[planId];
    if (!def) return { display: "—", periodKey: "per_month" };
    if (interval === "annual" && def.prices.annualCents != null) {
      return {
        display: formatPrice(def.prices.annualCents),
        periodKey: "per_year",
        monthlyEquivalent: formatEquivalentMonthlyPrice(def.prices.annualCents),
      };
    }
    return {
      display: formatPrice(def.prices.monthlyCents),
      periodKey: "per_month",
    };
  }

  if (interval === "annual" && annual) {
    return {
      display: formatPrice(annual.unitAmountCents),
      periodKey: "per_year",
      monthlyEquivalent: formatEquivalentMonthlyPrice(annual.unitAmountCents),
    };
  }

  return {
    display: formatPrice(monthly?.unitAmountCents ?? 0),
    periodKey: "per_month",
  };
}

/**
 * Pricing preview shown on landing pages. Cards come from the live public catalog.
 */
export function PricingPreviewSection({ ns = "landing" }: { ns?: string }) {
  const tr = useLandingText(ns);
  const { localize, getBySlug, publicPlans } = usePlanCatalog();
  const {
    ref: headerRef,
    className: headerClass,
    isVisible,
  } = useScrollReveal();
  const hasTrackedViewRef = useRef(false);
  const [interval, setInterval] = useState<BillingInterval>("monthly");

  const previewPlans = publicPlans
    .filter((plan) => plan.kind === "subscription" && plan.slug !== "catechist_free")
    .map((plan) => {
      const loc = localize(plan);
      const staticFallback = PRICING_PREVIEW.find((item) => item.planId === plan.slug);
      return {
        planId: plan.slug,
        highlight: plan.highlight,
        desc: landingCopy(tr, `plans.${plan.slug}.desc`, plan.description || staticFallback?.desc || loc.name),
        features: landingFeatureList(
          tr,
          `plans.${plan.slug}.features`,
          loc.features.length ? loc.features : staticFallback?.features ?? [],
        ),
      };
    });

  useEffect(() => {
    if (!isVisible || hasTrackedViewRef.current) return;
    hasTrackedViewRef.current = true;
    trackMarketingEvent("pricing_viewed", {
      landing: ns,
      placement: "landing_pricing_preview",
    });
    trackViewPricing({
      plan_ids: previewPlans.map((plan) => plan.planId),
      content_name: "Planos Catechis Landing Preview",
    });
  }, [isVisible, ns, previewPlans]);

  return (
    <section id="planos" className="scroll-mt-20 max-w-5xl mx-auto px-4 py-20">
      <div
        ref={headerRef}
        className={`mb-10 space-y-3 text-center ${headerClass}`}
      >
        <div
          className="mx-auto h-px w-16 bg-gradient-to-r from-brand-gold to-transparent"
          aria-hidden
        />
        <h2 className="font-brand-display text-3xl font-semibold tracking-tight text-brand-ink sm:text-4xl">
          {tr("pricing_title")}
        </h2>
        <p className="mx-auto max-w-3xl text-lg text-muted-foreground">
          {tr("pricing_subtitle")}
        </p>
        <p className="text-sm font-medium text-brand-ink">
          {tr("price_trial_note")}
        </p>

        <div className="mt-2 inline-flex items-center rounded-sm border border-border/70 bg-muted/40 p-1">
          <button
            type="button"
            onClick={() => setInterval("monthly")}
            className={cn(
              "rounded-sm px-4 py-1.5 text-sm font-medium transition-colors",
              interval === "monthly"
                ? "bg-white font-semibold tracking-tight text-brand-ink"
                : "text-muted-foreground hover:text-brand-ink",
            )}
          >
            {tr("price_monthly")}
          </button>
          <button
            type="button"
            onClick={() => setInterval("annual")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-sm px-4 py-1.5 text-sm font-medium transition-colors",
              interval === "annual"
                ? "bg-white font-semibold tracking-tight text-brand-ink"
                : "text-muted-foreground hover:text-brand-ink",
            )}
          >
            {tr("price_annual")}
            <span className="rounded-sm bg-brand-ink/8 px-1.5 py-0.5 text-micro font-semibold uppercase tracking-wide text-brand-ink">
              {tr("annual_discount")}
            </span>
          </button>
        </div>
      </div>

      <div
        className={
          previewPlans.length < 2
            ? "max-w-lg mx-auto"
            : "grid gap-4 sm:grid-cols-2"
        }
      >
        {previewPlans.map((plan) => (
          <PricingPreviewCard
            key={plan.planId}
            plan={plan}
            delay={0}
            ns={ns}
            tr={tr}
            name={localize(plan.planId).name}
            interval={interval}
            getBySlug={getBySlug}
          />
        ))}
      </div>

      <p className="text-center text-sm text-muted-foreground mt-8">
        <Link
          to="/pricing"
          onClick={() =>
            trackMarketingEvent("primary_cta_clicked", {
              landing: ns,
              placement: "landing_pricing_footer",
              destination: "/pricing",
            })
          }
          className="font-medium text-brand-ink underline underline-offset-2 transition-colors hover:text-brand-ink-soft"
        >
          {tr("compare_plans")}
        </Link>
      </p>
    </section>
  );
}

function PricingPreviewCard({
  plan,
  delay,
  ns,
  tr,
  name,
  interval,
  getBySlug,
}: {
  plan: {
    planId: string;
    highlight: boolean;
    desc: string;
    features: string[];
  };
  delay: number;
  ns: string;
  tr: (key: string, options?: any) => any;
  name: string;
  interval: BillingInterval;
  getBySlug: ReturnType<typeof usePlanCatalog>["getBySlug"];
}) {
  const { ref, className } = useScrollReveal({ delay });
  const audience = landingCopy(
    tr,
    `plans.${plan.planId}.audience`,
    plan.planId === "single"
      ? "Para catequista individual"
      : plan.planId === "unlimited"
        ? "Para paroquia e diocese"
        : "",
  );
  const desc = landingCopy(tr, `plans.${plan.planId}.desc`, plan.desc);
  const features = landingFeatureList(tr, `plans.${plan.planId}.features`, plan.features);
  const priced = formatPlanPrice(plan.planId, interval, getBySlug);
  const signupHref = `/signup?plan=${plan.planId}&interval=${interval}`;
  const ctaLabel =
    plan.planId === "unlimited"
      ? tr("price_cta_unlimited")
      : tr("price_cta_single");

  return (
    <div
      ref={ref as any}
      id={`planos-${plan.planId}`}
      className={`relative flex scroll-mt-24 flex-col rounded-lg border bg-card p-6 transition-shadow ${className} ${
        plan.highlight
          ? "border-brand-ink/30 shadow-elevation-md ring-1 ring-brand-ink/10"
          : "border-border shadow-elevation-sm"
      }`}
    >
      {/* Slot de altura fixa: a tarja "mais popular" só existe num dos planos e,
          quando entrava e saía do fluxo, empurrava título, preço e lista de
          benefícios para alturas diferentes entre os dois cards lado a lado. */}
      <div className="mb-3 flex min-h-7 items-start">
        {plan.highlight && (
          <div className="inline-flex items-center gap-1 rounded-full bg-brand-ink px-3 py-1 text-caption font-semibold text-white">
            <Star className="h-3 w-3" /> {tr("price_popular")}
          </div>
        )}
      </div>
      <div className="mb-3 inline-flex self-start rounded-full bg-muted px-3 py-1 text-[11px] font-medium text-muted-foreground">
        {audience}
      </div>
      <h3 className="text-xl font-semibold tracking-tight text-brand-ink">
        {name}
      </h3>
      <div className="mt-3 flex flex-wrap items-baseline gap-1">
        <span className="text-3xl font-semibold tracking-tight text-brand-ink">
          {priced.display}
        </span>
        <span className="text-sm text-muted-foreground">
          {tr(priced.periodKey)}
        </span>
      </div>
      {priced.monthlyEquivalent && (
        <p className="mt-1 text-xs text-muted-foreground">
          {tr("price_annual_equivalent", { price: priced.monthlyEquivalent })}
        </p>
      )}
      <p className="mt-1 text-xs font-medium text-brand-ink">
        {tr("price_trial_badge")}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
      <ul className="mt-4 flex-1 space-y-2 text-sm">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-ink" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <Button
        size="lg"
        variant={plan.highlight ? "brand" : "default"}
        asChild
        className="mt-6 w-full h-auto min-h-11"
      >
        <Link
          to={signupHref}
          onClick={() => {
            trackMarketingEvent("primary_cta_clicked", {
              landing: ns,
              placement: "landing_pricing_plan",
              destination: signupHref,
              plan: plan.planId,
              interval,
            });
            const catalogPlan = getBySlug(plan.planId);
            const annual = catalogPlan.prices.find((price) => price.interval === "annual" && price.isActive);
            const monthly = catalogPlan.prices.find((price) => price.interval === "monthly" && price.isActive);
            const cents =
              interval === "annual" && annual
                ? annual.unitAmountCents
                : monthly?.unitAmountCents;
            trackLead({
              content_name: name,
              plan_id: plan.planId,
              content_ids: [plan.planId],
              value:
                typeof cents === "number"
                  ? Number((cents / 100).toFixed(2))
                  : undefined,
              currency: "BRL",
            });
          }}
        >
          {typeof ctaLabel === "string" && ctaLabel.includes("price_cta")
            ? tr("price_cta_start")
            : ctaLabel}
          <ArrowRight className="h-4 w-4 shrink-0" />
        </Link>
      </Button>
    </div>
  );
}
