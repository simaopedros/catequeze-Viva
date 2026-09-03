import { AttendanceMock } from "./AttendanceMock";
import { BrandMark } from "../../../client/components/brand/Brand";

/**
 * Hero product visual: chrome that matches the logged-in app
 * (sidebar + top bar identity + attendance), not the retired Copiloto screenshot.
 */
export function AppProductMock({ ns = "landing" }: { ns?: string }) {
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
          <li className="rounded-sm bg-brand-ink/8 px-2 py-1.5 font-semibold">
            Turmas
          </li>
          <li className="px-2 py-1.5 text-muted-foreground">Agenda</li>
          <li className="px-2 py-1.5 text-muted-foreground">Mensagens</li>
        </ul>
      </aside>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between border-b border-border/70 bg-white px-3 py-2">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1 rounded-sm bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-800">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-500" aria-hidden />
              Pessoal
            </span>
            <p className="truncate text-xs font-semibold tracking-tight text-brand-ink">
              Minha turma
            </p>
          </div>
          <p className="shrink-0 text-[11px] text-muted-foreground">
            Plano Catequista
          </p>
        </div>
        <AttendanceMock ns={ns} />
      </div>
    </div>
  );
}
