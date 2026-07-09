import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Search, ChevronRight, Check } from "lucide-react";
import { Button } from "../../../client/components/ui/button";

interface ParishSearchFormProps {
  parishes: { id: string; name: string }[];
  loading?: boolean;
  onNext: (parishId: string, parishName: string) => void;
  defaultSearch?: string;
  defaultSelected?: string;
}

export function ParishSearchForm({
  parishes,
  loading: loadingList = false,
  onNext,
  defaultSearch = "",
  defaultSelected = "",
}: ParishSearchFormProps) {
  const { t } = useTranslation("onboarding");
  const [searchQuery, setSearchQuery] = useState(defaultSearch);
  const [selectedId, setSelectedId] = useState(defaultSelected);

  const filtered = parishes.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleNext = () => {
    if (!selectedId) return;
    const parish = parishes.find((p) => p.id === selectedId);
    onNext(selectedId, parish?.name || "");
  };

  return (
    <div className="rounded-sm border border-border/70 bg-white p-6 space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Search className="h-5 w-5 text-[#071A2D]" />
        {t("parish_search.title")}
      </h2>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex h-10 w-full rounded-sm border border-input bg-background pl-9 pr-3 text-sm"
          placeholder={t("parish_search.search_placeholder")}
        />
      </div>
      {loadingList ? (
        <div className="text-sm text-muted-foreground py-4 text-center">
          {t("parish_search.loading")}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-muted-foreground py-4 text-center">
          {t("parish_search.empty")}
        </div>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedId(p.id)}
              className={`flex w-full items-center gap-2 rounded-sm border border-border/70 px-4 py-3 text-left text-sm transition-colors ${
                selectedId === p.id
                  ? "border-[#071A2D] bg-muted/30"
                  : "hover:bg-muted/30"
              }`}
            >
              <span className="flex-1">{p.name}</span>
              {selectedId === p.id && (
                <Check className="h-4 w-4 text-[#071A2D]" />
              )}
            </button>
          ))}
        </div>
      )}
      <div className="flex justify-end">
        <Button onClick={handleNext} disabled={!selectedId}>
          {t("parish_search.next")} <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
