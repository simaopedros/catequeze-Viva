import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { Star, Check, CreditCard, PiggyBank } from "lucide-react";
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
import { usePlanCatalog } from "../../client/hooks/usePlanCatalog";
import {
  formatEquivalentMonthlyPrice,
  formatPrice,
} from "../../shared/currency";
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
  return formatEquivalentMonthlyPrice(annualCents);
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
        .filter((plan) => plan.kind === "subscription" && plan.slug !== "catechist_free")
        .map((plan) => plan.slug),
      content_name: "Planos Catechis",
    });
  }, [publicPlans]);

  const pricingPlans = useMemo((): PricingPlan[] => {
    return publicPlans
      .filter((plan) => plan.kind === "subscription" && plan.slug !== "catechist_free")
      .map((plan) => {
        const loc = localize(plan);
        const monthly = plan.prices.find((price) => price.interval === "monthly" && price.isActive);
        const annual = plan.prices.find((price) => price.interval === "annual" && price.isActive);
        return {
          planId: plan.slug,
          level: plan.level,
          name: loc.name,
          desc: translatedString(tp, `pricing.plan_desc.${plan.slug}`, plan.description || loc.name),
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
        className={`relative flex flex-col rounded-sm border border-border/70 bg-white p-6 transition-colors ${
          plan.highlight
            ? "border-brand-ink ring-1 ring-brand-ink/15"
            : "border-border"
        }`}
      >
        {plan.highlight && (
          <div className="inline-flex items-center gap-1 rounded-sm bg-brand-ink text-white text-caption font-semibold px-3 py-1 mb-3 self-start">
            <Star className="h-3 w-3" /> {tp("pricing.most_popular")}
          </div>
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
          <div className="space-y-1 text-xs text-muted-foreground mt-1">
            <div className="flex items-center gap-1">
              <PiggyBank className="h-3 w-3" />
              <span>
                {tp("pricing.annual_compare", {
                  price: equivalentMonthlyPrice(plan.priceCentsAnnual!),
                })}
              </span>
            </div>
            <div>
              {tp("pricing.annual_billed_as", {
                price: formatPrice(plan.priceCentsAnnual!),
              })}
            </div>
          </div>
        ) : null}
        <ul className="mt-5 space-y-2.5 text-sm flex-1">
          {plan.features.map((f) => (
            <li key={f} className="flex items-start gap-2.5">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-ink" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
        <button
          onClick={() => handleSelect(plan)}
          className={`mt-6 block w-full text-center rounded-sm px-4 py-3 text-sm font-semibold transition-all ${
            plan.highlight
              ? "bg-brand-ink text-white hover:bg-brand-ink-soft"
              : "bg-muted hover:bg-muted/80"
          }`}
        >
          {plan.cta}
        </button>
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
          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground pt-2 flex-wrap">
            <span className="flex items-center gap-1">
              <CreditCard className="h-4 w-4" /> {tp("pricing.payment_card")}
            </span>
            <span className="flex items-center gap-1">
              <PiggyBank className="h-4 w-4" /> {tp("pricing.annual_savings")}
            </span>
          </div>
          <div className="mt-4 inline-flex items-center rounded-sm border border-border/70 bg-muted/30 p-0.5">
            <button
              type="button"
              onClick={() => setBillingInterval("monthly")}
              className={`px-4 py-2 text-sm font-medium rounded-sm transition-all ${
                billingInterval === "monthly"
                  ? "bg-white font-semibold tracking-tight text-brand-ink"
                  : "text-muted-foreground hover:text-brand-ink"
              }`}
            >
              {tp("pricing.monthly_tab")}
            </button>
            <button
              type="button"
              onClick={() => setBillingInterval("annual")}
              className={`px-4 py-2 text-sm font-medium rounded-sm transition-all flex items-center gap-1.5 ${
                billingInterval === "annual"
                  ? "bg-white font-semibold tracking-tight text-brand-ink"
                  : "text-muted-foreground hover:text-brand-ink"
              }`}
            >
              {tp("pricing.annual_tab")}
              <span className="rounded-sm bg-brand-gold/15 px-1.5 py-0.5 text-caption font-semibold text-brand-gold-muted">
                {tp("pricing.annual_savings_badge")}
              </span>
            </button>
          </div>
        </section>

        <section className="max-w-4xl mx-auto px-4 pb-20">
          <div
            className={
              pricingPlans.length < 2
                ? "max-w-lg mx-auto"
                : "grid gap-4 sm:grid-cols-2"
            }
          >
            {pricingPlans.map(renderCard)}
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
