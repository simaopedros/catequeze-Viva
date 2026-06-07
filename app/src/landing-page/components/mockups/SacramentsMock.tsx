import { CheckCircle2, Circle, Cross } from 'lucide-react';

const MILESTONES = [
  { label: 'Inscrição', done: true },
  { label: 'Documentos', done: true },
  { label: 'Retiro', done: true },
  { label: 'Entrevista', done: false },
  { label: 'Celebração', done: false },
];

export function SacramentsMock() {
  return (
    <div className="h-full overflow-hidden p-3 sm:p-4 space-y-3 bg-background text-[10px] sm:text-xs">
      <div>
        <p className="font-bold text-sm">Jornada Sacramental</p>
        <p className="text-muted-foreground">Primeira Eucaristia · 2026</p>
      </div>

      <div className="rounded-lg border bg-card p-3">
        <div className="flex items-center gap-2 mb-3">
          <div className="rounded-full bg-primary/10 p-1.5">
            <Cross className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-semibold">Maria Oliveira</p>
            <p className="text-muted-foreground">Turma 1ª Eucaristia — Comunidade São José</p>
          </div>
        </div>

        <div className="relative flex items-center justify-between px-1">
          <div className="absolute left-4 right-4 top-1/2 h-0.5 bg-border -translate-y-1/2" />
          {MILESTONES.map((m) => (
            <div key={m.label} className="relative flex flex-col items-center gap-1 z-10">
              {m.done ? (
                <CheckCircle2 className="h-5 w-5 text-primary bg-background" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground bg-background" />
              )}
              <span className={`text-[8px] text-center max-w-[48px] ${m.done ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                {m.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[
          { name: 'João P.', progress: '4/5', pct: 80 },
          { name: 'Sofia R.', progress: '5/5', pct: 100 },
          { name: 'Lucas M.', progress: '2/5', pct: 40 },
          { name: 'Beatriz L.', progress: '3/5', pct: 60 },
        ].map((c) => (
          <div key={c.name} className="rounded-lg border bg-card p-2">
            <div className="flex justify-between mb-1">
              <span className="font-medium">{c.name}</span>
              <span className="text-muted-foreground">{c.progress}</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-primary" style={{ width: `${c.pct}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
