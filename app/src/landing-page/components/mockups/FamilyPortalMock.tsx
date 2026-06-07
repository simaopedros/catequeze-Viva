import { Bell, Calendar, CheckCircle2, FileUp, XCircle } from 'lucide-react';

export function FamilyPortalMock() {
  return (
    <div className="h-full overflow-hidden p-3 sm:p-4 space-y-3 bg-background text-[10px] sm:text-xs">
      <div>
        <p className="font-bold text-sm">Portal da Família</p>
        <p className="text-muted-foreground">Olá, Carlos — filhos: Ana e Pedro</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border bg-card p-2">
          <p className="text-muted-foreground mb-0.5">Ana Silva</p>
          <p className="font-semibold">1ª Eucaristia</p>
          <p className="text-success flex items-center gap-1 mt-1">
            <CheckCircle2 className="h-3 w-3" /> 92% presença
          </p>
        </div>
        <div className="rounded-lg border bg-card p-2">
          <p className="text-muted-foreground mb-0.5">Pedro Silva</p>
          <p className="font-semibold">Crisma</p>
          <p className="text-warning flex items-center gap-1 mt-1">
            <XCircle className="h-3 w-3" /> 1 falta recente
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-primary/20 bg-primary/5 p-2 flex items-start gap-2">
        <Bell className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium">Aviso da catequese</p>
          <p className="text-muted-foreground">Encontro especial no sábado às 14h — trazer material de artesanato.</p>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-2 space-y-2">
        <p className="font-semibold flex items-center gap-1">
          <Calendar className="h-3 w-3" /> Próximo encontro
        </p>
        <p>Pedro — Crisma · Sáb 19/03 · 19:30</p>
        <button type="button" className="text-primary font-medium underline underline-offset-2">
          Justificar falta
        </button>
      </div>

      <div className="rounded-lg border border-dashed bg-muted/20 p-2 flex items-center gap-2">
        <FileUp className="h-4 w-4 text-muted-foreground" />
        <div>
          <p className="font-medium">Enviar certidão de batismo</p>
          <p className="text-muted-foreground">Documento pendente para Ana</p>
        </div>
      </div>
    </div>
  );
}
