import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ArrowRight, GraduationCap, Sparkles } from 'lucide-react';
import { useParallax } from '../hooks/useParallax';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { BrowserFrame } from './BrowserFrame';
import { FeatureScreenshot } from './FeatureScreenshot';
import { Button } from '../../client/components/ui/button';
import { Badge } from '../../client/components/ui/badge';
import { cn } from '../../client/utils';

export function HeroSection({ ns = 'landing', responsiveCtas = false }: { ns?: string; responsiveCtas?: boolean }) {
  const { t } = useTranslation(ns);
  const { ref: revealRef, className: revealClass } = useScrollReveal();
  const blobTopRef = useParallax<HTMLDivElement>({ factor: 0.04 });
  const blobBottomRef = useParallax<HTMLDivElement>({ factor: -0.03 });
  const mockupRef = useParallax<HTMLDivElement>({ factor: 0.06 });
  const ctaClassName = responsiveCtas
    ? 'h-auto min-h-12 w-full px-6 text-center leading-snug whitespace-normal sm:w-auto sm:px-10'
    : undefined;

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      <div
        ref={blobTopRef}
        className="parallax-layer absolute top-20 right-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl pointer-events-none"
      />
      <div
        ref={blobBottomRef}
        className="parallax-layer absolute bottom-10 left-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl pointer-events-none"
      />

      <div
        ref={revealRef}
        className={`relative max-w-6xl mx-auto px-4 py-14 sm:py-16 md:py-20 lg:py-28 ${revealClass}`}
      >
        <div className="grid gap-8 md:gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-14 items-center">
          <div className="space-y-6 md:space-y-8 text-center lg:text-left">
            <div className="inline-flex items-center gap-2">
              <Badge variant="brand" size="lg" className="gap-1.5 backdrop-blur-sm">
                <GraduationCap className="h-3.5 w-3.5" />
                {t('hero.badge')}
                <Sparkles className="h-3.5 w-3.5 text-accent" />
              </Badge>
            </div>

            <h1 className="text-title-xxl font-bold tracking-tight leading-tight text-balance">
              {t('hero.headline_line1')}
              <br />
              <span className="text-gradient-primary">{t('hero.headline_line2')}</span>
            </h1>

            <p className="text-body-lg md:text-xl text-text-secondary max-w-xl mx-auto lg:mx-0 leading-relaxed">
              {t('hero.subheadline').split('—')[0]}—{' '}
              <span className="font-semibold text-foreground">{t('hero.subheadline').split('—')[1]?.trim() || t('hero.subheadline')}</span>
            </p>

            <div
              className={cn(
                'flex max-w-md mx-auto lg:mx-0 flex-col md:flex-row gap-3 md:gap-4 justify-center lg:justify-start',
                responsiveCtas && 'w-full sm:w-auto sm:max-w-none',
              )}
            >
              <Button size="xl" variant="brand" asChild className={ctaClassName}>
                <Link to="/signup">
                  {t('hero.cta_primary')}
                  <ArrowRight className="h-4 w-4 shrink-0" />
                </Link>
              </Button>
              <Button size="xl" variant="outline" asChild className={ctaClassName}>
                <a href="#recursos">
                  {t('hero.cta_secondary')}
                  <ArrowRight className="h-4 w-4 shrink-0" />
                </a>
              </Button>
            </div>

            <p className="text-body-xs text-text-secondary">
              {t('hero.trust_signals')}
            </p>
          </div>

          <div ref={mockupRef} className="parallax-layer relative mx-auto w-full max-w-md md:max-w-xl lg:max-w-none">
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-primary/10 to-accent/10 blur-2xl opacity-60" />
            <BrowserFrame className="relative" url="app.catequese.viva/painel">
              <FeatureScreenshot
                id="ai-planner"
                alt="Gerador de encontros da Catequese Viva com roteiro, leitura biblica e atividade"
              />
            </BrowserFrame>
          </div>
        </div>
      </div>
    </section>
  );
}
