import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "../../client/components/ui/button";
import { cn } from "../../client/utils";
import { trackMarketingEvent } from "../../client/analytics/marketingAnalytics";
import {
  trackLead,
  trackViewPricing,
} from "../../client/analytics/metaTracking";
import { usePlanCatalog } from "../../client/hooks/usePlanCatalog";
import {
  annualDiscountPercent,
  formatMonthlyFromAnnualCents,
  formatPrice,
} from "../../shared/currency";
import { getSalesWhatsAppUrl } from "../../shared/salesContact";
import { BillingIntervalToggle } from "../../catequese/components/BillingIntervalToggle";
import type { BillingInterval } from "../../catequese/lib/intendedPlan";
import { useTranslation } from "react-i18next";
import {
  useLandingText,
  landingCopy,
  landingFeatureList,
} from "../hooks/useLandingText";
import { useScrollReveal } from "../hooks/useScrollReveal";

/**
 * Catequista → Paróquia → Diocese. Toggle mensal/anual. Few cards, clear CTAs.
 */
export function GrowthPricingSection({ ns = "landing" }: { ns?: string }) {
  const tr = useLandingText(ns);
  const { t } = useTranslation("public");
  const { localize, getBySlug } = usePlanCatalog();
  const {
    ref: headerRef,
    className: headerClass,
    isVisible,
  } = useScrollReveal();
  const tracked = useRef(false);
  const [interval, setInterval] = useState<BillingInterval>("annual");

  const catequista = getBySlug("single");
  const paroquia = getBySlug("unlimited");
  const catequistaMonthly =
    catequista.prices.find((p) => p.interval === "monthly" && p.isActive)
      ?.unitAmountCents ?? 0;
  const catequistaAnnual =
    catequista.prices.find((p) => p.interval === "annual" && p.isActive)
      ?.unitAmountCents ?? 0;
  const paroquiaMonthly =
    paroquia.prices.find((p) => p.interval === "monthly" && p.isActive)
      ?.unitAmountCents ?? 0;
  const paroquiaAnnual =
    paroquia.prices.find((p) => p.interval === "annual" && p.isActive)
      ?.unitAmountCents ?? 0;
  const discount = annualDiscountPercent(catequistaMonthly, catequistaAnnual);

  const eyebrow = String(
    tr("growth.eyebrow") || tr("pricing_eyebrow") || "",
  ).trim();
  const subtitle = String(
    tr("growth.subtitle") || tr("pricing_subtitle") || "",
  ).trim();
  const featured = String(tr("growth.featured") || "").trim();
  const note = String(tr("growth.note") || "").trim();
  const billedAnnual = String(tr("growth.billed_annual") || "").trim();
  const billedMonthly = String(tr("growth.billed_monthly") || "").trim();
  const dioceseHref = getSalesWhatsAppUrl(t("sales_whatsapp.prefill"));
  const queryInterval = interval === "annual" ? "annual" : "monthly";

  useEffect(() => {
    if (!isVisible || tracked.current) return;
    tracked.current = true;
    trackMarketingEvent("pricing_viewed", {
      landing: ns,
      placement: "landing_growth_pricing",
    });
    trackViewPricing({
      plan_ids: ["single", "unlimited", "diocese"],
      content_name: "Planos Catechis Landing Growth",
    });
  }, [isVisible, ns]);

  return (
    <section
      id="planos"
      className="scroll-mt-20 border-y border-brand-ink/10 bg-white/40"
      data-landing-growth-pricing
    >
      <div className="mx-auto max-w-[70rem] px-5 py-16 sm:py-20">
        <div
          ref={headerRef}
          className={cn(
            "mb-8 flex flex-col gap-6 lg:mb-10 lg:flex-row lg:items-end lg:justify-between",
            headerClass,
          )}
        >
          <div className="max-w-xl space-y-3">
            {eyebrow ? (
              <p className="text-[10px] font-bold uppercase tracking-[0.19em] text-brand-gold-muted">
                {eyebrow}
              </p>
            ) : null}
            <h2 className="font-brand-display text-[2.125rem] font-medium leading-[1.05] tracking-tight text-brand-ink sm:text-5xl text-balance">
              {tr("growth.title") || tr("pricing_title")}
            </h2>
            {subtitle ? (
              <p className="text-[15px] leading-relaxed text-muted-foreground">
                {subtitle}
              </p>
            ) : null}
          </div>
          {discount > 0 ? (
            <BillingIntervalToggle
              interval={interval}
              onChange={setInterval}
              discountPercent={discount}
              monthlyLabel={String(tr("price_monthly"))}
              annualLabel={String(tr("price_annual"))}
              discountLabel={String(
                tr("growth.discount", { percent: discount }),
              )}
              ariaLabel={String(tr("price_annual"))}
            />
          ) : null}
        </div>

        <div className="grid items-stretch gap-3.5 lg:grid-cols-3">
          <PlanCard
            name={landingCopy(tr, "plans.single.name", localize("single").name)}
            audience={landingCopy(tr, "plans.single.audience", "")}
            desc={landingCopy(tr, "plans.single.desc", "")}
            features={landingFeatureList(tr, "plans.single.features", [])}
            price={
              interval === "annual" && catequistaAnnual
                ? formatMonthlyFromAnnualCents(catequistaAnnual)
                : formatPrice(catequistaMonthly)
            }
            period={String(tr("per_month"))}
            billed={interval === "annual" ? billedAnnual : billedMonthly}
            cta={String(tr("price_cta_single"))}
            href={`/signup?plan=single&interval=${queryInterval}`}
            ns={ns}
            planId="single"
            monthlyCents={catequistaMonthly}
          />
          <PlanCard
            name={landingCopy(
              tr,
              "plans.unlimited.name",
              localize("unlimited").name,
            )}
            audience={landingCopy(tr, "plans.unlimited.audience", "")}
            desc={landingCopy(tr, "plans.unlimited.desc", "")}
            features={landingFeatureList(tr, "plans.unlimited.features", [])}
            price={
              interval === "annual" && paroquiaAnnual
                ? formatMonthlyFromAnnualCents(paroquiaAnnual)
                : formatPrice(paroquiaMonthly)
            }
            period={String(tr("per_month"))}
            billed={interval === "annual" ? billedAnnual : billedMonthly}
            cta={String(tr("price_cta_unlimited"))}
            href={`/signup?plan=unlimited&interval=${queryInterval}`}
            ns={ns}
            planId="unlimited"
            monthlyCents={paroquiaMonthly}
            highlighted
            badge={featured}
          />
          <PlanCard
            name={landingCopy(tr, "plans.diocese.name", "Plano Diocese")}
            audience={landingCopy(tr, "plans.diocese.audience", "")}
            desc={landingCopy(tr, "plans.diocese.desc", "")}
            features={landingFeatureList(tr, "plans.diocese.features", [])}
            price={landingCopy(tr, "plans.diocese.price", "Sob consulta")}
            period=""
            billed={landingCopy(tr, "growth.diocese_note", "")}
            cta={String(tr("price_cta_diocese"))}
            href={dioceseHref}
            ns={ns}
            planId="diocese"
            monthlyCents={0}
            external
          />
        </div>

        {note ? (
          <p className="mt-5 text-center text-[11px] text-muted-foreground">
            {note}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function PlanCard({
  name,
  audience,
  desc,
  features,
  price,
  period,
  billed,
  cta,
  href,
  ns,
  planId,
  monthlyCents,
  highlighted = false,
  external = false,
  badge = "",
}: {
  name: string;
  audience: string;
  desc: string;
  features: string[];
  price: string;
  period: string;
  billed: string;
  cta: string;
  href: string;
  ns: string;
  planId: string;
  monthlyCents: number;
  highlighted?: boolean;
  external?: boolean;
  badge?: string;
}) {
  const onClick = () => {
    trackMarketingEvent("primary_cta_clicked", {
      landing: ns,
      placement: "growth_pricing_plan",
      destination: href,
      plan: planId,
    });
    if (!external && monthlyCents > 0) {
      trackLead({
        content_name: name,
        plan_id: planId,
        content_ids: [planId],
        value: Number((monthlyCents / 100).toFixed(2)),
        currency: "BRL",
      });
    }
  };

  const ctaInner = (
    <>
      {cta}
      <ArrowRight className="h-4 w-4 shrink-0" />
    </>
  );

  return (
    <div
      id={`planos-${planId}`}
      className={cn(
        "relative flex flex-col rounded-xl border bg-card p-6",
        highlighted
          ? "border-brand-gold/50 bg-brand-paper shadow-elevation-sm"
          : "border-brand-ink/10",
      )}
    >
      {badge ? (
        <span className="absolute right-4 top-4 rounded-full bg-brand-ink px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-white">
          {badge}
        </span>
      ) : null}
      {audience ? (
        <p className="text-[10px] font-bold uppercase tracking-[0.19em] text-brand-gold-muted">
          {audience}
        </p>
      ) : null}
      <h3 className="mt-1.5 text-lg font-semibold tracking-tight text-brand-ink">
        {name}
      </h3>
      {desc ? (
        <p className="mt-1 min-h-9 text-xs leading-relaxed text-muted-foreground">
          {desc}
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap items-baseline gap-1">
        <span className="font-brand-display text-[1.95rem] font-semibold tracking-tight text-brand-ink">
          {price}
        </span>
        {period ? (
          <span className="text-xs text-muted-foreground">{period}</span>
        ) : null}
      </div>
      {billed ? (
        <p className="mt-1 min-h-8 text-[10px] text-muted-foreground">
          {billed}
        </p>
      ) : (
        <div className="min-h-8" />
      )}
      {features.length > 0 ? (
        <ul className="mt-4 flex-1 space-y-2">
          {features.map((item) => (
            <li
              key={item}
              className="flex items-start gap-2 text-xs text-brand-ink/80"
            >
              <Check
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-gold"
                aria-hidden
              />
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex-1" />
      )}
      <Button
        size="lg"
        variant={highlighted ? undefined : external ? "outline" : "default"}
        asChild
        className={cn(
          "mt-5 w-full rounded-md",
        )}
      >
        {external ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClick}
          >
            {ctaInner}
          </a>
        ) : (
          <Link to={href} onClick={onClick}>
            {ctaInner}
          </Link>
        )}
      </Button>
    </div>
  );
}
