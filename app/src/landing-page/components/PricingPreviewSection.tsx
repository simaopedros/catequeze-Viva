import { useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Star, PiggyBank } from 'lucide-react';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { setIntendedPlan } from '../../catequese/lib/intendedPlan';
import type { BillingInterval } from '../../catequese/lib/intendedPlan';
import { PLANS } from '../../shared/pricing';

const PLAN_FEATURES: Record<string, string[]> = {
  catechist_free: ['1 turma', '15 catequizandos', 'Presenças digitais', 'Bíblia e Catecismo', '3 créditos de IA iniciais'],
  catechist_ai: ['Turmas e catequizandos ilimitados', 'Gerador de encontros por IA', 'Planejamento anual automático', 'Assistente teológico', '20 créditos de IA/mês'],
  parish_complete: ['Catequistas ilimitados', 'Painel do coordenador', 'Documentos e consentimentos LGPD', 'Comunicação integrada', '50 créditos de IA/mês'],
};

function fmt(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

export function PricingPreviewSection({ ns = 'landing' }: { ns?: string }) {
  const { t } = useTranslation(ns);
  const { ref: headerRef, className: headerClass } = useScrollReveal();
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly');

  const plans = [
    { planKey: 'free', priceCents: PLANS.catechist_free.prices.monthlyCents, highlight: false },
    { planKey: 'ai', priceCents: PLANS.catechist_ai.prices.monthlyCents, priceCentsAnnual: PLANS.catechist_ai.prices.annualCents, highlight: true },
    { planKey: 'parish', priceCents: PLANS.parish_complete.prices.monthlyCents, priceCentsAnnual: PLANS.parish_complete.prices.annualCents, highlight: false },
  ];

  return (
    <section className="max-w-5xl mx-auto px-4 py-20">
      <div ref={headerRef} className={`text-center mb-8 space-y-3 ${headerClass}`}>
        <h2 className="text-3xl sm:text-4xl font-bold">{t('pricing_title')}</h2>
        <p className="text-lg text-muted-foreground">{t('pricing_subtitle')}</p>
        <div className="inline-flex items-center rounded-lg border bg-muted p-0.5 mt-3">
          <button type="button" onClick={() => setBillingInterval('monthly')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${billingInterval === 'monthly' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>{t('price_monthly') || 'Mensal'}</button>
          <button type="button" onClick={() => setBillingInterval('annual')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-1.5 ${billingInterval === 'annual' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>{t('price_annual') || 'Anual'}<span className="text-[11px] text-success font-bold">17% de desconto</span></button>
        </div>
      </div>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
        {plans.map((cfg) => (
          <PricingCard
            key={cfg.planKey}
            planKey={cfg.planKey}
            plan={t(`plans.${cfg.planKey}`, { returnObjects: true }) as any}
            features={PLAN_FEATURES[cfg.planKey]}
            delay={cfg.planKey === 'free' ? 0 : cfg.planKey === 'ai' ? 60 : 120}
            billingInterval={billingInterval}
            priceCents={cfg.priceCents}
            priceCentsAnnual={cfg.priceCentsAnnual}
            highlight={cfg.highlight}
          />
        ))}
      </div>

      <p className="text-center text-sm text-muted-foreground mt-8">
        <Link to="/pricing" className="underline hover:text-foreground transition-colors">Ver comparação completa de planos →</Link>
      </p>
    </section>
  );
}

function PricingCard({ planKey, plan, features, delay, billingInterval, priceCents, priceCentsAnnual, highlight }: {
  planKey: string; plan: any; features: string[]; delay: number; billingInterval: BillingInterval;
  priceCents: number; priceCentsAnnual?: number; highlight?: boolean;
}) {
  const { t } = useTranslation('landing');
  const { ref, className } = useScrollReveal({ delay });
  const hasAnnual = !!priceCentsAnnual && priceCents > 0;
  const showAnnual = billingInterval === 'annual' && hasAnnual;

  return (
    <div ref={ref} className={`rounded-2xl border p-6 space-y-4 relative flex flex-col ${highlight ? 'border-primary shadow-lg shadow-primary/10 scale-[1.02]' : 'bg-card'} ${className}`}>
      {highlight && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground shadow-sm"><Star className="h-3 w-3 fill-current" />{t('price_popular') || 'Mais popular'}</span>
        </div>
      )}
      <div>
        <h3 className="font-semibold">{plan?.name || 'Plano'}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{plan?.desc || ''}</p>
      </div>
      <div>
        {priceCents === 0 ? (
          <span className="text-4xl font-bold">{t('price_free') || 'Grátis'}</span>
        ) : showAnnual ? (
          <><span className="text-4xl font-bold">{fmt(priceCentsAnnual!)}</span><span className="text-sm text-muted-foreground">/ano</span></>
        ) : (
          <><span className="text-4xl font-bold">{fmt(priceCents)}</span><span className="text-sm text-muted-foreground">/mês</span></>
        )}
      </div>
      {showAnnual ? (
        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1"><span>{fmt(priceCents)}/mês</span></div>
      ) : hasAnnual ? (
        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1"><PiggyBank className="h-3 w-3" /><span>{fmt(priceCentsAnnual!)}/ano</span></div>
      ) : null}
      <ul className="mt-5 space-y-2.5 text-sm text-muted-foreground flex-1">
        {(features || []).map((feature) => (
          <li key={feature} className="flex items-start gap-2.5"><CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />{feature}</li>
        ))}
      </ul>
      <Link
        to="/signup"
        onClick={() => { if (planKey !== 'catechist_free') setIntendedPlan(planKey); }}
        className={`mt-6 block text-center rounded-xl px-4 py-3 text-sm font-semibold transition-all ${highlight ? 'bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25' : 'bg-muted hover:bg-muted/80'}`}
      >
        {priceCents === 0 ? 'Começar grátis' : 'Começar agora'}
      </Link>
    </div>
  );
}
