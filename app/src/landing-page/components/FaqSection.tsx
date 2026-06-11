import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react';
import { useScrollReveal } from '../hooks/useScrollReveal';

export function FaqSection() {
  const { t } = useTranslation('landing');
  const { ref: headerRef, className: headerClass } = useScrollReveal();
  const faqs = t('faqs', { returnObjects: true }) as any[];

  return (
    <section className="max-w-3xl mx-auto px-4 py-20">
      <div ref={headerRef} className={`text-center mb-12 space-y-3 ${headerClass}`}>
        <h2 className="text-3xl sm:text-4xl font-bold">{t('faq_title')}</h2>
        <p className="text-lg text-muted-foreground">Tudo que você precisa saber antes de começar.</p>
      </div>

      <div className="space-y-4">
        {(Array.isArray(faqs) ? faqs : []).map((item: any, index: number) => (
          <FaqItem key={item.q} item={item} delay={index * 40} />
        ))}
      </div>
    </section>
  );
}

function FaqItem({
  item,
  delay,
}: {
  item: (typeof FAQ)[number];
  delay: number;
}) {
  const { ref, className } = useScrollReveal<HTMLDivElement>({ delay });

  return (
    <div ref={ref} className={className}>
      <details className="group rounded-xl border bg-card">
      <summary className="flex items-center justify-between px-6 py-4 cursor-pointer font-medium text-sm list-none">
        {item.q}
        <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90 text-muted-foreground" />
      </summary>
      <p className="px-6 pb-4 text-sm text-muted-foreground leading-relaxed">{item.a}</p>
      </details>
    </div>
  );
}
