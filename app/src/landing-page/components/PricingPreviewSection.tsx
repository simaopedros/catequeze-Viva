import { Link } from 'react-router';
import { CheckCircle2, Star } from 'lucide-react';
import { PRICING_PREVIEW } from '../content/landingContent';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { setIntendedPlan } from '../../catequese/lib/intendedPlan';

export function PricingPreviewSection() {
  const { ref: headerRef, className: headerClass } = useScrollReveal();

  return (
    <section className="max-w-5xl mx-auto px-4 py-20">
      <div ref={headerRef} className={`text-center mb-12 space-y-3 ${headerClass}`}>
        <h2 className="text-3xl sm:text-4xl font-bold">Planos para cada etapa</h2>
        <p className="text-lg text-muted-foreground">
          Comece gratuitamente. Evolua quando sua catequese crescer.
        </p>
      </div>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
        {PRICING_PREVIEW.map((plan, index) => (
          <PricingCard key={plan.name} plan={plan} delay={index * 60} />
        ))}
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
}: {
  plan: (typeof PRICING_PREVIEW)[number];
  delay: number;
}) {
  const { ref, className } = useScrollReveal({ delay });

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
        <span className="text-4xl font-bold">{plan.price}</span>
        {plan.period && (
          <span className="text-base font-normal text-muted-foreground">{plan.period}</span>
        )}
      </div>
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
