import { Check } from "lucide-react";
import { BrandMark } from "../../../client/components/brand/Brand";

/**
 * Compact product preview for the hero — next meeting, not a dashboard clone.
 */
export function AppProductMock({ ns = "landing" }: { ns?: string }) {
  void ns;
  return (
    <div
      className="flex min-h-[260px] overflow-hidden bg-white text-left sm:min-h-[320px]"
      data-testid="app-product-mock"
    >
      <aside className="hidden w-[9.25rem] shrink-0 border-r border-border/70 p-4 sm:block">
        <div className="mb-5 flex items-center gap-2">
          <BrandMark className="h-6 w-6" />
          <p className="font-brand-display text-xs font-semibold tracking-tight text-brand-ink">
            Catequese VIVA
          </p>
        </div>
        <ul className="space-y-0.5 text-[11px] text-muted-foreground">
          <li className="rounded-md bg-brand-gold/15 px-2.5 py-1.5 font-semibold text-brand-ink">
            Início
          </li>
          <li className="px-2.5 py-1.5">Encontros</li>
          <li className="px-2.5 py-1.5">Turmas</li>
          <li className="px-2.5 py-1.5">Catequizandos</li>
          <li className="px-2.5 py-1.5">Calendário</li>
          <li className="px-2.5 py-1.5">Mensagens</li>
        </ul>
      </aside>
      <div className="min-w-0 flex-1 p-4 sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <p className="font-brand-display text-lg font-semibold tracking-tight text-brand-ink sm:text-xl">
            Olá, catequista!
          </p>
          <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-emerald-700">
            Plano ativo
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-[1.25fr_0.75fr]">
          <div className="rounded-[10px] border border-border/70 bg-white p-4">
            <p className="text-[11px] font-semibold text-brand-ink">
              Próximo encontro
            </p>
            <div className="mt-3 rounded-md bg-muted/50 p-3">
              <p className="text-xs font-semibold text-brand-ink">
                Perdão e reconciliação
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                Domingo · 09:00 · Turma A
              </p>
            </div>
            <div className="mt-3 rounded-md bg-muted/50 p-3">
              <p className="text-xs font-semibold text-brand-ink">Preparação</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                Roteiro, dinâmica e oração prontos para revisar.
              </p>
            </div>
          </div>
          <div className="hidden gap-3 sm:grid">
            <div className="rounded-[10px] border border-border/70 bg-white p-4">
              <p className="text-[11px] font-semibold text-brand-ink">Turmas</p>
              <p className="mt-2 font-brand-display text-2xl font-semibold text-brand-ink">
                3
              </p>
            </div>
            <div className="rounded-[10px] border border-border/70 bg-white p-4">
              <p className="text-[11px] font-semibold text-brand-ink">
                Catequizandos
              </p>
              <p className="mt-2 font-brand-display text-2xl font-semibold text-brand-ink">
                22
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Compact phone chrome — kept for campaign overlays if needed. */
export function PhoneAttendanceMock() {
  return (
    <div
      className="overflow-hidden rounded-[1.35rem] border-[6px] border-brand-ink bg-white shadow-elevation-md"
      data-testid="hero-phone-mock"
    >
      <div className="flex items-center justify-between bg-brand-ink px-3 py-2 text-white">
        <p className="text-[10px] font-semibold tracking-tight">Chamada</p>
        <p className="text-[10px] text-white/70">1º Crisma</p>
      </div>
      <div className="space-y-1.5 p-2.5">
        {[
          { name: "Ana Souza", present: true },
          { name: "Pedro Lima", present: true },
          { name: "Sofia Reis", present: false },
          { name: "Lucas Melo", present: true },
        ].map((row) => (
          <div
            key={row.name}
            className="flex items-center justify-between rounded-sm bg-surface-subtle px-2 py-1.5"
          >
            <span className="text-[10px] font-medium text-brand-ink">
              {row.name}
            </span>
            <span
              className={`flex h-4 w-4 items-center justify-center rounded-full ${
                row.present ? "bg-emerald-100 text-emerald-700" : "bg-muted"
              }`}
            >
              {row.present ? (
                <Check className="h-2.5 w-2.5" aria-hidden />
              ) : null}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
