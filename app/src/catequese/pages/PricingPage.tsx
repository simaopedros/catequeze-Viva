import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { Star, Check, User, Building2, Zap, CreditCard, PiggyBank } from 'lucide-react';
import { PublicNavbar } from '../PublicNavbar';
import { PublicFooter } from '../PublicFooter';
import { useAuth } from 'wasp/client/auth';
import { setIntendedPlan, setIntendedInterval, getIntendedInterval, type BillingInterval } from '../lib/intendedPlan';
import { PLANS, PLAN_IDS, type PlanId } from '../../shared/pricing';
import { formatPrice } from '../../shared/currency';

type PlanLevel = 'personal' | 'institutional';

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

function translatedString(t: (key: string, options?: any) => any, key: string, fallback: string): string {
  const value = t(key);
  return typeof value === 'string' && value !== key ? value : fallback;
}

function translatedArray<T>(value: unknown, fallback: T[]): T[] {
  return Array.isArray(value) ? value as T[] : fallback;
}

function formatDisplayPrice(cents: number): string {
  return formatPrice(cents, 'USD');
}

export default function PricingPage() {
  const { t: tp } = useTranslation('public');
  const { t: tb } = useTranslation('billing');
  const { data: user } = useAuth();
  const navigate = useNavigate();
  const isLoggedIn = !!user;
  const [billingInterval, setBillingInterval] = useState<BillingInterval>(getIntendedInterval);

  const pricingPlans = useMemo((): PricingPlan[] => {
    return PLAN_IDS.map((id) => {
      const def = PLANS[id];
      const monthly = def.prices.monthlyCents;

      let price: string;
      let annualPrice: string | undefined;
      let period: string | undefined;

      if (monthly === 0) {
        price = translatedString(tb, 'free', 'Grátis');
        period = translatedString(tp, 'pricing.free_forever', 'para sempre');
      } else {
        price = `${formatDisplayPrice(monthly)}${translatedString(tp, 'per_month', '/mês')}`;
        period = undefined;
        const annualKey = `plans.${id}.annual_price`;
        if (def.prices.annualCents != null) {
          annualPrice = `${formatDisplayPrice(def.prices.annualCents)}${translatedString(tp, 'per_year', '/ano')}`;
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
        features: translatedArray(tb(`plans.${id}.features`, { returnObjects: true }), def.features),
        highlight: def.highlight,
        cta: monthly === 0
          ? translatedString(tp, 'pricing.cta_free', 'Começar grátis')
          : translatedString(tp, 'pricing.cta_paid', 'Começar agora'),
        priceCents: def.prices.monthlyCents,
        priceCentsAnnual: def.prices.annualCents,
      };
    });
  }, [tp, tb]);

  const personalPlans = pricingPlans.filter((p) => p.level === 'personal');
  const institutionalPlans = pricingPlans.filter((p) => p.level === 'institutional');
  const faqResult = tp('pricing.faq', { returnObjects: true });
  const faq = Array.isArray(faqResult) ? faqResult as { q: string; a: string }[] : [];

  const handleSelect = (plan: PricingPlan) => {
    setIntendedInterval(billingInterval);
    if (plan.planId === 'catechist_free') {
      navigate(isLoggedIn ? '/app' : '/signup');
      return;
    }
    setIntendedPlan(plan.planId);
    navigate(isLoggedIn ? `/app/billing?plan=${plan.planId}` : '/signup');
  };

  const renderCard = (plan: PricingPlan) => {
    const hasAnnual = !!plan.priceCentsAnnual && plan.priceCents > 0;
    const showAnnual = billingInterval === 'annual' && hasAnnual;

    return (
    <div
      key={plan.planId}
      className={`rounded-2xl border-2 p-6 bg-card transition-all hover:-translate-y-1 hover:shadow-lg relative flex flex-col ${
        plan.highlight
          ? 'border-primary ring-2 ring-primary/20 sm:scale-105 shadow-lg shadow-primary/10'
          : 'border-border'
      }`}
    >
      {plan.highlight && (
        <div className="inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground text-caption font-bold px-3 py-1 mb-3 self-start">
          <Star className="h-3 w-3" /> {tp('pricing.most_popular')}
        </div>
      )}
      <h3 className="text-lg font-bold">{plan.name}</h3>
      <p className="text-sm text-muted-foreground mt-1">{plan.desc}</p>
      <div className="mt-4 mb-1">
        {showAnnual ? (
          <>
            <span className="text-4xl font-bold">{formatDisplayPrice(plan.priceCentsAnnual!)}</span>
            <span className="text-base font-normal text-muted-foreground">{tp('per_year')}</span>
          </>
        ) : (
          <>
            <span className="text-4xl font-bold">{plan.price}</span>
            {plan.period && (
              <span className="text-base font-normal text-muted-foreground"> {plan.period}</span>
            )}
          </>
        )}
      </div>
      {showAnnual ? (
        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
          <span>{formatDisplayPrice(plan.priceCents)}{tp('per_month')}</span>
        </div>
      ) : plan.annualPrice ? (
        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
          <PiggyBank className="h-3 w-3" />
          <span>{plan.annualPrice}</span>
        </div>
      ) : null}
      <ul className="mt-5 space-y-2.5 text-sm flex-1">
        {plan.features.map((f) => (
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
            ? 'bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25'
            : 'bg-muted hover:bg-muted/80'
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
        <section className="max-w-4xl mx-auto px-4 pt-16 pb-8 text-center space-y-4">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">{tp('pricing.title')}</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {tp('pricing.subtitle')}
          </p>
          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground pt-2">
            <span className="flex items-center gap-1"><CreditCard className="h-4 w-4" /> {tp('pricing.payment_card')}</span>
            <span className="flex items-center gap-1"><Zap className="h-4 w-4" /> {tp('pricing.payment_pix')}</span>
            <span className="flex items-center gap-1"><PiggyBank className="h-4 w-4" /> {tp('pricing.annual_savings')}</span>
          </div>
          <div className="inline-flex items-center rounded-lg border bg-muted p-0.5 mt-4">
            <button
              type="button"
              onClick={() => setBillingInterval('monthly')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                billingInterval === 'monthly'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tp('pricing.monthly_tab')}
            </button>
            <button
              type="button"
              onClick={() => setBillingInterval('annual')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-1.5 ${
                billingInterval === 'annual'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tp('pricing.annual_tab')}
              <span className="text-caption text-success font-bold">{tp('pricing.annual_savings_badge')}</span>
            </button>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 pb-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold">{tp('pricing.personal_section')}</h2>
            <span className="text-sm text-muted-foreground">{tp('pricing.personal_hint')}</span>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {personalPlans.map(renderCard)}
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 pb-20">
          <div className="flex items-center gap-2 mb-4 mt-6">
            <Building2 className="h-5 w-5 text-secondary" />
            <h2 className="text-xl font-bold">{tp('pricing.institutional_section')}</h2>
            <span className="text-sm text-muted-foreground">{tp('pricing.institutional_hint')}</span>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {institutionalPlans.map(renderCard)}
          </div>
        </section>

        <section className="bg-muted/30 border-t">
          <div className="max-w-3xl mx-auto px-4 py-16">
            <h2 className="text-2xl font-bold text-center mb-10">{tp('pricing.faq_title')}</h2>
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
