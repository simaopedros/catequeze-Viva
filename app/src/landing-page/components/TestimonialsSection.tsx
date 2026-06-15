import { useTranslation } from 'react-i18next';
import { Star } from 'lucide-react';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { Card } from '../../client/components/ui/card';

export function TestimonialsSection({ ns = 'landing' }: { ns?: string }) {
  const { t } = useTranslation(ns);
  const { ref: headerRef, className: headerClass } = useScrollReveal();
  const testimonials = t('testimonials', { returnObjects: true }) as any[];

  return (
    <section className="bg-muted/30 border-y">
      <div className="max-w-5xl mx-auto px-4 py-20">
        <div ref={headerRef} className={`text-center mb-12 space-y-3 ${headerClass}`}>
          <h2 className="text-title-xl font-bold">{t('testimonials_title')}</h2>
          <p className="text-body-lg text-text-secondary">
            {t('testimonials_subtitle')}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {(Array.isArray(testimonials) ? testimonials : []).map((testimonial: any, index: number) => (
            <TestimonialCard key={testimonial.name} testimonial={testimonial} delay={index * 60} />
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialCard({ testimonial, delay }: { testimonial: any; delay: number }) {
  const { ref, className } = useScrollReveal({ delay });

  return (
    <Card ref={ref} variant="flat" className={`p-6 space-y-4 ${className}`}>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star key={star} className="h-4 w-4 fill-amber-400 text-amber-400" />
        ))}
      </div>
      <p className="text-body-sm text-text-secondary leading-relaxed italic">
        &ldquo;{testimonial.text}&rdquo;
      </p>
      <div className="flex items-center gap-3 pt-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
          {testimonial.name
            .split(' ')
            .map((n: string) => n[0])
            .join('')}
        </div>
        <div>
          <p className="font-semibold text-body-sm">{testimonial.name}</p>
          <p className="text-body-xs text-text-secondary">{testimonial.role}</p>
        </div>
      </div>
    </Card>
  );
}
