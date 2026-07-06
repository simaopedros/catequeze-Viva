import { useTranslation } from 'react-i18next';
import { SHOWCASES, SECONDARY_FEATURES } from '../content/landingContent';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { FeatureShowcase } from './FeatureShowcase';
import { Card } from '../../client/components/ui/card';

export function FeaturesSection({
  ns = 'landing',
  order,
  showSecondaryGrid = true,
}: {
  ns?: string;
  order?: string[];
  showSecondaryGrid?: boolean;
}) {
  const { t } = useTranslation(ns);
  const { ref: headerRef, className: headerClass } = useScrollReveal();

  return (
    <section id="recursos" className="scroll-mt-20">
      <div className="max-w-6xl mx-auto px-4 pt-20 pb-6">
        <div ref={headerRef} className={`text-center space-y-3 ${headerClass}`}>
          <h2 className="text-title-xl font-bold">{t('features_title')}</h2>
          <p className="text-body-lg text-text-secondary max-w-2xl mx-auto">{t('features_subtitle')}</p>
        </div>
      </div>

      <div className="divide-y divide-border/50">
        {(order
          ? order.map((id) => {
              const s = SHOWCASES.find((sc) => sc.id === id);
              return s ? <FeatureShowcase key={s.id} showcase={s} ns={ns} /> : null;
            }).filter(Boolean)
          : SHOWCASES.map((showcase) => <FeatureShowcase key={showcase.id} showcase={showcase} ns={ns} />))}
      </div>

      {showSecondaryGrid && <FeatureGridSection ns={ns} />}
    </section>
  );
}

function FeatureGridSection({ ns = 'landing' }: { ns?: string }) {
  const { t } = useTranslation(ns);
  const { ref: headerRef, className: headerClass } = useScrollReveal();
  const secondaryTexts = t('secondary', { returnObjects: true }) as any[];

  const items = SECONDARY_FEATURES.map((sf, i) => ({
    icon: sf.icon,
    title: Array.isArray(secondaryTexts) && secondaryTexts[i] ? secondaryTexts[i].title : sf.title,
    desc: Array.isArray(secondaryTexts) && secondaryTexts[i] ? secondaryTexts[i].desc : sf.desc,
  }));

  return (
    <div className="max-w-6xl mx-auto px-4 py-16">
      <div ref={headerRef} className={`text-center mb-10 space-y-2 ${headerClass}`}>
        <h3 className="text-xl sm:text-2xl font-semibold">{t('more_features')}</h3>
        <p className="text-muted-foreground">{t('more_features_sub')}</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        {(Array.isArray(items) ? items : SECONDARY_FEATURES).map((feature: any, index: number) => (
          <SecondaryFeatureCard key={feature.title} feature={feature} delay={index * 50} />
        ))}
      </div>
    </div>
  );
}

function SecondaryFeatureCard({ feature, delay }: { feature: any; delay: number }) {
  const { ref, className } = useScrollReveal({ delay });

  return (
    <Card ref={ref} variant="interactive" className={`p-6 space-y-3 ${className}`}>
      <div className="inline-flex rounded-xl bg-primary/10 p-2.5">
        <feature.icon className="h-5 w-5 text-primary" />
      </div>
      <h4 className="font-semibold">{feature.title}</h4>
      <p className="text-body-sm text-text-secondary leading-relaxed">{feature.desc}</p>
    </Card>
  );
}
