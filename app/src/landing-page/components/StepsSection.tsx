import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { cn } from '../../client/utils';
import { trackMarketingEvent } from '../../client/analytics/marketingAnalytics';

export function StepsSection({ ns = 'landing', responsiveCtas = false }: { ns?: string; responsiveCtas?: boolean }) {
  const { t } = useTranslation(ns);
  const { ref: headerRef, className: headerClass } = useScrollReveal();
  const steps = t('steps', { returnObjects: true }) as any[];

  return (
    <section className="bg-muted/30 border-y">
      <div className="max-w-4xl mx-auto px-4 py-20">
        <div ref={headerRef} className={`text-center mb-12 space-y-3 ${headerClass}`}>
          <h2 className="text-3xl sm:text-4xl font-bold">{t('steps_title')}</h2>
          <p className="text-lg text-muted-foreground">{t('steps_subtitle')}</p>
        </div>
        <div className="relative grid gap-8 md:grid-cols-3">
          <div className="hidden md:block absolute top-7 left-[16.67%] right-[16.67%] h-0.5 bg-border" aria-hidden />
          {(Array.isArray(steps) ? steps : []).map((step: any, index: number) => (<StepCard key={step.title} step={step} delay={index * 80} index={index} />))}
        </div>
        <div className="flex justify-center mt-10">
          <Link to="/pricing" onClick={() => trackMarketingEvent('primary_cta_clicked', { landing: ns, placement: 'steps', destination: '/pricing' })} className={cn('inline-flex items-center justify-center gap-2 text-primary font-semibold hover:underline', responsiveCtas && 'max-w-full text-center leading-snug whitespace-normal')}>
            {t('steps_cta')} <ArrowRight className="h-4 w-4 shrink-0" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function StepCard({ step, delay, index }: { step: any; delay: number; index: number }) {
  const { ref, className } = useScrollReveal({ delay });
  return (
    <div ref={ref} className={`relative text-center space-y-4 ${className}`}>
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary text-primary-foreground text-2xl font-bold mx-auto relative z-10">{index + 1}</div>
      <h3 className="text-lg font-semibold">{step.title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">{step.desc}</p>
    </div>
  );
}
