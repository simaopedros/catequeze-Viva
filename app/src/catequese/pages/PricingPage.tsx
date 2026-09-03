import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { Star, Check, CreditCard, Lock, Building2 } from "lucide-react";
import { PublicNavbar } from "../PublicNavbar";
import { PublicFooter } from "../PublicFooter";
import { SalesWhatsAppCta } from "../../client/components/SalesWhatsAppCta";
import { useAuth } from "wasp/client/auth";
import {
  setIntendedPlan,
  setIntendedInterval,
  getIntendedInterval,
  type BillingInterval,
} from "../lib/intendedPlan";
import { Button } from "../../client/components/ui/button";
import { usePlanCatalog } from "../../client/hooks/usePlanCatalog";
import {
  annualDiscountPercent,
  formatMonthlyFromAnnualCents,
  formatPrice,
} from "../../shared/currency";
import { BillingIntervalToggle } from "../components/BillingIntervalToggle";
import { trackMarketingEvent } from "../../client/analytics/marketingAnalytics";
import {
  trackLead,
  trackViewPricing,
} from "../../client/analytics/metaTracking";
import {
  AppDisplayTitle,
  AppGoldRule,
} from "../../client/components/brand/AppChrome";

type PlanLevel = "personal" | "institutional";

interface PricingPlan {
  planId: string;
  level: PlanLevel;
  name: string;
  desc: string;
  features: string[];
  highlight?: boolean;
  cta: string;
  priceCents: number;
  priceCentsAnnual?: number;
}

function translatedString(
  t: (key: string, options?: any) => any,
  key: string,
  fallback: string,
): string {
  const value = t(key);
  return typeof value === "string" && value !== key ? value : fallback;
}

function equivalentMonthlyPrice(annualCents: number): string {
  return formatMonthlyFromAnnualCents(annualCents);
}

function annualSavings(monthlyCents: number, annualCents: number): string {
  return formatPrice(monthlyCents * 12 - annualCents);
}

