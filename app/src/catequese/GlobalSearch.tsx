import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useQuery, globalSearch } from 'wasp/client/operations';
import { Search, BookMarked, Users, GraduationCap, Home, ScrollText, Library, FileText, Church, Building2, FolderOpen, X, CornerDownLeft } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogOverlay,
} from '../client/components/ui/dialog';

const MODULE_ICONS: Record<string, React.ComponentType<any>> = {
  Catequizandos: Users,
  Turmas: GraduationCap,
  Biblioteca: Library,
  Bíblia: BookMarked,
  Catecismo: ScrollText,
  Diretório: FolderOpen,
  Famílias: Home,
  Sacramentos: Church,
  Documentos: FileText,
  Paróquias: Church,
  Comunidades: Building2,
};

function getModuleIcon(type: string) {
  const iconMap: Record<string, string> = {
    catechumen: 'Catequizandos',
    class: 'Turmas',
    content: 'Biblioteca',
    bible: 'Bíblia',
    catechism: 'Catecismo',
    directory: 'Diretório',
    family: 'Famílias',
    sacrament: 'Sacramentos',
    document: 'Documentos',
    parish: 'Paróquias',
    community: 'Comunidades',
  };
  return iconMap[type] || '';
}

interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
}

export function GlobalSearch({ open, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation('common');
  const navigate = useNavigate();

  // Debounce query
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 200);
    return () => clearTimeout(timer);
  }, [query]);

  // Reset state on open
  useEffect(() => {
    if (open) {
      setQuery('');
      setDebouncedQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const { data: results = [], isLoading } = useQuery(
    globalSearch,
    { query: debouncedQuery },
    { enabled: debouncedQuery.length >= 2 }
  );

  // Group results by module
  const grouped = results.reduce<Record<string, any[]>>((acc, r: any) => {
    if (!acc[r.module]) acc[r.module] = [];
    acc[r.module].push(r);
    return acc;
  }, {});

  const moduleNames = Object.keys(grouped);
  const flatResults = moduleNames.flatMap((m) => grouped[m]);

  const handleSelect = useCallback(
    (route: string) => {
      navigate(route);
      onClose();
    },
    [navigate, onClose]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, flatResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && flatResults[selectedIndex]) {
      e.preventDefault();
      handleSelect(flatResults[selectedIndex].route);
    }
  };

  // Global keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (open) {
          onClose();
        } else {
          // Trigger open via the parent by calling onClose with a toggle pattern
          // We dispatch a custom event that TopBar listens to
          window.dispatchEvent(new CustomEvent('toggle-global-search'));
        }
      }
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const showEmpty = !isLoading && debouncedQuery.length >= 2 && flatResults.length === 0;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogOverlay className="bg-background/80 backdrop-blur-sm" />
      <DialogContent
        className="sm:max-w-xl p-0 gap-0 overflow-hidden border-muted-foreground/20"
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b">
          <Search className="h-5 w-5 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder={t('global_search_placeholder') || 'Buscar...'}
            className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground/60"
          />
          {query && (
            <button
              onClick={() => { setQuery(''); inputRef.current?.focus(); }}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded-md border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
            <CornerDownLeft className="h-3 w-3" />
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {isLoading && (
            <div className="px-4 py-8 text-center">
              <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-xs text-muted-foreground mt-2">Buscando...</p>
            </div>
          )}

          {showEmpty && (
            <div className="px-4 py-8 text-center">
              <Search className="mx-auto h-6 w-6 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">Nenhum resultado</p>
              <p className="text-xs text-muted-foreground/60">Tente outros termos.</p>
            </div>
          )}

          {debouncedQuery.length < 2 && (
            <div className="px-4 py-8 text-center">
              <Search className="mx-auto h-6 w-6 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">Digite ao menos 2 caracteres</p>
            </div>
          )}

          {moduleNames.map((module) => {
            const Icon = MODULE_ICONS[module] || Search;
            return (
              <div key={module}>
                <div className="flex items-center gap-2 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 bg-muted/30 border-y">
                  <Icon className="h-3.5 w-3.5" />
                  {module}
                  <span className="ml-auto font-normal">{grouped[module].length}</span>
                </div>
                {grouped[module].map((item: any, idx: number) => {
                  const globalIdx = flatResults.indexOf(item);
                  const isSelected = globalIdx === selectedIndex;
                  return (
                    <button
                      key={`${item.type}-${item.id}`}
                      onClick={() => handleSelect(item.route)}
                      className={`w-full text-left px-4 py-2.5 flex items-start gap-3 transition-colors ${
                        isSelected
                          ? 'bg-accent'
                          : 'hover:bg-muted/30'
                      }`}
                      onMouseEnter={() => setSelectedIndex(globalIdx)}
                    >
                      <div className="shrink-0 mt-0.5">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{item.label}</p>
                        <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground/50 shrink-0 hidden sm:inline mt-0.5">
                        {module}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Footer hint */}
        {flatResults.length > 0 && (
          <div className="flex items-center gap-4 px-4 py-2 border-t text-[10px] text-muted-foreground/60">
            <span className="flex items-center gap-1">
              <kbd className="rounded border px-1 py-0.5 text-[9px] font-mono">↑↓</kbd> navegar
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border px-1 py-0.5 text-[9px] font-mono">↵</kbd> abrir
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border px-1 py-0.5 text-[9px] font-mono">Esc</kbd> fechar
            </span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function useGlobalSearch() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = () => setOpen((prev) => !prev);
    window.addEventListener('toggle-global-search', handler);
    return () => window.removeEventListener('toggle-global-search', handler);
  }, []);

  return { open, onClose: () => setOpen(false), onOpen: () => setOpen(true) } as const;
}
