import {
  Calendar,
  ChevronRight,
  ClipboardList,
  LayoutDashboard,
  MessageSquareText,
} from "lucide-react";
import { BrandMark } from "../../../client/components/brand/Brand";

/**
 * Hero product visual: chrome that matches the logged-in app
 * (Painel + Calendário + próximas ações), not legacy Turmas/Agenda mock.
 */
export function AppProductMock({ ns = "landing" }: { ns?: string }) {
  void ns;
  return (
    <div
      className="flex min-h-[280px] overflow-hidden bg-surface-subtle text-left"
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
        <div className="space-y-3 p-3 sm:p-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Próximas ações
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              O que precisa da sua atenção hoje
            </p>
          </div>
          <div className="space-y-2">
            {[
              {
                title: "Preparar encontro de domingo",
                meta: "1º Crisma · sábado 19h",
                icon: ClipboardList,
                tone: "border-brand-gold/35 bg-brand-gold/8",
              },
              {
                title: "Ver calendário da turma",
                meta: "3 encontros neste mês",
                icon: Calendar,
                tone: "border-border/70 bg-white",
              },
            ].map((item) => (
              <div
                key={item.title}
                className={`flex items-center gap-2 rounded-sm border px-2.5 py-2 ${item.tone}`}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm bg-brand-ink/8 text-brand-ink">
                  <item.icon className="h-3.5 w-3.5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-brand-ink">
                    {item.title}
                  </p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {item.meta}
                  </p>
                </div>
                <ChevronRight
                  className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                  aria-hidden
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
