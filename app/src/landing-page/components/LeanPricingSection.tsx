import { useEffect, useRef } from "react";
import { Link } from "react-router";
import { ArrowRight, Check } from "lucide-react";
import { useScrollReveal } from "../hooks/useScrollReveal";
import { useLandingText, landingCopy, landingFeatureList } from "../hooks/useLandingText";
import { trackMarketingEvent } from "../../client/analytics/marketingAnalytics";
import {
  trackLead,
  trackViewPricing,
} from "../../client/analytics/metaTracking";
import { Button } from "../../client/components/ui/button";
import { usePlanCatalog } from "../../client/hooks/usePlanCatalog";
import { formatPrice } from "../../shared/currency";

/**
 * Minimal pricing for the main landing: trial-first, no annual toggle noise.
 * Launch phase shows only the Single plan.
 */
export function LeanPricingSection({ ns = "landing" }: { ns?: string }) {
  const tr = useLandingText(ns);
  const { localize, publicPlans, getBySlug } = usePlanCatalog();
  const {
    ref: headerRef,
    className: headerClass,
    isVisible,
  } = useScrollReveal();
  const tracked = useRef(false);

  useEffect(() => {
    if (!isVisible || tracked.current) return;
    tracked.current = true;
    trackMarketingEvent("pricing_viewed", {
      landing: ns,
      placement: "landing_lean_pricing",
    });
    // Meta ViewContent when pricing enters viewport (main Meta Ads landing surface).
    trackViewPricing({
      plan_ids: publicPlans
        .filter((plan) => plan.kind === "subscription" && plan.slug !== "catechist_free")
        .map((plan) => plan.slug),
      content_name: "Planos Catechis Landing",
    });
  }, [isVisible, ns, publicPlans]);

  const plans = publicPlans
    .filter((plan) => plan.kind === "subscription" && plan.slug !== "catechist_free")
    .map((plan) => ({
      id: plan.slug,
      price: formatPrice(
        plan.prices.find((item) => item.interval === "monthly" && item.isActive)?.unitAmountCents ?? 0,
      ),
      highlight: plan.highlight,
    }));

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
        <p className="text-muted-foreground max-w-xl mx-auto">
          {tr("pricing_subtitle")}
        </p>
        <p className="text-sm font-medium text-brand-ink">
          {tr("price_trial_note")}
        </p>
      </div>

      <div
        className={
          plans.length < 2
            ? "max-w-lg mx-auto"
            : "grid gap-4 sm:grid-cols-2"
        }
      >
        {plans.map((plan, index) => {
          const name = localize(plan.id).name;
          const catalogPlan = getBySlug(plan.id);
          const loc = localize(catalogPlan);
          const audience = landingCopy(
            tr,
            `plans.${plan.id}.audience`,
            catalogPlan.description || loc.name,
          );
          const featureList = landingFeatureList(
            tr,
            `plans.${plan.id}.features`,
            loc.features,
          );
          const href = `/signup?plan=${plan.id}`;
          const monthlyCents =
            catalogPlan.prices.find(
              (item) => item.interval === "monthly" && item.isActive,
            )?.unitAmountCents ?? 0;

          return (
            <PlanCard
              key={plan.id}
              delay={index * 40}
              name={String(name)}
              audience={String(audience)}
              price={plan.price}
              period={String(tr("per_month"))}
              features={featureList}
              highlight={plan.highlight}
              popularLabel={String(tr("price_popular"))}
              cta={String(
                tr(
                  plan.id === "unlimited"
                    ? "price_cta_unlimited"
                    : "price_cta_single",
                ),
              )}
              href={href}
              ns={ns}
              planId={plan.id}
              monthlyCents={monthlyCents}
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
          ? "border-brand-ink/40 bg-brand-ink/[0.03]"
          : "border-border/70 bg-card"
      }`}
    >
      {highlight && (
        <span className="mb-2 self-start text-[11px] font-semibold uppercase tracking-wide text-brand-ink">
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
            <Check className="h-4 w-4 text-brand-ink shrink-0 mt-0.5" />
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
