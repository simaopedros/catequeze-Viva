import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { ArrowRight, Check, Star } from "lucide-react";
import { useScrollReveal } from "../hooks/useScrollReveal";
import { trackMarketingEvent } from "../../client/analytics/marketingAnalytics";
import { PRICING_PREVIEW } from "../content/landingContent";
import { Button } from "../../client/components/ui/button";
import { formatPrice } from "../../shared/currency";
import { PLANS, type PlanId } from "../../shared/pricing";
import { cn } from "../../client/utils";
import { useLandingText } from "../hooks/useLandingText";

type BillingInterval = "monthly" | "annual";

function formatPlanPrice(planId: string, interval: BillingInterval): { display: string; periodKey: "per_month" | "per_year"; monthlyEquivalent?: string } {
  const def = PLANS[planId as PlanId];
  if (!def) {
    return { display: "—", periodKey: "per_month" };
  }

  if (interval === "annual" && def.prices.annualCents != null) {
    const annual = def.prices.annualCents;
    const monthlyEq = Math.round(annual / 12);
    return {
      display: formatPrice(annual),
      periodKey: "per_year",
      monthlyEquivalent: formatPrice(monthlyEq),
    };
  }

  return {
    display: formatPrice(def.prices.monthlyCents),
    periodKey: "per_month",
  };
}

/**
 * Pricing preview shown on landing pages. Renders the 2 simplified plans
 * (Single + Unlimited) with trial CTA and monthly/annual toggle.
 */
export function PricingPreviewSection({ ns = "landing" }: { ns?: string }) {
  const tr = useLandingText(ns);
  const { t: tb } = useTranslation("billing");
  const { ref: headerRef, className: headerClass, isVisible } = useScrollReveal();
  const hasTrackedViewRef = useRef(false);
  const [interval, setInterval] = useState<BillingInterval>("monthly");

  useEffect(() => {
    if (!isVisible || hasTrackedViewRef.current) return;
    hasTrackedViewRef.current = true;
    trackMarketingEvent("pricing_viewed", {
      landing: ns,
      placement: "landing_pricing_preview",
    });
  }, [isVisible, ns]);

  return (
    <section id="planos" className="scroll-mt-20 max-w-5xl mx-auto px-4 py-20">
      <div ref={headerRef} className={`text-center mb-10 space-y-3 ${headerClass}`}>
        <h2 className="text-3xl sm:text-4xl font-bold">{tr("pricing_title")}</h2>
        <p className="text-lg text-muted-foreground max-w-3xl mx-auto">{tr("pricing_subtitle")}</p>
        <p className="text-sm font-medium text-primary">{tr("price_trial_note")}</p>

        <div className="inline-flex items-center rounded-full border bg-muted/40 p-1 mt-2">
          <button
            type="button"
            onClick={() => setInterval("monthly")}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              interval === "monthly" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tr("price_monthly")}
          </button>
          <button
            type="button"
            onClick={() => setInterval("annual")}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors inline-flex items-center gap-1.5",
              interval === "annual" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tr("price_annual")}
            <span className="rounded-full bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.5">
              {tr("annual_discount")}
            </span>
          </button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* RCD Anchor: show premium plan first so cheaper plan feels like a deal */}
        {[...PRICING_PREVIEW].reverse().map((plan, index) => (
          <PricingPreviewCard
            key={plan.planId}
            plan={plan}
            delay={index * 60}
            ns={ns}
            tr={tr}
            tb={tb}
            interval={interval}
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
          className="underline hover:text-foreground transition-colors"
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
  tb,
  interval,
}: {
  plan: (typeof PRICING_PREVIEW)[number];
  delay: number;
  ns: string;
  tr: (key: string, options?: any) => any;
  tb: (key: string, options?: any) => any;
  interval: BillingInterval;
}) {
  const { ref, className } = useScrollReveal({ delay });
  const name = (() => {
    const v = tb(`plans.${plan.planId}.name`);
    return typeof v === "string" && v !== `plans.${plan.planId}.name` ? v : plan.name;
  })();
  const audience = (() => {
    const v = tr(`plans.${plan.planId}.audience`);
    if (typeof v === "string" && v !== `plans.${plan.planId}.audience`) return v;
    return plan.planId === "single" ? "Para catequista individual" : "Para paroquia e diocese";
  })();
  const desc = (() => {
    const v = tr(`plans.${plan.planId}.desc`);
    return typeof v === "string" && v !== `plans.${plan.planId}.desc` ? v : plan.desc;
  })();
  const features = (() => {
    const v = tr(`plans.${plan.planId}.features`, { returnObjects: true });
    return Array.isArray(v) ? (v as string[]) : plan.features;
  })();
  const priced = formatPlanPrice(plan.planId, interval);
  const signupHref = `/signup?plan=${plan.planId}&interval=${interval}`;
  const ctaLabel =
    plan.planId === "unlimited" ? tr("price_cta_unlimited") : tr("price_cta_single");

  return (
    <div
      ref={ref as any}
      id={`planos-${plan.planId}`}
      className={`rounded-2xl border bg-card p-6 transition-colors relative flex flex-col scroll-mt-24 ${className} ${
        plan.highlight ? "border-primary/40 bg-primary/[0.03] shadow-elevation-sm" : "border-border/70"
      }`}
    >
      {plan.highlight && (
        <div className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-caption font-bold px-3 py-1 mb-3 self-start">
          <Star className="h-3 w-3" /> {tr("price_popular")}
        </div>
      )}
      <div className="mb-3 inline-flex self-start rounded-full bg-muted/70 px-3 py-1 text-[11px] font-medium text-muted-foreground">
        {audience}
      </div>
      <h3 className="text-xl font-bold">{name}</h3>
      <div className="mt-3 flex items-baseline gap-1 flex-wrap">
        <span className="text-3xl font-bold">{priced.display}</span>
        <span className="text-sm text-muted-foreground">{tr(priced.periodKey)}</span>
      </div>
      {priced.monthlyEquivalent && (
        <p className="text-xs text-muted-foreground mt-1">
          {tr("price_annual_equivalent", { price: priced.monthlyEquivalent })}
        </p>
      )}
      <p className="text-xs text-primary font-medium mt-1">{tr("price_trial_badge")}</p>
      <p className="text-sm text-muted-foreground mt-2">{desc}</p>
      <ul className="mt-4 space-y-2 text-sm flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
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
          onClick={() =>
            trackMarketingEvent("primary_cta_clicked", {
              landing: ns,
              placement: "landing_pricing_plan",
              destination: signupHref,
              plan: plan.planId,
              interval,
            })
          }
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