export default function PricingPage() {
  const { t: tp } = useTranslation("public");
  const { data: user } = useAuth();
  const navigate = useNavigate();
  const isLoggedIn = !!user;
  const [billingInterval, setBillingInterval] =
    useState<BillingInterval>(getIntendedInterval);
  const { publicPlans, localize } = usePlanCatalog();

  useEffect(() => {
    trackMarketingEvent("pricing_viewed", { placement: "pricing_page" });
    trackViewPricing({
      plan_ids: publicPlans
        .filter(
          (plan) =>
            plan.kind === "subscription" && plan.slug !== "catechist_free",
        )
        .map((plan) => plan.slug),
      content_name: "Planos Catechis",
    });
  }, [publicPlans]);

  const pricingPlans = useMemo((): PricingPlan[] => {
    return publicPlans
      .filter(
        (plan) =>
          plan.kind === "subscription" && plan.slug !== "catechist_free",
      )
      .map((plan) => {
        const loc = localize(plan);
        const monthly = plan.prices.find(
          (price) => price.interval === "monthly" && price.isActive,
        );
        const annual = plan.prices.find(
          (price) => price.interval === "annual" && price.isActive,
        );
        return {
          planId: plan.slug,
          level: plan.level,
          name: loc.name,
          desc: translatedString(
            tp,
            `pricing.plan_desc.${plan.slug}`,
            plan.description || loc.name,
          ),
          features: loc.features,
          highlight: plan.highlight,
          cta: translatedString(tp, "pricing.cta_paid", "Comecar agora"),
          priceCents: monthly?.unitAmountCents ?? 0,
          priceCentsAnnual: annual?.unitAmountCents,
        };
      });
  }, [publicPlans, tp, localize]);

  const faqResult = tp("pricing.faq", { returnObjects: true });
  const faq = Array.isArray(faqResult)
    ? (faqResult as { q: string; a: string }[])
    : [];

  const handleSelect = (plan: PricingPlan) => {
    setIntendedInterval(billingInterval);
    trackMarketingEvent("plan_selected", {
      plan: plan.planId,
      level: plan.level,
      interval: billingInterval,
      placement: "pricing_page",
    });
    const selectedValue =
      billingInterval === "annual" && plan.priceCentsAnnual
        ? Number((plan.priceCentsAnnual / 100).toFixed(2))
        : Number((plan.priceCents / 100).toFixed(2));
    trackLead({
      content_name: plan.name,
      plan_id: plan.planId,
      content_ids: [plan.planId],
      value: selectedValue,
      currency: "BRL",
    });
    setIntendedPlan(plan.planId);
    navigate(isLoggedIn ? `/app/billing?plan=${plan.planId}` : "/signup");
  };

  const renderCard = (plan: PricingPlan) => {
    const hasAnnual = !!plan.priceCentsAnnual && plan.priceCents > 0;
    const showAnnual = billingInterval === "annual" && hasAnnual;

    return (
      <div
        key={plan.planId}
        className={`relative flex flex-col rounded-sm border bg-white p-6 transition-colors ${
          plan.highlight ? "border-2 border-brand-gold/70" : "border-border/70"
        }`}
      >
        {plan.highlight && (
          <span className="absolute -top-3 right-5 inline-flex items-center gap-1 rounded-full bg-brand-gold px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-ink">
            <Star className="h-3 w-3" aria-hidden />
            {tp("pricing.most_popular")}
          </span>
        )}
        <AppDisplayTitle as="h3" className="text-lg sm:text-lg">
          {plan.name}
        </AppDisplayTitle>
        <p className="mt-1 text-sm text-muted-foreground">{plan.desc}</p>
        <div className="mt-4 mb-1">
          {showAnnual ? (
            <>
              <span className="text-4xl font-semibold tracking-tight text-brand-ink">
                {equivalentMonthlyPrice(plan.priceCentsAnnual!)}
              </span>
              <span className="text-base font-normal text-muted-foreground">
                {tp("pricing.per_month")}
              </span>
            </>
          ) : (
            <>
              <span className="text-4xl font-semibold tracking-tight text-brand-ink">
                {formatPrice(plan.priceCents)}
              </span>
              <span className="text-base font-normal text-muted-foreground">
                {tp("pricing.per_month")}
              </span>
            </>
          )}
        </div>
        {showAnnual ? (
          <div className="space-y-1 text-xs text-muted-foreground mt-1">
            <div>
              {tp("pricing.annual_billed_as", {
                price: formatPrice(plan.priceCentsAnnual!),
              })}
            </div>
            <div>
              {tp("pricing.annual_save_amount", {
                price: annualSavings(plan.priceCents, plan.priceCentsAnnual!),
              })}
            </div>
          </div>
        ) : hasAnnual ? (
          <div className="mt-1 space-y-1 text-sm text-muted-foreground">
            <p>
              {tp("pricing.annual_compare", {
                price: equivalentMonthlyPrice(plan.priceCentsAnnual!),
              })}
            </p>
            <p>
              {tp("pricing.annual_billed_as", {
                price: formatPrice(plan.priceCentsAnnual!),
              })}
            </p>
          </div>
        ) : null}
        <ul className="mt-5 grid flex-1 gap-2.5 sm:grid-cols-1">
          {plan.features.map((f) => (
            <li
              key={f}
              className="flex items-start gap-2 text-sm text-brand-ink"
            >
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
        <Button
          size="lg"
          className="mt-6 h-12 w-full rounded-sm text-sm font-semibold"
          variant={plan.highlight ? "default" : "outline"}
          onClick={() => handleSelect(plan)}
        >
          {plan.cta}
        </Button>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5" aria-hidden />
          {tp("pricing.secure_payment")}
        </p>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicNavbar />

      <main className="flex-1">
        <section className="mx-auto max-w-4xl space-y-4 px-4 pb-8 pt-16 text-center">
          <AppDisplayTitle className="text-4xl sm:text-5xl">
            {tp("pricing.title")}
          </AppDisplayTitle>
          <AppGoldRule className="mx-auto" />
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground sm:text-xl">
            {tp("pricing.subtitle")}
          </p>
          <div className="flex items-center justify-center gap-6 pt-2 text-sm text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <CreditCard className="h-4 w-4" /> {tp("pricing.payment_card")}
            </span>
            <span className="flex items-center gap-1">
              <Lock className="h-4 w-4" /> {tp("pricing.secure_payment")}
            </span>
          </div>
          <div className="mt-6">
            <BillingIntervalToggle
              interval={billingInterval}
              onChange={(next) => {
                setBillingInterval(next);
                setIntendedInterval(next);
              }}
              discountPercent={
                pricingPlans[0]?.priceCents && pricingPlans[0]?.priceCentsAnnual
                  ? annualDiscountPercent(
                      pricingPlans[0].priceCents,
                      pricingPlans[0].priceCentsAnnual,
                    )
                  : 0
              }
              monthlyLabel={tp("pricing.monthly_tab")}
              annualLabel={tp("pricing.annual_tab")}
              ariaLabel={tp("pricing.interval_aria")}
              discountLabel={tp("pricing.annual_savings_badge")}
            />
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-4 pb-20">
          <div
            className={
              pricingPlans.length + 1 < 2
                ? "max-w-lg mx-auto"
                : "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            }
          >
            {pricingPlans.map(renderCard)}
            <DiocesePricingCard tp={tp} />
          </div>
          <SalesWhatsAppCta
            placement="pricing_page"
            className="mx-auto mt-8 max-w-lg"
          />
        </section>

        <section className="bg-muted/30 border-t">
          <div className="max-w-3xl mx-auto px-4 py-16">
            <div className="mb-10 space-y-2.5 text-center">
              <AppDisplayTitle as="h2" className="text-2xl sm:text-2xl">
                {tp("pricing.faq_title")}
              </AppDisplayTitle>
              <AppGoldRule className="mx-auto" />
            </div>
            <div className="space-y-4">
              {faq.map((f, i) => (
                <div
                  key={i}
                  className="rounded-sm border border-border/70 bg-white p-5"
                >
                  <h3 className="font-semibold tracking-tight text-brand-ink">
                    {f.q}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}

function DiocesePricingCard({
  tp,
}: {
  tp: (key: string, options?: any) => any;
}) {
  const featuresResult = tp("pricing.diocese_features", {
    returnObjects: true,
  });
  const features = Array.isArray(featuresResult)
    ? (featuresResult as string[])
    : [];

  return (
    <div
      data-testid="pricing-diocese-card"
      className="relative flex flex-col rounded-sm border border-border/70 bg-white p-6"
    >
      <div className="mb-3 inline-flex items-center gap-1.5 self-start rounded-sm bg-muted px-3 py-1 text-[11px] font-medium text-muted-foreground">
        <Building2 className="h-3.5 w-3.5" />
        {translatedString(
          tp,
          "pricing.diocese_audience",
          "Para a diocese — venda assistida",
        )}
      </div>
      <AppDisplayTitle as="h3" className="text-lg sm:text-lg">
        {translatedString(tp, "pricing.diocese_name", "Plano Diocese")}
      </AppDisplayTitle>
      <p className="mt-1 text-sm text-muted-foreground">
        {translatedString(
          tp,
          "pricing.diocese_desc",
          "Licença guarda-chuva que cobre as paróquias.",
        )}
      </p>
      <p className="mt-4 mb-1 text-2xl font-semibold tracking-tight text-brand-ink">
        {translatedString(tp, "pricing.diocese_price", "Sob consulta")}
      </p>
      <ul className="mt-5 space-y-2.5 text-sm flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2.5">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-ink" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6">
        <SalesWhatsAppCta
          placement="pricing_page_diocese"
          variant="inline"
          cta={translatedString(
            tp,
            "pricing.diocese_cta",
            "Falar com vendas sobre a diocese",
          )}
        />
      </div>
    </div>
  );
}
