import { useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Search,
  X,
  Loader2,
  Users,
  GraduationCap,
  ScrollText,
  BookMarked,
  FileText,
  Library,
  FolderOpen,
} from "lucide-react";
import { cn } from "../../client/utils";

const MODULE_ICONS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  catechumen: Users,
  class: GraduationCap,
  content: Library,
  bible: BookMarked,
  catechism: ScrollText,
  directory: FolderOpen,
  family: Users,
  sacrament: ScrollText,
  document: FileText,
  parish: Users,
  community: Users,
};

interface SearchSheetProps {
  open: boolean;
  onClose: () => void;
  query: string;
  onQueryChange: (q: string) => void;
  results: any[];
  isLoading: boolean;
  onSelect: (route: string) => void;
  currentLocale: string;
}

export function SearchSheet({
  open,
  onClose,
  query,
  onQueryChange,
  results,
  isLoading,
  onSelect,
  currentLocale,
}: SearchSheetProps) {
  const { t } = useTranslation("topbar");
  const { t: tNav } = useTranslation("navigation");
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedIndex = useRef(0);

  // Auto-focus input when sheet opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const getModuleLabel = (module: string) => {
    return tNav(`search_module.${module}`, { defaultValue: module });
  };

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
      onSelect(route);
    },
    [onSelect],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (flatResults.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      selectedIndex.current = Math.min(
        selectedIndex.current + 1,
        flatResults.length - 1,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      selectedIndex.current = Math.max(selectedIndex.current - 1, 0);
    } else if (e.key === "Enter" && flatResults[selectedIndex.current]) {
      e.preventDefault();
      handleSelect(flatResults[selectedIndex.current].route);
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 lg:hidden"
        onClick={onClose}
      />

      {/* Sheet from top (search is a header-level action) */}
      <div className="fixed inset-x-0 top-0 z-50 max-h-[85vh] overflow-y-auto rounded-b-sm border-b border-border/70 bg-white transition-transform duration-300 lg:hidden">
        {/* Search input */}
        <div className="sticky top-0 border-b border-border/70 bg-white pt-3 pb-2 px-4 border-b">
          <div className="flex h-10 items-center gap-2 rounded-sm border border-input bg-background px-3 focus-within:border-brand-ink/50 focus-within:ring-1 focus-within:ring-brand-ink/20">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                onQueryChange(e.target.value);
                selectedIndex.current = 0;
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") onClose();
                handleKeyDown(e);
              }}
              placeholder={t("searchPlaceholder")}
              aria-label={t("searchPlaceholder")}
              className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-text-tertiary"
            />
            {isLoading && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
            )}
            {query && (
              <button
                onClick={() => onQueryChange("")}
                className="text-muted-foreground hover:text-brand-ink shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="absolute right-4 top-3.5 text-muted-foreground hover:text-brand-ink"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Results */}
        <div className="px-2 pb-4">
          {query.length < 2 ? (
            <div className="py-12 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-sm border border-border/70 bg-muted/30">
                <Search className="h-6 w-6 text-brand-ink" />
              </div>
              <p className="text-sm text-muted-foreground">
                {t("searchFocusHint")}
              </p>
            </div>
          ) : flatResults.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-sm border border-border/70 bg-muted/30">
                <Search className="h-6 w-6 text-brand-ink" />
              </div>
              <p className="text-sm text-muted-foreground">{t("noResults")}</p>
            </div>
          ) : (
            <div className="space-y-3 py-2">
              {moduleNames.map((module) => {
                const Icon = MODULE_ICONS[module] || Search;
                return (
                  <div key={module}>
                    <div className="flex items-center gap-2 rounded-sm bg-muted/40 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      <Icon className="h-3 w-3" />
                      {getModuleLabel(module)}
                    </div>
                    {grouped[module].map((item: any) => {
                      const globalIdx = flatResults.indexOf(item);
                      const isSelected = globalIdx === selectedIndex.current;
                      return (
                        <button
                          key={`${item.type}-${item.id}`}
                          onClick={() => handleSelect(item.route)}
                          className={cn(
                            "w-full text-left px-3 py-2.5 flex items-start gap-3 rounded-sm transition-colors",
                            isSelected ? "bg-accent" : "hover:bg-muted/50",
                          )}
                        >
                          <Icon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold tracking-tight text-brand-ink">
                              {item.label}
                            </p>
                            {item.description && (
                              <p className="text-xs text-muted-foreground truncate">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
