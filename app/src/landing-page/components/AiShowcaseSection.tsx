import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Sparkles, ChevronRight } from 'lucide-react';
import { useScrollReveal } from '../hooks/useScrollReveal';

export function AiShowcaseSection() {
  const { t } = useTranslation('landing');
  const { ref, className } = useScrollReveal();

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/5" />
      <div className="relative max-w-4xl mx-auto px-4 py-20 text-center space-y-6">
        <div ref={ref} className={className}>
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-4 py-1.5 text-sm font-medium text-primary mb-6">
            <Sparkles className="h-4 w-4" />
            {t('ai_showcase_cta')}
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight">{t('ai_showcase_title')}</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mt-4">{t('ai_showcase_subtitle')}</p>
          <div className="mt-8">
            <Link to="/signup" className="inline-flex h-12 items-center justify-center rounded-xl bg-primary text-primary-foreground px-8 text-sm font-semibold hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/25">
              {t('ai_showcase_cta')}
              <ChevronRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
