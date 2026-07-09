import { useTranslation } from "react-i18next";
import { useState, useMemo } from "react";
import { Search } from "lucide-react";

interface ContentItem {
  id: string;
  title: string;
  theme?: string;
  pastoralObjective?: string;
  status?: string;
}

interface ContentSelectorProps {
  items: ContentItem[];
  selectedId?: string;
  onSelect: (id: string | null) => void;
  placeholder?: string;
}

export function ContentSelector({
  items,
  selectedId,
  onSelect,
  placeholder = "Selecionar conteúdo...",
}: ContentSelectorProps) {
  const { t } = useTranslation("common");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!search) return items.slice(0, 20);
    const q = search.toLowerCase();
    return items
      .filter(
        (c) =>
          c.title?.toLowerCase().includes(q) ||
          c.theme?.toLowerCase().includes(q),
      )
      .slice(0, 20);
  }, [items, search]);

  const selected = items.find((c) => c.id === selectedId);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-9 w-full items-center justify-between rounded-sm border border-input bg-background px-3 py-1 text-sm text-left"
      >
        <span className={selected ? "" : "text-muted-foreground"}>
          {selected ? selected.title : placeholder}
        </span>
        <span className="text-xs text-muted-foreground">▼</span>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-sm border border-border/70 bg-white">
          <div className="flex items-center border-b px-3 py-2">
            <Search className="h-3.5 w-3.5 text-muted-foreground mr-2" />
            <input
              placeholder={t("search") || "Buscar..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none"
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {selectedId && (
              <button
                type="button"
                onClick={() => {
                  onSelect(null);
                  setOpen(false);
                }}
                className="w-full px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted italic"
              >
                Nenhum (desvincular)
              </button>
            )}
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-sm text-muted-foreground text-center">
                Nenhum conteúdo encontrado.
              </p>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    onSelect(c.id);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-muted ${
                    c.id === selectedId
                      ? "bg-muted/40 font-semibold text-[#071A2D]"
                      : ""
                  }`}
                >
                  <span
                    className={
                      c.id === selectedId
                        ? "tracking-tight"
                        : undefined
                    }
                    style={
                      c.id === selectedId
                        ? { fontFamily: "var(--font-brand-display)" }
                        : undefined
                    }
                  >
                    {c.title}
                  </span>
                  {c.theme && (
                    <span className="text-xs text-muted-foreground ml-2">
                      — {c.theme}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Backdrop to close */}
      {open && (
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
      )}
    </div>
  );
}
