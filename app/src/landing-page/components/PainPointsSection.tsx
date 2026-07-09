import { useTranslation } from 'react-i18next';
import { AlertCircle } from 'lucide-react';
import { useScrollReveal } from '../hooks/useScrollReveal';

export function PainPointsSection({ ns = 'landing' }: { ns?: string }) {
  const { t } = useTranslation(ns);
  const { ref: headerRef, className: headerClass } = useScrollReveal();
  const pains = t('pains', { returnObjects: true }) as any[];

  return (
    <section className="bg-muted/30 border-y">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div ref={headerRef} className={`text-center mb-10 space-y-3 ${headerClass}`}>
          <h2 className="text-3xl sm:text-4xl font-bold">{t('pain_title')}</h2>
          <p className="text-lg text-muted-foreground">{t('pain_subtitle')}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(Array.isArray(pains) ? pains : []).map((pain: any, i: number) => (
            <PainCard key={i} text={pain.text} delay={i * 60} />
          ))}
        </div>
      </div>
    </section>
  );
}

function PainCard({ text, delay }: { text: string; delay: number }) {
  const { ref, className } = useScrollReveal({ delay });
  return (
    <div ref={ref} className={`flex items-start gap-3 rounded-sm border bg-card/50 p-4 ${className}`}>
      <AlertCircle className="h-5 w-5 text-destructive/60 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
