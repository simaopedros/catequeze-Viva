import { MapPin, Quote, Star } from "lucide-react";
import { useScrollReveal } from "../hooks/useScrollReveal";
import { Card } from "../../client/components/ui/card";
import { useLandingText } from "../hooks/useLandingText";

type Testimonial = {
  name: string;
  role: string;
  text: string;
  location?: string;
  parish?: string;
  highlight?: string;
};

export function TestimonialsSection({ ns = "landing" }: { ns?: string }) {
  const tr = useLandingText(ns);
  const testimonials = tr("testimonials", { returnObjects: true }) as Testimonial[];

  if (!Array.isArray(testimonials) || testimonials.length === 0) {
    return null;
  }

  const { ref: headerRef, className: headerClass } = useScrollReveal();

  return (
    <section className="bg-muted/30 border-y">
      <div className="max-w-5xl mx-auto px-4 py-16 md:py-20">
        <div ref={headerRef} className={`text-center mb-10 space-y-3 ${headerClass}`}>
          <h2
            className="text-3xl font-semibold tracking-tight text-[#071A2D] sm:text-4xl"
            style={{ fontFamily: "var(--font-brand-display)" }}
          >
            {tr("testimonials_title")}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{tr("testimonials_subtitle")}</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <TestimonialCard key={testimonial.name} testimonial={testimonial} delay={index * 60} />
          ))}
        </div>
        <p className="mt-8 text-center text-xs text-muted-foreground max-w-2xl mx-auto">
          {tr("testimonials_note")}
        </p>
      </div>
    </section>
  );
}

function TestimonialCard({ testimonial, delay }: { testimonial: Testimonial; delay: number }) {
  const { ref, className } = useScrollReveal({ delay });
  const initials = testimonial.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  const meta = [testimonial.parish, testimonial.location].filter(Boolean).join(" · ");

  return (
    <Card ref={ref} variant="flat" className={`p-6 space-y-4 flex flex-col h-full ${className}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star key={star} className="h-3.5 w-3.5 fill-[#D39A2B] text-[#D39A2B]" />
          ))}
        </div>
        <Quote className="h-4 w-4 text-[#071A2D]/30 shrink-0" aria-hidden />
      </div>

      {testimonial.highlight && (
        <p className="text-xs font-semibold text-[#071A2D]">{testimonial.highlight}</p>
      )}

      <p className="text-sm text-muted-foreground leading-relaxed flex-1">
        &ldquo;{testimonial.text}&rdquo;
      </p>

      <div className="flex items-center gap-3 pt-2 border-t border-border/60">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm bg-[#071A2D]/08 text-sm font-semibold text-[#071A2D]"
          aria-hidden
        >
          {initials}
        </div>
        <div className="min-w-0">
          <p
            className="truncate text-sm font-semibold tracking-tight text-[#071A2D]"
            style={{ fontFamily: "var(--font-brand-display)" }}
          >
            {testimonial.name}
          </p>
          <p className="text-xs text-muted-foreground truncate">{testimonial.role}</p>
          {meta && (
            <p className="text-[11px] text-muted-foreground/90 flex items-center gap-1 mt-0.5 truncate">
              <MapPin className="h-3 w-3 shrink-0" />
              {meta}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
