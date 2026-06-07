import { BookOpen, FileText, Search, ScrollText } from 'lucide-react';

export function LibraryMock() {
  return (
    <div className="h-full overflow-hidden p-3 sm:p-4 space-y-3 bg-background text-[10px] sm:text-xs">
      <div>
        <p className="font-bold text-sm">Biblioteca Pastoral</p>
        <p className="text-muted-foreground">Recursos teológicos integrados</p>
      </div>

      <div className="flex gap-1 rounded-lg border bg-muted/30 p-1">
        {[
          { label: 'Bíblia', icon: BookOpen, active: true },
          { label: 'Catecismo', icon: ScrollText, active: false },
          { label: 'Diretório', icon: FileText, active: false },
        ].map((tab) => (
          <button
            key={tab.label}
            type="button"
            className={`flex-1 flex items-center justify-center gap-1 rounded-md py-1.5 text-[9px] font-medium ${
              tab.active ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'
            }`}
          >
            <tab.icon className="h-3 w-3" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
        <div className="rounded-lg border bg-card pl-7 pr-3 py-2 text-muted-foreground">
          Buscar em Jo 3:16, amor, Eucaristia...
        </div>
      </div>

      <div className="rounded-lg border bg-card p-3 space-y-2">
        <p className="font-semibold text-primary">João 3:16</p>
        <p className="leading-relaxed text-muted-foreground italic">
          "Porque Deus amou tanto o mundo, que deu o seu Filho unigênito..."
        </p>
        <div className="flex flex-wrap gap-1 pt-1">
          {['CIC §133', 'Dir. Cateq. 98', 'Plano Encontro 12'].map((ref) => (
            <span key={ref} className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[9px]">
              {ref}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-lg border bg-card p-2">
        <p className="font-medium mb-1">Plano: O amor de Deus</p>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-success/10 text-success px-2 py-0.5 text-[9px]">Publicado</span>
          <span className="text-muted-foreground">Crisma · 45 min</span>
        </div>
      </div>
    </div>
  );
}
