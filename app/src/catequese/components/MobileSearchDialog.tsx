import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BookMarked,
  FileText,
  FolderOpen,
  GraduationCap,
  Library,
  Loader2,
  Search,
  ScrollText,
  Users,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "../../client/components/ui/dialog";
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

interface MobileSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  query: string;
  onQueryChange: (query: string) => void;
  results: any[];
  isLoading: boolean;
  onSelect: (route: string) => void;
}

export function MobileSearchDialog({
  open,
  onOpenChange,
  query,
  onQueryChange,
  results,
  isLoading,
  onSelect,
}: MobileSearchDialogProps) {
  const { t } = useTranslation("topbar");
  const { t: tNav } = useTranslation("navigation");
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const grouped = useMemo(
    () =>
      results.reduce<Record<string, any[]>>((acc, result: any) => {
        (acc[result.module] ??= []).push(result);
        return acc;
      }, {}),
    [results],
  );
  const modules = Object.keys(grouped);
  const flatResults = modules.flatMap((module) => grouped[module]);

  const selectResult = (route: string) => {
    onSelect(route);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="lg:hidden"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          inputRef.current?.focus();
        }}
      >
        <DialogTitle className="sr-only">{t("search")}</DialogTitle>
        <div className="sticky top-0 z-10 -mx-4 -mt-4 border-b border-border/70 bg-white px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top,0px))]">
          <div className="mr-12 flex h-12 items-center gap-2 rounded-sm border border-input bg-background px-3 focus-within:ring-2 focus-within:ring-brand-ink/25">
            <Search
              className="h-5 w-5 shrink-0 text-muted-foreground"
              aria-hidden
            />
            <input
              ref={inputRef}
              type="search"
              inputMode="search"
              autoComplete="off"
              value={query}
              onChange={(event) => {
                onQueryChange(event.target.value);
                setSelectedIndex(0);
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setSelectedIndex((index) =>
                    Math.min(index + 1, flatResults.length - 1),
                  );
                }
                if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setSelectedIndex((index) => Math.max(index - 1, 0));
                }
                if (event.key === "Enter" && flatResults[selectedIndex]) {
                  event.preventDefault();
                  selectResult(flatResults[selectedIndex].route);
                }
              }}
              placeholder={t("searchPlaceholder")}
              aria-label={t("search")}
              aria-controls="mobile-search-results"
              className="min-w-0 flex-1 border-0 bg-transparent text-base outline-none placeholder:text-muted-foreground"
            />
            {isLoading && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
            {query && !isLoading && (
              <button
                type="button"
                onClick={() => onQueryChange("")}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-brand-ink"
                aria-label={t("clearSearch")}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div
          id="mobile-search-results"
          className="min-h-0 overflow-y-auto"
          role="status"
          aria-live="polite"
          aria-busy={isLoading}
        >
          {query.length < 3 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              {t("searchFocusHint")}
            </p>
          ) : !isLoading && flatResults.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              {t("noResults")}
            </p>
          ) : (
            <div className="space-y-4 py-3">
              {modules.map((module) => {
                const Icon = MODULE_ICONS[module] ?? Search;
                return (
                  <section key={module} aria-labelledby={`search-${module}`}>
                    <h2
                      id={`search-${module}`}
                      className="flex items-center gap-2 bg-muted/50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground"
                    >
                      <Icon className="h-4 w-4" aria-hidden />
                      {tNav(`search_module.${module}`, {
                        defaultValue: module,
                      })}
                    </h2>
                    {grouped[module].map((item: any) => {
                      const index = flatResults.indexOf(item);
                      return (
                        <button
                          type="button"
                          key={`${item.type}-${item.id}`}
                          onClick={() => selectResult(item.route)}
                          className={cn(
                            "flex min-h-14 w-full items-start gap-3 rounded-sm px-3 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            selectedIndex === index
                              ? "bg-accent"
                              : "hover:bg-muted/50",
                          )}
                        >
                          <Icon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-brand-ink">
                              {item.label}
                            </span>
                            {item.description && (
                              <span className="block truncate text-sm text-muted-foreground">
                                {item.description}
                              </span>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
