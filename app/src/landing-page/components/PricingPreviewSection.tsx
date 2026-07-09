import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { ArrowRight, Check, Star } from "lucide-react";
import { useScrollReveal } from "../hooks/useScrollReveal";
import { trackMarketingEvent } from "../../client/analytics/marketingAnalytics";
import {
  trackLead,
  trackViewPricing,
} from "../../client/analytics/metaTracking";
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
    trackViewPricing({
      plan_ids: ["single", "unlimited"],
      content_name: "Planos Catechis Landing Preview",
    });
  }, [isVisible, ns]);

  return (
    <section id="planos" className="scroll-mt-20 max-w-5xl mx-auto px-4 py-20">
      <div ref={headerRef} className={`mb-10 space-y-3 text-center ${headerClass}`}>
        <div className="mx-auto h-px w-10 bg-[#D39A2B]" aria-hidden />
        <h2 className="text-3xl font-semibold tracking-tight text-[#071A2D] sm:text-4xl" style={{ fontFamily: "var(--font-brand-display)" }}>{tr("pricing_title")}</h2>
        <p className="mx-auto max-w-3xl text-lg text-muted-foreground">{tr("pricing_subtitle")}</p>
        <p className="text-sm font-medium text-[#071A2D]">{tr("price_trial_note")}</p>

        <div className="mt-2 inline-flex items-center rounded-sm border border-border/70 bg-muted/40 p-1">
          <button
            type="button"
            onClick={() => setInterval("monthly")}
            className={cn(
              "rounded-sm px-4 py-1.5 text-sm font-medium transition-colors",
              interval === "monthly" ? "bg-white text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tr("price_monthly")}
          </button>
          <button
            type="button"
            onClick={() => setInterval("annual")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-sm px-4 py-1.5 text-sm font-medium transition-colors",
              interval === "annual" ? "bg-white text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tr("price_annual")}
            <span className="rounded-sm bg-[#071A2D]/08 px-1.5 py-0.5 text-[10px] font-bold text-[#071A2D]">
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
      className={`relative flex scroll-mt-24 flex-col rounded-sm border bg-white p-6 transition-colors ${className} ${
        plan.highlight ? "border-[#071A2D]/30 ring-1 ring-[#071A2D]/10" : "border-border/70"
      }`}
    >
      {plan.highlight && (
        <div className="mb-3 inline-flex items-center gap-1 self-start rounded-sm bg-[#071A2D] px-3 py-1 text-caption font-semibold text-white">
          <Star className="h-3 w-3" /> {tr("price_popular")}
        </div>
      )}
      <div className="mb-3 inline-flex self-start rounded-sm bg-muted/70 px-3 py-1 text-[11px] font-medium text-muted-foreground">
        {audience}
      </div>
      <h3 className="text-xl font-semibold tracking-tight text-[#071A2D]">{name}</h3>
      <div className="mt-3 flex flex-wrap items-baseline gap-1">
        <span className="text-3xl font-semibold tracking-tight text-[#071A2D]">{priced.display}</span>
        <span className="text-sm text-muted-foreground">{tr(priced.periodKey)}</span>
      </div>
      {priced.monthlyEquivalent && (
        <p className="mt-1 text-xs text-muted-foreground">
          {tr("price_annual_equivalent", { price: priced.monthlyEquivalent })}
        </p>
      )}
      <p className="mt-1 text-xs font-medium text-[#071A2D]">{tr("price_trial_badge")}</p>
      <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
      <ul className="mt-4 flex-1 space-y-2 text-sm">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#071A2D]" />
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
            const def = PLANS[plan.planId as PlanId];
            const cents =
              interval === "annual" && def?.prices.annualCents != null
                ? def.prices.annualCents
                : def?.prices.monthlyCents;
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
