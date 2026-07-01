import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import {
  Star,
  Check,
  User,
  Building2,
  Landmark,
  Zap,
  CreditCard,
  PiggyBank,
  ArrowRight,
} from "lucide-react";
import { PublicNavbar } from "../PublicNavbar";
import { PublicFooter } from "../PublicFooter";
import { useAuth } from "wasp/client/auth";
import {
  setIntendedPlan,
  setIntendedInterval,
  getIntendedInterval,
  type BillingInterval,
} from "../lib/intendedPlan";
import { PLANS, PLAN_IDS, type PlanId } from "../../shared/pricing";
import { formatPrice } from "../../shared/currency";
import { trackMarketingEvent } from "../../client/analytics/marketingAnalytics";

type PlanLevel = "personal" | "institutional";
type PricingPath = "catechist" | "parish" | "diocese";

interface PricingPlan {
  planId: PlanId;
  level: PlanLevel;
  name: string;
  price: string;
  annualPrice?: string;
  period?: string;
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

function translatedArray<T>(value: unknown, fallback: T[]): T[] {
  return Array.isArray(value) ? (value as T[]) : fallback;
}

function formatDisplayPrice(cents: number): string {
  return formatPrice(cents, "USD");
}

export default function PricingPage() {
  const { t: tp } = useTranslation("public");
  const { t: tb } = useTranslation("billing");
  const { data: user } = useAuth();
  const navigate = useNavigate();
  const isLoggedIn = !!user;
  const [billingInterval, setBillingInterval] =
    useState<BillingInterval>(getIntendedInterval);
  const [selectedPath, setSelectedPath] = useState<PricingPath>("catechist");

  useEffect(() => {
    trackMarketingEvent("pricing_viewed", { placement: "pricing_page" });
  }, []);

  const pricingPlans = useMemo((): PricingPlan[] => {
    return PLAN_IDS.map((id) => {
      const def = PLANS[id];
      const monthly = def.prices.monthlyCents;

      let price: string;
      let annualPrice: string | undefined;
      let period: string | undefined;

      if (monthly === 0) {
        price = translatedString(tb, "free", "Grátis");
        period = translatedString(tp, "pricing.free_forever", "para sempre");
      } else {
        price = `${formatDisplayPrice(monthly)}${translatedString(
          tp,
          "per_month",
          "/mês",
        )}`;
        period = undefined;
        if (def.prices.annualCents != null) {
          annualPrice = `${formatDisplayPrice(
            def.prices.annualCents,
          )}${translatedString(tp, "per_year", "/ano")}`;
        }
      }

      return {
        planId: id,
        level: def.level,
        name: translatedString(tb, `plans.${id}.name`, def.name),
        price,
        annualPrice,
        period,
        desc: translatedString(tp, `pricing.plan_desc.${id}`, def.name),
        features: translatedArray(
          tb(`plans.${id}.features`, { returnObjects: true }),
          def.features,
        ),
        highlight: def.highlight,
        cta:
          monthly === 0
            ? translatedString(tp, "pricing.cta_free", "Começar grátis")
            : translatedString(tp, "pricing.cta_paid", "Começar agora"),
        priceCents: def.prices.monthlyCents,
        priceCentsAnnual: def.prices.annualCents,
      };
    });
  }, [tp, tb]);

  const pathPlans = useMemo(() => {
    const personal = pricingPlans.filter(
      (p) => p.level === "personal" && p.planId !== "catechist_free",
    );
    const parish = pricingPlans.filter(
      (p) => p.planId === "parish_essential" || p.planId === "parish_complete",
    );
    const diocese = pricingPlans.filter((p) => p.planId === "diocese");

    return { catechist: personal, parish, diocese };
  }, [pricingPlans]);

  const pathHighlights = useMemo(() => {
    const catechistEntry =
      pathPlans.catechist.find((plan) => plan.planId === "catechist_pro") ||
      pathPlans.catechist.find((plan) => plan.planId === "catechist_ai") ||
      pathPlans.catechist[0];
    const parishMain =
      pathPlans.parish.find((plan) => plan.planId === "parish_essential") ||
      pathPlans.parish[0];
    const dioceseMain = pathPlans.diocese[0];

    return {
      catechist: {
        price: catechistEntry?.price || "—",
        supporting: tp("pricing.path_cards.catechist.supporting"),
      },
      parish: {
        price: parishMain?.price || "—",
        supporting: tp("pricing.path_cards.parish.supporting"),
      },
      diocese: {
        price: dioceseMain?.price || "—",
        supporting: tp("pricing.path_cards.diocese.supporting"),
      },
    };
  }, [pathPlans, tp]);

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
      path: selectedPath,
    });
    if (plan.planId === "catechist_free") {
      navigate(isLoggedIn ? "/app" : "/signup");
      return;
    }
    setIntendedPlan(plan.planId);
    navigate(isLoggedIn ? `/app/billing?plan=${plan.planId}` : "/signup");
  };

  const handlePathSelect = (path: PricingPath) => {
    setSelectedPath(path);
    trackMarketingEvent("primary_cta_clicked", {
      placement: "pricing_path_selector",
      path,
      interval: billingInterval,
    });
  };

  const renderCard = (plan: PricingPlan) => {
    const hasAnnual = !!plan.priceCentsAnnual && plan.priceCents > 0;
    const showAnnual = billingInterval === "annual" && hasAnnual;

    return (
      <div
        key={plan.planId}
        className={`rounded-2xl border-2 p-6 bg-card transition-all hover:-translate-y-1 hover:shadow-lg relative flex flex-col ${
          plan.highlight
            ? "border-primary ring-2 ring-primary/20 sm:scale-[1.02] shadow-lg shadow-primary/10"
            : "border-border"
        }`}
      >
        {plan.highlight && (
          <div className="inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground text-caption font-bold px-3 py-1 mb-3 self-start">
            <Star className="h-3 w-3" /> {tp("pricing.most_popular")}
          </div>
        )}
        <h3 className="text-lg font-bold">{plan.name}</h3>
        <p className="text-sm text-muted-foreground mt-1">{plan.desc}</p>
        <div className="mt-4 mb-1">
          {showAnnual ? (
            <>
              <span className="text-4xl font-bold">
                {formatDisplayPrice(plan.priceCentsAnnual!)}
              </span>
              <span className="text-base font-normal text-muted-foreground">
                {tp("per_year")}
              </span>
            </>
          ) : (
            <>
              <span className="text-4xl font-bold">{plan.price}</span>
              {plan.period && (
                <span className="text-base font-normal text-muted-foreground">
                  {" "}
                  {plan.period}
                </span>
              )}
            </>
          )}
        </div>
        {showAnnual ? (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
            <span>
              {formatDisplayPrice(plan.priceCents)}
              {tp("per_month")}
            </span>
          </div>
        ) : plan.annualPrice ? (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
            <PiggyBank className="h-3 w-3" />
            <span>{plan.annualPrice}</span>
          </div>
        ) : null}
        <ul className="mt-5 space-y-2.5 text-sm flex-1">
          {plan.features.slice(0, 5).map((f) => (
            <li key={f} className="flex items-start gap-2.5">
              <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
        <button
          onClick={() => handleSelect(plan)}
          className={`mt-6 block w-full text-center rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
            plan.highlight
              ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25"
              : "bg-muted hover:bg-muted/80"
          }`}
        >
          {plan.cta}
        </button>
      </div>
    );
  };

  const selectedPlans = pathPlans[selectedPath];

  const pathCards = [
    {
      key: "catechist" as const,
      icon: User,
      title: tp("pricing.path_cards.catechist.title"),
      description: tp("pricing.path_cards.catechist.description"),
      cta: tp("pricing.path_cards.catechist.cta"),
      accent: "text-primary",
      price: pathHighlights.catechist.price,
      supporting: pathHighlights.catechist.supporting,
    },
    {
      key: "parish" as const,
      icon: Building2,
      title: tp("pricing.path_cards.parish.title"),
      description: tp("pricing.path_cards.parish.description"),
      cta: tp("pricing.path_cards.parish.cta"),
      accent: "text-secondary",
      price: pathHighlights.parish.price,
      supporting: pathHighlights.parish.supporting,
    },
    {
      key: "diocese" as const,
      icon: Landmark,
      title: tp("pricing.path_cards.diocese.title"),
      description: tp("pricing.path_cards.diocese.description"),
      cta: tp("pricing.path_cards.diocese.cta"),
      accent: "text-emerald-700",
      price: pathHighlights.diocese.price,
      supporting: pathHighlights.diocese.supporting,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicNavbar />

      <main className="flex-1">
        <section className="max-w-4xl mx-auto px-4 pt-16 pb-8 text-center space-y-4">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            {tp("pricing.title")}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {tp("pricing.subtitle")}
          </p>
          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground pt-2 flex-wrap">
            <span className="flex items-center gap-1">
              <CreditCard className="h-4 w-4" /> {tp("pricing.payment_card")}
            </span>
            <span className="flex items-center gap-1">
              <Zap className="h-4 w-4" /> {tp("pricing.payment_pix")}
            </span>
            <span className="flex items-center gap-1">
              <PiggyBank className="h-4 w-4" /> {tp("pricing.annual_savings")}
            </span>
          </div>
          <div className="inline-flex items-center rounded-lg border bg-muted p-0.5 mt-4">
            <button
              type="button"
              onClick={() => setBillingInterval("monthly")}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                billingInterval === "monthly"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tp("pricing.monthly_tab")}
            </button>
            <button
              type="button"
              onClick={() => setBillingInterval("annual")}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-1.5 ${
                billingInterval === "annual"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tp("pricing.annual_tab")}
              <span className="text-caption text-success font-bold">
                {tp("pricing.annual_savings_badge")}
              </span>
            </button>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 pb-8">
          <div className="text-center mb-8 space-y-2">
            <h2 className="text-2xl font-bold">{tp("pricing.path_selector_title")}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {tp("pricing.path_selector_subtitle")}
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {pathCards.map((card) => {
              const isSelected = selectedPath === card.key;
              return (
                <button
                  key={card.key}
                  type="button"
                  onClick={() => handlePathSelect(card.key)}
                  className={`text-left rounded-2xl border-2 p-6 bg-card transition-all hover:-translate-y-1 hover:shadow-lg ${
                    isSelected
                      ? "border-primary ring-2 ring-primary/20 shadow-lg shadow-primary/10"
                      : "border-border"
                  }`}
                >
                  <div className={`inline-flex rounded-xl bg-muted p-3 ${card.accent}`}>
                    <card.icon className="h-6 w-6" />
                  </div>
                  <div className="mt-4 space-y-2">
                    <h3 className="text-xl font-bold">{card.title}</h3>
                    <p className="text-sm text-muted-foreground">{card.description}</p>
                  </div>
                  <div className="mt-5">
                    <p className="text-3xl font-bold">{card.price}</p>
                    <p className="text-xs text-muted-foreground mt-1">{card.supporting}</p>
                  </div>
                  <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                    {card.cta}
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 pb-20">
          <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
            <div>
              <h2 className="text-xl font-bold">{tp(`pricing.path_details.${selectedPath}.title`)}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {tp(`pricing.path_details.${selectedPath}.subtitle`)}
              </p>
            </div>
          </div>
          <div className={`grid gap-6 ${selectedPlans.length === 1 ? "md:grid-cols-1 max-w-xl" : "md:grid-cols-2 lg:grid-cols-3"}`}>
            {selectedPlans.map(renderCard)}
          </div>
        </section>

        <section className="bg-muted/30 border-t">
          <div className="max-w-3xl mx-auto px-4 py-16">
            <h2 className="text-2xl font-bold text-center mb-10">
              {tp("pricing.faq_title")}
            </h2>
            <div className="space-y-4">
              {faq.map((f, i) => (
                <div key={i} className="rounded-xl border bg-card p-5">
                  <h3 className="font-semibold">{f.q}</h3>
                  <p className="text-sm text-muted-foreground mt-2">{f.a}</p>
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