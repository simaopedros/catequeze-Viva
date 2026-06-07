import { AlertCircle, BookOpen, Calendar, Clock, Cross, Gift, TrendingUp, Users } from 'lucide-react';

export function DashboardMock() {
  return (
    <div className="h-full overflow-hidden p-3 sm:p-4 space-y-3 bg-background text-[10px] sm:text-xs">
      <div>
        <p className="font-bold text-sm">Painel</p>
        <p className="text-muted-foreground">Visão geral da catequese</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[
          { l: 'Catequizandos', v: '142', i: Users, c: 'text-primary bg-primary/10' },
          { l: 'Turmas ativas', v: '8', i: BookOpen, c: 'text-success bg-success/10' },
          { l: 'Presença média', v: '87%', i: TrendingUp, c: 'text-warning bg-warning/10' },
          { l: 'Sacramentos', v: '12', i: Cross, c: 'text-secondary-foreground bg-secondary' },
        ].map((k) => (
          <div key={k.l} className="rounded-lg border bg-card p-2 shadow-sm">
            <div className="flex items-center gap-2">
              <div className={`rounded-md p-1 ${k.c}`}>
                <k.i className="h-3 w-3" />
              </div>
              <div>
                <p className="text-[9px] text-muted-foreground uppercase">{k.l}</p>
                <p className="font-bold text-sm">{k.v}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-2">
          <p className="font-semibold text-primary flex items-center gap-1 mb-1">
            <Clock className="h-3 w-3" /> Hoje
          </p>
          <p className="font-medium">Crisma — Turma A</p>
          <p className="text-muted-foreground">19:30 · 18 inscritos</p>
        </div>
        <div className="rounded-lg border bg-card p-2">
          <p className="font-semibold text-muted-foreground flex items-center gap-1 mb-1">
            <Calendar className="h-3 w-3" /> Próximos
          </p>
          <p className="font-medium">1ª Eucaristia</p>
          <p className="text-muted-foreground">Sáb, 14:00</p>
        </div>
      </div>

      <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-2 flex items-start gap-2">
        <AlertCircle className="h-3 w-3 text-destructive flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-destructive">3 alertas pastorais</p>
          <p className="text-muted-foreground">Faltas consecutivas · docs pendentes</p>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-2">
        <p className="font-semibold text-muted-foreground flex items-center gap-1 mb-1">
          <Gift className="h-3 w-3 text-pink-500" /> Aniversariantes
        </p>
        <p>Lucas M. · Sofia R. · Pedro A.</p>
      </div>
    </div>
  );
}
