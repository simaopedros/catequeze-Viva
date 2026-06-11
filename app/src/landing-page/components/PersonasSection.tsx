import { useTranslation } from 'react-i18next';
import { GraduationCap, Church, Heart, UserCheck, Building2 } from 'lucide-react';
import { useScrollReveal } from '../hooks/useScrollReveal';

const ICONS = [GraduationCap, Church, Heart, UserCheck, Building2];

export function PersonasSection() {
  const { t } = useTranslation('landing');
  const { ref: headerRef, className: headerClass } = useScrollReveal();
  const personas = t('personas', { returnObjects: true }) as any[];

  return (
    <section className="border-y bg-card/50 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div ref={headerRef} className={`text-center mb-10 space-y-3 ${headerClass}`}>
          <h2 className="text-3xl sm:text-4xl font-bold">{t('personas_title')}</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('personas_subtitle')}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {(Array.isArray(personas) ? personas : []).map((persona: any, index: number) => (
            <PersonaCard key={persona.title} persona={persona} delay={index * 50} icon={ICONS[index]} />
          ))}
        </div>
      </div>
    </section>
  );
}

function PersonaCard({ persona, delay, icon: Icon }: { persona: any; delay: number; icon: any }) {
  const { ref, className } = useScrollReveal({ delay });

  return (
    <div ref={ref} className={`rounded-xl border bg-card p-5 space-y-3 hover:shadow-md hover:border-primary/20 transition-all ${className}`}>
      <div className="inline-flex rounded-lg bg-primary/10 p-2">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <h3 className="font-semibold text-sm">{persona.title}</h3>
      <p className="text-xs text-muted-foreground leading-relaxed">{persona.desc}</p>
    </div>
  );
}
