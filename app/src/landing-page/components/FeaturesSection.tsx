import { useTranslation } from 'react-i18next';
import { SHOWCASES, SECONDARY_FEATURES } from '../content/landingContent';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { FeatureShowcase } from './FeatureShowcase';

export function FeaturesSection() {
  const { t } = useTranslation('landing');
  const { ref: headerRef, className: headerClass } = useScrollReveal();

  return (
    <section id="recursos" className="scroll-mt-20">
      <div className="max-w-6xl mx-auto px-4 pt-20 pb-6">
        <div ref={headerRef} className={`text-center space-y-3 ${headerClass}`}>
          <h2 className="text-3xl sm:text-4xl font-bold">Tudo que sua catequese precisa</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Uma plataforma completa: da chamada de presença à jornada sacramental, da Bíblia ao portal da família.
          </p>
        </div>
      </div>

      <div className="divide-y divide-border/50">
        {SHOWCASES.map((showcase) => (
          <FeatureShowcase key={showcase.id} showcase={showcase} />
        ))}
      </div>

      <FeatureGridSection />
    </section>
  );
}

function FeatureGridSection() {
  const { t } = useTranslation('landing');
  const { ref: headerRef, className: headerClass } = useScrollReveal();
  const secondary = t('secondary', { returnObjects: true }) as any[];

  return (
    <div className="max-w-6xl mx-auto px-4 py-16">
      <div ref={headerRef} className={`text-center mb-10 space-y-2 ${headerClass}`}>
        <h3 className="text-xl sm:text-2xl font-semibold">E muito mais</h3>
        <p className="text-muted-foreground">Recursos transversais em toda a plataforma.</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        {(Array.isArray(secondary) ? secondary : SECONDARY_FEATURES).map((feature: any, index: number) => (
          <SecondaryFeatureCard key={feature.title} feature={feature} delay={index * 50} />
        ))}
      </div>
    </div>
  );
}

function SecondaryFeatureCard({ feature, delay }: { feature: any; delay: number }) {
  const { ref, className } = useScrollReveal({ delay });

  return (
    <div
      ref={ref}
      className={`rounded-2xl border bg-card p-6 space-y-3 hover:shadow-md hover:border-primary/20 transition-all ${className}`}
    >
      <div className="inline-flex rounded-xl bg-primary/10 p-2.5">
        <feature.icon className="h-5 w-5 text-primary" />
      </div>
      <h4 className="font-semibold">{feature.title}</h4>
      <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
    </div>
  );
}
