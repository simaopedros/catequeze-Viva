import { useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Star, PiggyBank } from 'lucide-react';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { setIntendedPlan } from '../../catequese/lib/intendedPlan';
import type { BillingInterval } from '../../catequese/lib/intendedPlan';

const PLAN_FEATURES: Record<string, string[]> = {
  catechist_free: ['1 turma', '15 catequizandos', 'Presenças digitais', 'Bíblia e Catecismo', '3 créditos de IA iniciais'],
  catechist_ai: ['Turmas e catequizandos ilimitados', 'Gerador de encontros por IA', 'Planejamento anual automático', 'Assistente teológico', '20 créditos de IA/mês'],
  parish_complete: ['Catequistas ilimitados', 'Painel do coordenador', 'Documentos e consentimentos LGPD', 'Comunicação integrada', '50 créditos de IA/mês'],
};

function fmt(cents: number): string {
  return `R$${(cents / 100).toFixed(0)}`;
}

export function PricingPreviewSection() {
  const { t } = useTranslation('landing');
  const { ref: headerRef, className: headerClass } = useScrollReveal();
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly');

  return (
    <section className="max-w-5xl mx-auto px-4 py-20">
      <div ref={headerRef} className={`text-center mb-8 space-y-3 ${headerClass}`}>
        <h2 className="text-3xl sm:text-4xl font-bold">{t('pricing_title')}</h2>
        <p className="text-lg text-muted-foreground">{t('pricing_subtitle')}</p>
        <div className="inline-flex items-center rounded-lg border bg-muted p-0.5 mt-3">
          <button type="button" onClick={() => setBillingInterval('monthly')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${billingInterval === 'monthly' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            Mensal
          </button>
          <button type="button" onClick={() => setBillingInterval('annual')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-1.5 ${billingInterval === 'annual' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            Anual
            <span className="text-[11px] text-success font-bold">17% de desconto</span>
          </button>
        </div>
      </div>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
        <PricingCard planKey="free" plan={t('plans.free', { returnObjects: true }) as any} features={PLAN_FEATURES.catechist_free} delay={0} billingInterval={billingInterval} priceCents={0} />
        <PricingCard planKey="ai" plan={t('plans.ai', { returnObjects: true }) as any} features={PLAN_FEATURES.catechist_ai} delay={60} billingInterval={billingInterval} priceCents={900} priceCentsAnnual={9000} highlight />
        <PricingCard planKey="parish" plan={t('plans.parish', { returnObjects: true }) as any} features={PLAN_FEATURES.parish_complete} delay={120} billingInterval={billingInterval} priceCents={2900} priceCentsAnnual={29000} />
      </div>

      <p className="text-center text-sm text-muted-foreground mt-8">
        <Link to="/pricing" className="underline hover:text-foreground transition-colors">
          Ver comparação completa de planos →
        </Link>
      </p>
    </section>
  );
}

function PricingCard({
  plan,
  delay,
  billingInterval,
}: {
  plan: (typeof PRICING_PREVIEW)[number];
  delay: number;
  billingInterval: BillingInterval;
}) {
  const { ref, className } = useScrollReveal({ delay });
  const hasAnnual = !!plan.priceCentsAnnual && plan.priceCents! > 0;
  const showAnnual = billingInterval === 'annual' && hasAnnual;

  return (
    <div
      ref={ref}
      className={`rounded-2xl border-2 p-6 bg-card transition-all hover:-translate-y-1 hover:shadow-lg flex flex-col ${className} ${
        plan.highlight
          ? 'border-primary ring-2 ring-primary/20 shadow-lg shadow-primary/10'
          : 'border-border'
      }`}
    >
      {plan.highlight && (
        <div className="inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground text-[11px] font-bold px-3 py-1 mb-3 self-start">
          <Star className="h-3 w-3" /> Mais popular
        </div>
      )}
      <h3 className="text-lg font-bold">{plan.name}</h3>
      <p className="text-sm text-muted-foreground mt-1">{plan.desc}</p>
      <div className="mt-4 mb-1">
        {showAnnual ? (
          <>
            <span className="text-4xl font-bold">{fmt(plan.priceCentsAnnual!)}</span>
            <span className="text-base font-normal text-muted-foreground">/ano</span>
          </>
        ) : (
          <>
            <span className="text-4xl font-bold">{plan.price}</span>
            {plan.period && (
              <span className="text-base font-normal text-muted-foreground">{plan.period}</span>
            )}
          </>
        )}
      </div>
      {showAnnual ? (
        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
          <span>{fmt(plan.priceCents!)}/mês</span>
        </div>
      ) : (plan.priceCentsAnnual && plan.priceCents! > 0) ? (
        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
          <PiggyBank className="h-3 w-3" />
          <span>{fmt(plan.priceCentsAnnual)}/ano</span>
        </div>
      ) : null}
      <ul className="mt-5 space-y-2.5 text-sm text-muted-foreground flex-1">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" /> {feature}
          </li>
        ))}
      </ul>
      <Link
        to="/signup"
        onClick={() => {
          if (plan.planId !== 'catechist_free') setIntendedPlan(plan.planId);
        }}
        className={`mt-6 block text-center rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
          plan.highlight
            ? 'bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25'
            : 'bg-muted hover:bg-muted/80'
        }`}
      >
        {plan.price === 'Grátis' ? 'Começar grátis' : 'Começar agora'}
      </Link>
    </div>
  );
}
