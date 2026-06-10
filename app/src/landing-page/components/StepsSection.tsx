import { Link } from 'react-router';
import { ArrowRight } from 'lucide-react';
import { STEPS } from '../content/landingContent';
import { useScrollReveal } from '../hooks/useScrollReveal';

export function StepsSection() {
  const { ref: headerRef, className: headerClass } = useScrollReveal();

  return (
    <section className="bg-muted/30 border-y">
      <div className="max-w-4xl mx-auto px-4 py-20">
        <div ref={headerRef} className={`text-center mb-12 space-y-3 ${headerClass}`}>
          <h2 className="text-3xl sm:text-4xl font-bold">Três passos para organizar sua catequese</h2>
          <p className="text-lg text-muted-foreground">Do cadastro da turma à comunicação com as famílias.</p>
        </div>

        <div className="relative grid gap-8 md:grid-cols-3">
          <div
            className="hidden md:block absolute top-7 left-[16.67%] right-[16.67%] h-0.5 bg-border"
            aria-hidden
          />

          {STEPS.map((step, index) => (
            <StepCard key={step.number} step={step} delay={index * 80} />
          ))}
        </div>

        <div className="flex justify-center mt-10">
          <Link
            to="/signup"
            className="inline-flex items-center gap-2 text-primary font-semibold hover:underline"
          >
            Criar conta gratuita <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function StepCard({
  step,
  delay,
}: {
  step: (typeof STEPS)[number];
  delay: number;
}) {
  const { ref, className } = useScrollReveal({ delay });

  return (
    <div ref={ref} className={`relative text-center space-y-4 ${className}`}>
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary text-primary-foreground text-2xl font-bold mx-auto relative z-10">
        {step.number}
      </div>
      <h3 className="text-lg font-semibold">{step.title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">{step.desc}</p>
    </div>
  );
}
