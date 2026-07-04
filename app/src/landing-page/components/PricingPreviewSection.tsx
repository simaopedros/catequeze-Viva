import { useEffect, useRef } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { ArrowRight, Check, Star } from "lucide-react";
import { useScrollReveal } from "../hooks/useScrollReveal";
import { trackMarketingEvent } from "../../client/analytics/marketingAnalytics";
import { PRICING_PREVIEW } from "../content/landingContent";

/**
 * Pricing preview shown on landing pages. Renders the 2 simplified plans
 * (Single + Unlimited) and links to the full /pricing page.
 */
export function PricingPreviewSection({ ns = "landing" }: { ns?: string }) {
  const { t } = useTranslation(ns);
  const { t: tb } = useTranslation("billing");
  const { ref: headerRef, className: headerClass, isVisible } = useScrollReveal();
  const hasTrackedViewRef = useRef(false);

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
        <h2 className="text-3xl sm:text-4xl font-bold">{t("pricing_title")}</h2>
        <p className="text-lg text-muted-foreground max-w-3xl mx-auto">{t("pricing_subtitle")}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {PRICING_PREVIEW.map((plan, index) => (
          <PricingPreviewCard key={plan.planId} plan={plan} delay={index * 60} ns={ns} t={t} tb={tb} />
        ))}
      </div>

      <p className="text-center text-sm text-muted-foreground mt-8">
        <Link to="/pricing" onClick={() => trackMarketingEvent("primary_cta_clicked", { landing: ns, placement: "landing_pricing_footer", destination: "/pricing" })} className="underline hover:text-foreground transition-colors">
          {t("compare_plans")}
        </Link>
      </p>
    </section>
  );
}

function PricingPreviewCard({
  plan,
  delay,
  ns,
  t,
  tb,
}: {
  plan: (typeof PRICING_PREVIEW)[number];
  delay: number;
  ns: string;
  t: (key: string, options?: any) => any;
  tb: (key: string, options?: any) => any;
}) {
  const { ref, className } = useScrollReveal({ delay });
  const name = (() => {
    const v = tb(`plans.${plan.planId}.name`);
    return typeof v === "string" && v !== `plans.${plan.planId}.name` ? v : plan.name;
  })();
  const desc = (() => {
    const v = t(`plans.${plan.planId}.desc`);
    return typeof v === "string" && v !== `plans.${plan.planId}.desc` ? v : plan.desc;
  })();
  const price = (() => {
    const v = t(`plans.${plan.planId}.price`);
    return typeof v === "string" && v !== `plans.${plan.planId}.price` ? v : plan.price;
  })();
  const features = (() => {
    const v = t(`plans.${plan.planId}.features`, { returnObjects: true });
    return Array.isArray(v) ? (v as string[]) : plan.features;
  })();

  return (
    <Link
      ref={ref as any}
      to="/pricing"
      onClick={() => trackMarketingEvent("primary_cta_clicked", { landing: ns, placement: "landing_pricing_plan", destination: "/pricing", plan: plan.planId })}
      className={`rounded-2xl border-2 bg-card p-6 transition-all hover:-translate-y-1 hover:shadow-lg relative flex flex-col ${className} ${
        plan.highlight ? "border-primary ring-2 ring-primary/20 shadow-lg shadow-primary/10" : "border-border"
      }`}
    >
      {plan.highlight && (
        <div className="inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground text-caption font-bold px-3 py-1 mb-3 self-start">
          <Star className="h-3 w-3" /> {t("price_popular")}
        </div>
      )}
      <h3 className="text-xl font-bold">{name}</h3>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="text-3xl font-bold">{price}</span>
        <span className="text-sm text-muted-foreground">{t("per_month")}</span>
      </div>
      <p className="text-sm text-muted-foreground mt-2">{desc}</p>
      <ul className="mt-4 space-y-2 text-sm flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary">
        {t("price_cta_start")}
        <ArrowRight className="h-4 w-4" />
      </div>
    </Link>
  );
}

