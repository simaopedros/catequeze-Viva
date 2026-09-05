import {
  Calendar,
  Check,
  ChevronRight,
  ClipboardList,
  LayoutDashboard,
  MessageSquareText,
  Users,
} from "lucide-react";
import { BrandMark } from "../../../client/components/brand/Brand";

/**
 * Hero product visual: chrome that matches the logged-in app
 * (Painel + próximo encontro, presença, mensagens, calendário).
 */
export function AppProductMock({ ns = "landing" }: { ns?: string }) {
  void ns;
  return (
    <div
      className="flex min-h-[300px] overflow-hidden bg-surface-subtle text-left"
      data-testid="app-product-mock"
    >
      <aside className="hidden w-[9.5rem] shrink-0 border-r border-border/70 bg-white p-3 sm:block">
        <div className="mb-4 flex items-center gap-2">
          <BrandMark className="h-7 w-7" />
          <div className="min-w-0">
            <p className="truncate font-brand-display text-xs font-semibold tracking-tight text-brand-ink">
              Catequese
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand-gold-muted">
              Viva
            </p>
          </div>
        </div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Operação
        </p>
        <ul className="space-y-1 text-xs text-brand-ink">
          <li className="flex items-center gap-1.5 rounded-sm bg-brand-ink/8 px-2 py-1.5 font-semibold">
            <LayoutDashboard className="h-3 w-3 shrink-0" aria-hidden />
            Painel
          </li>
          <li className="flex items-center gap-1.5 px-2 py-1.5 text-muted-foreground">
            <Calendar className="h-3 w-3 shrink-0" aria-hidden />
            Calendário
          </li>
          <li className="flex items-center gap-1.5 px-2 py-1.5 text-muted-foreground">
            <Users className="h-3 w-3 shrink-0" aria-hidden />
            Presenças
          </li>
          <li className="flex items-center gap-1.5 px-2 py-1.5 text-muted-foreground">
            <MessageSquareText className="h-3 w-3 shrink-0" aria-hidden />
            Mensagens
          </li>
        </ul>
      </aside>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between border-b border-border/70 bg-white px-3 py-2">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1 rounded-sm bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-800">
              <span
                className="h-1.5 w-1.5 rounded-full bg-sky-500"
                aria-hidden
              />
              Pessoal
            </span>
            <p className="truncate text-xs font-semibold tracking-tight text-brand-ink">
              Painel da catequese
            </p>
          </div>
          <p className="shrink-0 text-[11px] text-muted-foreground">
            Plano Catequista
          </p>
        </div>
        <div className="grid gap-3 p-3 sm:grid-cols-2 sm:p-4">
          <div className="rounded-sm border border-brand-gold/35 bg-brand-gold/8 p-3 sm:col-span-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Próximo encontro
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-white text-brand-ink">
                <ClipboardList className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-brand-ink">
                  O perdão — 1º Crisma
                </p>
                <p className="truncate text-[10px] text-muted-foreground">
                  Domingo 19h · 14 catequizandos
                </p>
              </div>
              <ChevronRight
                className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                aria-hidden
              />
            </div>
          </div>

          <div className="rounded-sm border border-border/70 bg-white p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Presenças
            </p>
            <p className="mt-1.5 font-brand-display text-lg font-semibold text-brand-ink">
              12 / 14
            </p>
            <p className="text-[10px] text-muted-foreground">
              Último encontro · 2 faltas
            </p>
          </div>

          <div className="rounded-sm border border-border/70 bg-white p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Mensagens
            </p>
            <p className="mt-1.5 text-xs font-semibold text-brand-ink">
              Aviso às famílias
            </p>
            <p className="truncate text-[10px] text-muted-foreground">
              Encontro especial no domingo
            </p>
          </div>

          <div className="rounded-sm border border-border/70 bg-white p-3 sm:col-span-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Calendário
            </p>
            <div className="mt-2 flex gap-2 overflow-hidden">
              {["Dom 12", "Dom 19", "Dom 26"].map((day, index) => (
                <div
                  key={day}
                  className={`min-w-0 flex-1 rounded-sm border px-2 py-1.5 text-center ${
                    index === 1
                      ? "border-brand-ink/20 bg-brand-ink/8"
                      : "border-border/60 bg-muted/20"
                  }`}
                >
                  <p className="text-[10px] font-semibold text-brand-ink">
                    {day}
                  </p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {index === 1 ? "Encontro" : "Turma"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Compact phone chrome for the hero overlay — attendance at the meeting. */
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
