import { Link } from 'react-router';
import { ArrowRight, ChevronRight } from 'lucide-react';
import { HERO_BADGE } from '../content/landingContent';
import { useParallax } from '../hooks/useParallax';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { BrowserFrame } from './BrowserFrame';
import { FeatureScreenshot } from './FeatureScreenshot';

export function HeroSection() {
  const { ref: revealRef, className: revealClass } = useScrollReveal();
  const blobTopRef = useParallax<HTMLDivElement>({ factor: 0.04 });
  const blobBottomRef = useParallax<HTMLDivElement>({ factor: -0.03 });
  const mockupRef = useParallax<HTMLDivElement>({ factor: 0.06 });

  const BadgeIcon = HERO_BADGE.icon;
  const AccentIcon = HERO_BADGE.accentIcon;

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
        className={`relative max-w-6xl mx-auto px-4 py-20 md:py-28 lg:py-32 ${revealClass}`}
      >
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
          <div className="space-y-8 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-5 py-2 text-sm font-medium text-primary backdrop-blur-sm">
              <BadgeIcon className="h-4 w-4" />
              {HERO_BADGE.text}
              <AccentIcon className="h-4 w-4 text-accent" />
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
              Toda a catequese
              <br />
              <span className="text-gradient-primary">num só lugar</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Turmas, presenças, sacramentos, conteúdos, comunicação e documentos.{' '}
              <span className="font-semibold text-foreground">Da paróquia à diocese.</span>
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link
                to="/signup"
                className="inline-flex h-12 items-center justify-center rounded-xl bg-primary text-primary-foreground px-8 text-sm font-semibold hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5"
              >
                Começar gratuitamente
                <ChevronRight className="ml-2 h-4 w-4" />
              </Link>
              <a
                href="#recursos"
                className="inline-flex h-12 items-center justify-center rounded-xl border-2 border-input bg-background px-8 text-sm font-semibold hover:bg-accent hover:text-accent-foreground transition-all hover:-translate-y-0.5"
              >
                Ver recursos
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </div>

            <p className="text-xs text-muted-foreground">
              ✓ Sem cartão de crédito &nbsp; ✓ Plano gratuito para sempre &nbsp; ✓ Comece em 5 minutos
            </p>
          </div>

          <div ref={mockupRef} className="parallax-layer relative mx-auto w-full max-w-lg lg:max-w-none">
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-primary/10 to-accent/10 blur-2xl opacity-60" />
            <BrowserFrame className="relative" url="app.catequese.viva/painel">
              <FeatureScreenshot
                id="dashboard"
                alt="Painel do coordenador da Catequese Viva com KPIs e alertas pastorais"
              />
            </BrowserFrame>
          </div>
        </div>
      </div>
    </section>
  );
}
