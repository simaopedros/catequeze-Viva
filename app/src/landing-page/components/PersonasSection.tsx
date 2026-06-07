import { PERSONAS } from '../content/landingContent';
import { useScrollReveal } from '../hooks/useScrollReveal';

export function PersonasSection() {
  const { ref: headerRef, className: headerClass } = useScrollReveal();

  return (
    <section className="border-y bg-card/50 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div ref={headerRef} className={`text-center mb-10 space-y-3 ${headerClass}`}>
          <h2 className="text-3xl sm:text-4xl font-bold">Para cada pessoa da catequese</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Cada perfil tem as ferramentas certas para o seu papel na jornada de fé.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {PERSONAS.map((persona, index) => (
            <PersonaCard key={persona.title} persona={persona} delay={index * 50} />
          ))}
        </div>
      </div>
    </section>
  );
}

function PersonaCard({
  persona,
  delay,
}: {
  persona: (typeof PERSONAS)[number];
  delay: number;
}) {
  const { ref, className } = useScrollReveal({ delay });

  return (
    <div
      ref={ref}
      className={`rounded-xl border bg-card p-5 space-y-3 hover:shadow-md hover:border-primary/20 transition-all ${className}`}
    >
      <div className="inline-flex rounded-lg bg-primary/10 p-2">
        <persona.icon className="h-5 w-5 text-primary" />
      </div>
      <h3 className="font-semibold text-sm">{persona.title}</h3>
      <p className="text-xs text-muted-foreground leading-relaxed">{persona.desc}</p>
    </div>
  );
}
