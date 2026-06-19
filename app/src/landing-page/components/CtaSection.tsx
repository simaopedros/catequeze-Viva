import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { Button } from '../../client/components/ui/button';
import { Badge } from '../../client/components/ui/badge';
import { BrandMark } from '../../client/components/brand/Brand';
import { cn } from '../../client/utils';

export function CtaSection({ ns = 'landing', responsiveCtas = false }: { ns?: string; responsiveCtas?: boolean }) {
  const { t } = useTranslation(ns);
  const { ref, className } = useScrollReveal();
  const ctaClassName = responsiveCtas
    ? 'h-auto min-h-12 w-full px-6 text-center leading-snug whitespace-normal sm:w-auto sm:px-10'
    : undefined;

  return (
    <section className="max-w-3xl mx-auto px-4 pb-20">
      <div
        ref={ref}
        className={cn(
          'rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 border-2 border-primary/20 p-12 space-y-5 text-center relative overflow-hidden',
          responsiveCtas && 'rounded-2xl px-5 py-8 sm:rounded-3xl sm:p-12',
          className,
        )}
      >
        <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative space-y-5">
          <Badge variant="brand" className="inline-flex items-center gap-1.5">
            <BrandMark className="h-3.5 w-3.5" />
            {t('cta_badge')}
          </Badge>
          <h2 className="text-title-xl font-bold">{t('cta_title')}</h2>
          <p className="text-text-secondary max-w-lg mx-auto">{t('cta_subtitle')}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button size="xl" variant="brand" asChild className={ctaClassName}>
              <Link to="/signup">
                {t('cta_button')}
                <ArrowRight className="h-4 w-4 shrink-0" />
              </Link>
            </Button>
            <Button size="xl" variant="outline" asChild className={ctaClassName}>
              <Link to="/pricing">{t('cta_see_plans')}</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
