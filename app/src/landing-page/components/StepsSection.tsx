import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { cn } from '../../client/utils';
import { trackMarketingEvent } from '../../client/analytics/marketingAnalytics';

export function StepsSection({ ns = 'landing', responsiveCtas = false }: { ns?: string; responsiveCtas?: boolean }) {
  const { t } = useTranslation(ns);
  const { ref: headerRef, className: headerClass } = useScrollReveal();
  const steps = t('steps', { returnObjects: true }) as any[];

  return (
    <section className="bg-muted/30 border-y">
      <div className="max-w-4xl mx-auto px-4 py-16 md:py-20">
        <div ref={headerRef} className={`text-center mb-12 space-y-3 ${headerClass}`}>
          <h2 className="text-3xl sm:text-4xl font-bold">{t('steps_title')}</h2>
          <p className="text-lg text-muted-foreground">{t('steps_subtitle')}</p>
        </div>

        <div className="relative grid gap-8 md:grid-cols-4">
          <div className="hidden md:block absolute top-7 left-[12.5%] right-[12.5%] h-0.5 bg-border" aria-hidden />

          {/* RCD Endowed Progress: Step 0 already completed (Nunes & Drèze, 2006) */}
          <EndowedStep />

          {(Array.isArray(steps) ? steps : []).map((step: any, index: number) => (
            <StepCard key={step.title} step={step} delay={(index + 1) * 80} index={index} />
          ))}
        </div>

        <div className="flex justify-center mt-10">
          <Link
            to="/signup"
            onClick={() => trackMarketingEvent('primary_cta_clicked', { landing: ns, placement: 'steps', destination: '/signup' })}
            className={cn(
              'inline-flex items-center justify-center gap-2 text-primary font-semibold hover:underline',
              responsiveCtas && 'max-w-full text-center leading-snug whitespace-normal'
            )}
          >
            {t('steps_cta')} <ArrowRight className="h-4 w-4 shrink-0" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function EndowedStep() {
  const { t } = useTranslation('landing');
  const { ref, className } = useScrollReveal({ delay: 0 });
  return (
    <div ref={ref} className={`relative text-center space-y-3 ${className}`}>
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/20 text-primary mx-auto relative z-10">
        <CheckCircle2 className="w-7 h-7" />
      </div>
      <h3 className="text-base font-semibold text-primary">{t('steps_endowed_title')}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed max-w-[180px] mx-auto">{t('steps_endowed_desc')}</p>
    </div>
  );
}

function StepCard({ step, delay, index }: { step: any; delay: number; index: number }) {
  const { ref, className } = useScrollReveal({ delay });
  return (
    <div ref={ref} className={`relative text-center space-y-3 ${className}`}>
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary text-primary-foreground text-2xl font-bold mx-auto relative z-10">
        {index + 1}
      </div>
      <h3 className="text-base font-semibold">{step.title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed max-w-[200px] mx-auto">{step.desc}</p>
    </div>
  );
}
