import { useTranslation } from 'react-i18next';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { BrandMedallion } from '../../client/components/brand/Brand';

export function MissionSection({ ns = 'landing' }: { ns?: string }) {
  const { t } = useTranslation(ns);
  const { ref, className } = useScrollReveal();

  return (
    <section className="bg-gradient-to-br from-primary/5 via-background to-accent/5 border-y">
      <div ref={ref} className={`max-w-3xl mx-auto px-4 py-20 text-center space-y-4 ${className}`}>
        <BrandMedallion className="mb-2" />
        <h2 className="text-3xl sm:text-4xl font-bold">{t('mission_title')}</h2>
        <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">{t('mission_text')}</p>
      </div>
    </section>
  );
}
