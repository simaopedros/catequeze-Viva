import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Cross } from 'lucide-react';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { Button } from '../../client/components/ui/button';
import { Badge } from '../../client/components/ui/badge';

export function CtaSection({ ns = 'landing' }: { ns?: string }) {
  const { t } = useTranslation(ns);
  const { ref, className } = useScrollReveal();

  return (
    <section className="max-w-3xl mx-auto px-4 pb-20">
      <div ref={ref} className={`rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 border-2 border-primary/20 p-12 space-y-5 text-center relative overflow-hidden ${className}`}>
        <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative space-y-5">
          <Badge variant="brand" className="inline-flex items-center gap-1.5">
            <Cross className="h-3.5 w-3.5" />
            {t('cta_badge')}
          </Badge>
          <h2 className="text-title-xl font-bold">{t('cta_title')}</h2>
          <p className="text-text-secondary max-w-lg mx-auto">{t('cta_subtitle')}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button size="xl" variant="brand" asChild>
              <Link to="/signup">
                {t('cta_button')}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="xl" variant="outline" asChild>
              <Link to="/pricing">{t('cta_see_plans')}</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
