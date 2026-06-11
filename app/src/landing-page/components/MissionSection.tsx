import { useTranslation } from 'react-i18next';
import { Cross } from 'lucide-react';
import { useScrollReveal } from '../hooks/useScrollReveal';

export function MissionSection() {
  const { t } = useTranslation('landing');
  const { ref, className } = useScrollReveal();

  return (
    <section className="bg-gradient-to-br from-primary/5 via-background to-accent/5 border-y">
      <div ref={ref} className={`max-w-3xl mx-auto px-4 py-20 text-center space-y-4 ${className}`}>
        <div className="inline-flex rounded-full bg-primary/10 p-3 mb-2">
          <Cross className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-3xl sm:text-4xl font-bold">{t('mission_title')}</h2>
        <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">{t('mission_text')}</p>
      </div>
    </section>
  );
}
