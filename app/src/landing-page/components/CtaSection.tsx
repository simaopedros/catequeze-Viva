import { Link } from 'react-router';
import { ChevronRight, Cross } from 'lucide-react';
import { useScrollReveal } from '../hooks/useScrollReveal';

export function CtaSection() {
  const { ref, className } = useScrollReveal();

  return (
    <section className="max-w-3xl mx-auto px-4 pb-20">
      <div
        ref={ref}
        className={`rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 border-2 border-primary/20 p-12 space-y-5 text-center relative overflow-hidden ${className}`}
      >
        <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-4 py-1.5 text-xs font-medium text-primary">
            <Cross className="h-3.5 w-3.5" />
            Comece em 5 minutos
          </div>
          <h2 className="text-3xl font-bold">Organize sua catequese hoje</h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Junte-se a catequistas que já usam a Catequese Viva para preparar encontros,
            fazer a chamada e manter as famílias por dentro — tudo pelo celular.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link
              to="/signup"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-primary text-primary-foreground px-10 text-sm font-semibold hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5"
            >
              Criar conta gratuita
              <ChevronRight className="ml-2 h-4 w-4" />
            </Link>
            <Link
              to="/pricing"
              className="inline-flex h-12 items-center justify-center rounded-xl border-2 border-input bg-background px-8 text-sm font-semibold hover:bg-accent transition-all"
            >
              Ver planos
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
