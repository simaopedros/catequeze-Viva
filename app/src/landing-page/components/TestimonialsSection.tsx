import { useTranslation } from 'react-i18next';
import { Star } from 'lucide-react';
import { useScrollReveal } from '../hooks/useScrollReveal';

export function TestimonialsSection() {
  const { t } = useTranslation('landing');
  const { ref: headerRef, className: headerClass } = useScrollReveal();
  const testimonials = t('testimonials', { returnObjects: true }) as any[];

  return (
    <section className="bg-muted/30 border-y">
      <div className="max-w-5xl mx-auto px-4 py-20">
        <div ref={headerRef} className={`text-center mb-12 space-y-3 ${headerClass}`}>
          <h2 className="text-3xl sm:text-4xl font-bold">{t('testimonials_title')}</h2>
          <p className="text-lg text-muted-foreground">
            Catequistas, coordenadores e párocos que já transformaram o dia-a-dia da catequese.
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
    <div ref={ref} className={`rounded-2xl border bg-card p-6 space-y-4 ${className}`}>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star key={star} className="h-4 w-4 fill-amber-400 text-amber-400" />
        ))}
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed italic">
        &ldquo;{testimonial.text}&rdquo;
      </p>
      <div className="flex items-center gap-3 pt-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
          {testimonial.name
            .split(' ')
            .map((n) => n[0])
            .join('')}
        </div>
        <div>
          <p className="font-semibold text-sm">{testimonial.name}</p>
          <p className="text-xs text-muted-foreground">{testimonial.role}</p>
        </div>
      </div>
    </div>
  );
}
