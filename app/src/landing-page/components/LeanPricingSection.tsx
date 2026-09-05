import { useEffect, useRef } from "react";
import { Link } from "react-router";
import { ArrowRight, Check } from "lucide-react";
import { useScrollReveal } from "../hooks/useScrollReveal";
import {
  useLandingText,
  landingCopy,
  landingFeatureList,
} from "../hooks/useLandingText";
import { trackMarketingEvent } from "../../client/analytics/marketingAnalytics";
import {
  trackLead,
  trackViewPricing,
} from "../../client/analytics/metaTracking";
import { Button } from "../../client/components/ui/button";
import { usePlanCatalog } from "../../client/hooks/usePlanCatalog";
import { formatPrice } from "../../shared/currency";

/**
 * Minimal pricing for the main landing: one Catequista card, trial-first.
 */
export function LeanPricingSection({
  ns = "landing",
  singlePlanOnly = false,
}: {
  ns?: string;
  singlePlanOnly?: boolean;
}) {
  const tr = useLandingText(ns);
  const { localize, publicPlans, getBySlug } = usePlanCatalog();
  const {
    ref: headerRef,
    className: headerClass,
    isVisible,
  } = useScrollReveal();
  const tracked = useRef(false);

  const planSlug = "single";
  const catalogPlan = getBySlug(planSlug);
  const loc = localize(catalogPlan);
  const monthlyCents =
    catalogPlan.prices.find(
      (item) => item.interval === "monthly" && item.isActive,
    )?.unitAmountCents ?? 0;
  const price = formatPrice(monthlyCents);
  const features = landingFeatureList(tr, `plans.${planSlug}.features`, loc.features);
  const href = `/signup?plan=${planSlug}`;
  const eyebrow = String(tr("pricing_eyebrow") || "").trim();
  const subtitle = String(tr("pricing_subtitle") || "").trim();
  const trialNote = String(tr("price_trial_note") || "").trim();
  const annualNote = String(tr("price_annual_note") || "").trim();
  const institutionalLink = String(tr("pricing_institutional_link") || "").trim();

  const visiblePlans = publicPlans.filter(
    (plan) =>
      plan.kind === "subscription" &&
      plan.slug !== "catechist_free" &&
      (!singlePlanOnly || plan.slug === planSlug),
  );

  useEffect(() => {
    if (!isVisible || tracked.current) return;
    tracked.current = true;
    trackMarketingEvent("pricing_viewed", {
      landing: ns,
      placement: singlePlanOnly
        ? "landing_lean_pricing_single"
        : "landing_lean_pricing",
    });
    trackViewPricing({
      plan_ids: visiblePlans.map((plan) => plan.slug),
      content_name: "Planos Catechis Landing",
    });
  }, [isVisible, ns, visiblePlans, singlePlanOnly]);

  if (singlePlanOnly) {
    return (
      <section
        id="planos"
        className="scroll-mt-20 max-w-4xl mx-auto px-4 py-14 md:py-16"
      >
        <div
          ref={headerRef}
          className={`mb-8 space-y-3 text-center ${headerClass}`}
        >
          {eyebrow ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="font-brand-display text-3xl font-semibold tracking-tight text-brand-ink sm:text-4xl">
            {tr("pricing_title")}
          </h2>
          <div
            className="mx-auto h-px w-16 bg-gradient-to-r from-brand-gold to-transparent"
            aria-hidden
          />
          {subtitle ? (
            <p className="text-muted-foreground max-w-xl mx-auto">{subtitle}</p>
          ) : null}
        </div>

        <div className="max-w-lg mx-auto">
          <div className="rounded-lg border border-brand-ink/20 bg-card p-6 shadow-elevation-sm">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-brand-display text-4xl font-semibold tracking-tight text-brand-ink">
                {price}
              </span>
              <span className="text-sm text-muted-foreground">
                {tr("per_month")}
              </span>
            </div>
            {annualNote ? (
              <p className="mt-1 text-sm text-muted-foreground">{annualNote}</p>
            ) : null}
            <p className="mt-3 inline-flex rounded-full bg-brand-ink/8 px-3 py-1 text-xs font-medium text-brand-ink">
              {tr("price_trial_badge")}
            </p>
            <ul className="mt-5 space-y-2.5 text-sm">
              {features.map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-ink" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <Button size="lg" variant="brand" asChild className="mt-6 w-full">
              <Link
                to={href}
                onClick={() => {
                  trackMarketingEvent("primary_cta_clicked", {
                    landing: ns,
                    placement: "lean_pricing_single",
                    destination: href,
                    plan: planSlug,
                  });
                  trackLead({
                    content_name: String(loc.name),
                    plan_id: planSlug,
                    content_ids: [planSlug],
                    value: Number((monthlyCents / 100).toFixed(2)),
                    currency: "BRL",
                  });
                }}
              >
                {tr("price_cta_single")}
                <ArrowRight className="h-4 w-4 shrink-0" />
              </Link>
            </Button>
          </div>

          {institutionalLink ? (
            <p className="mt-6 text-center text-sm text-muted-foreground">
              <Link
                to="/pricing"
                className="font-medium text-brand-ink underline underline-offset-2 hover:text-brand-ink-soft"
                onClick={() =>
                  trackMarketingEvent("primary_cta_clicked", {
                    landing: ns,
                    placement: "lean_pricing_institutional",
                    destination: "/pricing",
                  })
                }
              >
                {institutionalLink}
              </Link>
            </p>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section
      id="planos"
      className="scroll-mt-20 max-w-4xl mx-auto px-4 py-14 md:py-16"
    >
      <div
        ref={headerRef}
        className={`text-center mb-8 space-y-2 ${headerClass}`}
      >
        <h2 className="font-brand-display text-2xl font-semibold tracking-tight text-brand-ink sm:text-3xl">
          {tr("pricing_title")}
        </h2>
        {subtitle ? (
          <p className="text-muted-foreground max-w-xl mx-auto">{subtitle}</p>
        ) : null}
        {trialNote ? (
          <p className="text-sm font-medium text-brand-ink">{trialNote}</p>
        ) : null}
      </div>

      <div
        className={
          visiblePlans.length < 2
            ? "max-w-lg mx-auto"
            : "grid gap-4 sm:grid-cols-2"
        }
      >
        {visiblePlans.map((plan, index) => {
          const name = localize(plan.slug).name;
          const planCatalog = getBySlug(plan.slug);
          const planLoc = localize(planCatalog);
          const audience = landingCopy(
            tr,
            `plans.${plan.slug}.audience`,
            planCatalog.description || planLoc.name,
          );
          const featureList = landingFeatureList(
            tr,
            `plans.${plan.slug}.features`,
            planLoc.features,
          );
          const planHref = `/signup?plan=${plan.slug}`;
          const planMonthlyCents =
            planCatalog.prices.find(
              (item) => item.interval === "monthly" && item.isActive,
            )?.unitAmountCents ?? 0;

          return (
            <PlanCard
              key={plan.slug}
              delay={index * 40}
              name={String(name)}
              audience={String(audience)}
              price={formatPrice(planMonthlyCents)}
              period={String(tr("per_month"))}
              features={featureList}
              highlight={plan.highlight}
              popularLabel={String(tr("price_popular"))}
              cta={String(
                tr(
                  plan.slug === "unlimited"
                    ? "price_cta_unlimited"
                    : "price_cta_single",
                ),
              )}
              href={planHref}
              ns={ns}
              planId={plan.slug}
              monthlyCents={planMonthlyCents}
            />
          );
        })}
      </div>

      <p className="text-center text-sm text-muted-foreground mt-6">
        <Link
          to="/pricing"
          className="font-medium text-brand-ink underline underline-offset-2 hover:text-brand-ink-soft"
          onClick={() =>
            trackMarketingEvent("primary_cta_clicked", {
              landing: ns,
              placement: "lean_pricing_details",
              destination: "/pricing",
            })
          }
        >
          {tr("compare_plans")}
        </Link>
      </p>
    </section>
  );
}

function PlanCard({
  delay,
  name,
  audience,
  price,
  period,
  features,
  highlight,
  popularLabel,
  cta,
  href,
  ns,
  planId,
  monthlyCents,
}: {
  delay: number;
  name: string;
  audience: string;
  price: string;
  period: string;
  features: string[];
  highlight: boolean;
  popularLabel: string;
  cta: string;
  href: string;
  ns: string;
  planId: string;
  monthlyCents: number;
}) {
  const { ref, className } = useScrollReveal({ delay });

  return (
    <div
      ref={ref as any}
      className={`rounded-sm border p-5 flex flex-col ${className} ${
        highlight
          ? "border-2 border-brand-gold/70 bg-white"
          : "border-border/70 bg-card"
      }`}
    >
      {highlight && (
        <span className="mb-2 self-start rounded-full bg-brand-gold px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-ink">
          {popularLabel}
        </span>
      )}
      <p className="text-xs text-muted-foreground">{audience}</p>
      <h3 className="font-brand-display mt-1 text-lg font-semibold tracking-tight text-brand-ink">
        {name}
      </h3>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="font-brand-display text-3xl font-semibold tracking-tight text-brand-ink">
          {price}
        </span>
        <span className="text-sm text-muted-foreground">{period}</span>
      </div>
      <ul className="mt-4 space-y-2 text-sm flex-1">
        {features.slice(0, 4).map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check className="h-4 w-4 text-success shrink-0 mt-0.5" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <Button
        size="lg"
        variant={highlight ? "brand" : "default"}
        asChild
        className="mt-5 w-full"
      >
        <Link
          to={href}
          onClick={() => {
            trackMarketingEvent("primary_cta_clicked", {
              landing: ns,
              placement: "lean_pricing_plan",
              destination: href,
              plan: planId,
            });
            const value = Number((monthlyCents / 100).toFixed(2));
            trackLead({
              content_name: name,
              plan_id: planId,
              content_ids: [planId],
              value,
              currency: "BRL",
            });
          }}
        >
          {cta}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}
