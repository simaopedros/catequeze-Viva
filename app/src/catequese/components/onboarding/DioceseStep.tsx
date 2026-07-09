import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../client/components/ui/button";
import { Input } from "../../../client/components/ui/input";
import { Label } from "../../../client/components/ui/label";
import { ArrowRight, Check, Search, X } from "lucide-react";
import {
  useQuery,
  searchDiocesesForOnboarding,
  createDiocese,
} from "wasp/client/operations";
import { useWikidataDioceses } from "../../../client/hooks/useWikidataDioceses";
import { BRAZILIAN_STATES } from "../../../client/hooks/useIbgeCities";
import { cn } from "../../../client/utils";

export interface DioceseSelection {
  id?: string;
  name: string;
  state?: string;
  wikidataId?: string;
  isNew?: boolean;
}

interface DioceseStepProps {
  selected: DioceseSelection | null;
  onSelect: (d: DioceseSelection) => void;
  onSkip: () => void;
  onContinue: () => void;
}

export function DioceseStep({
  selected,
  onSelect,
  onSkip,
  onContinue,
}: DioceseStepProps) {
  const { t } = useTranslation("onboarding");
  const { t: tc } = useTranslation("common");
  const [searchQuery, setSearchQuery] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const { data: dbDioceses = [], isLoading: loadingDb } = useQuery(
    searchDiocesesForOnboarding,
    { name: searchQuery, state: stateFilter },
  );

  const { dioceses: wikiDioceses, loading: loadingWiki } = useWikidataDioceses(
    stateFilter || undefined,
  );

  const filteredWiki = searchQuery
    ? wikiDioceses.filter((d: any) =>
        d.name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : wikiDioceses;

  const dbNames = new Set(dbDioceses.map((d: any) => d.name.toLowerCase()));
  const uniqueWiki = filteredWiki.filter(
    (d: any) => !dbNames.has(d.name.toLowerCase()),
  );
  const loading = loadingDb || loadingWiki;
  const shouldShowResults =
    stateFilter.trim().length > 0 || searchQuery.trim().length >= 2;

  const duplicateDiocese =
    newName.trim().length >= 3
      ? dbDioceses.find(
          (d: any) =>
            d.name.toLowerCase().includes(newName.trim().toLowerCase()) ||
            newName.trim().toLowerCase().includes(d.name.toLowerCase()),
        )
      : null;

  const handleSelectExisting = (d: {
    id: string;
    name: string;
    state?: string | null;
    wikidataId?: string | null;
  }) => {
    setError("");
    onSelect({
      id: d.id,
      name: d.name,
      state: d.state || stateFilter || undefined,
      wikidataId: d.wikidataId || undefined,
    });
  };

  const handleSelectWiki = (d: {
    wikidataId: string;
    name: string;
    state?: string;
  }) => {
    setError("");
    onSelect({
      name: d.name,
      state: d.state || stateFilter || undefined,
      wikidataId: d.wikidataId,
      isNew: false,
    });
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    setError("");
    try {
      const diocese = await createDiocese({
        name: newName.trim(),
        country: "BR",
      });
      if (diocese?.id) {
        setShowCreate(false);
        setNewName("");
        onSelect({
          id: diocese.id,
          name: diocese.name,
          state: stateFilter,
          isNew: true,
        });
      } else {
        setError(t("diocese.create_error"));
      }
    } catch (e: any) {
      setError(e.message || t("diocese.create_error_generic"));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-7">
      <div className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {t("diocese.progress_status")}
        </p>
        <h2
          className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem]"
          style={{ fontFamily: "var(--font-brand-display)" }}
        >
          {t("diocese.title")}
        </h2>
        <div className="h-px w-10 bg-[#D39A2B]" aria-hidden />
        <p className="text-sm leading-relaxed text-muted-foreground">
          {t("diocese.subtitle")}
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="diocese-state-filter" className="text-xs font-medium">
            {t("diocese.state_label")}
          </Label>
          <select
            id="diocese-state-filter"
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="flex h-11 w-full rounded-sm border border-input bg-background px-3 text-sm"
          >
            <option value="">{t("diocese.all_states")}</option>
            {BRAZILIAN_STATES.map((s) => (
              <option key={s.uf} value={s.uf}>
                {s.uf} — {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-11 rounded-sm pl-9 pr-10"
            placeholder={t("diocese.search_placeholder")}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      <div className="max-h-64 space-y-3 overflow-y-auto">
        {!shouldShowResults && (
          <div className="border border-border/70 px-4 py-4 rounded-sm">
            <p className="text-sm font-medium text-foreground">
              {t("diocese.start_hint_title")}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("diocese.start_hint_body")}
            </p>
          </div>
        )}

        {shouldShowResults && uniqueWiki.length > 0 && (
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {t("diocese.wiki_section")}
            </p>
            {uniqueWiki.map((d: any) => (
              <button
                key={d.wikidataId}
                type="button"
                onClick={() => handleSelectWiki(d)}
                className={cn(
                  "mb-1 flex w-full items-center gap-2 border px-3 py-2.5 text-left text-sm transition-colors rounded-sm",
                  selected?.wikidataId === d.wikidataId
                    ? "border-[#071A2D]/40 bg-muted/30"
                    : "border-border/70 hover:bg-muted/30",
                )}
              >
                <div className="min-w-0 flex-1">
                  <span className="font-medium">{d.name}</span>
                  {d.state && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({d.state})
                    </span>
                  )}
                </div>
                {selected?.wikidataId === d.wikidataId && (
                  <Check className="h-4 w-4 shrink-0 text-[#071A2D]" />
                )}
              </button>
            ))}
          </div>
        )}

        {shouldShowResults && dbDioceses.length > 0 && (
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {t("diocese.platform_section")}
            </p>
            {dbDioceses.map((d: any) => (
              <button
                key={d.id}
                type="button"
                onClick={() => handleSelectExisting(d)}
                className={cn(
                  "mb-1 flex w-full items-center gap-2 border px-3 py-2.5 text-left text-sm transition-colors rounded-sm",
                  selected?.id === d.id
                    ? "border-[#071A2D]/40 bg-muted/30"
                    : "border-border/70 hover:bg-muted/30",
                )}
              >
                <div className="min-w-0 flex-1">
                  <span className="font-medium">{d.name}</span>
                  {d.state && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({d.state})
                    </span>
                  )}
                </div>
                {d._count?.parishes != null && (
                  <span className="text-xs text-muted-foreground">
                    {t("diocese.parishes_count", { count: d._count.parishes })}
                  </span>
                )}
                {selected?.id === d.id && (
                  <Check className="h-4 w-4 shrink-0 text-[#071A2D]" />
                )}
              </button>
            ))}
          </div>
        )}

        {shouldShowResults &&
          !loading &&
          dbDioceses.length === 0 &&
          uniqueWiki.length === 0 && (
            <p className="py-2 text-center text-sm text-muted-foreground">
              {searchQuery
                ? t("diocese.empty_search")
                : t("diocese.empty_hint")}
            </p>
          )}
      </div>

      {!showCreate ? (
        <button
          type="button"
          onClick={() => {
            setShowCreate(true);
            setNewName(searchQuery);
          }}
          className="w-full border border-dashed border-border/80 px-3 py-2.5 text-left text-sm text-muted-foreground transition-colors rounded-sm hover:border-[#071A2D]/40 hover:text-foreground"
        >
          {t("diocese.create_link")}
        </button>
      ) : (
        <div className="space-y-3 border border-border/70 p-4 rounded-sm">
          <Label className="text-xs font-medium">
            {t("diocese.new_name_label")}
          </Label>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="h-11 rounded-sm"
            placeholder={t("diocese.new_name_placeholder")}
          />
          {duplicateDiocese && (
            <div className="border border-border/70 px-3 py-2 text-xs text-muted-foreground rounded-sm">
              {t("diocese.duplicate_warning")}{" "}
              <strong className="text-foreground">
                {duplicateDiocese.name}
              </strong>
              {duplicateDiocese.state && <> ({duplicateDiocese.state})</>}.
              <button
                type="button"
                onClick={() => {
                  handleSelectExisting(duplicateDiocese);
                  setShowCreate(false);
                  setNewName("");
                }}
                className="ml-2 font-medium text-foreground underline"
              >
                {t("diocese.use_this")}
              </button>
            </div>
          )}
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="rounded-sm"
              onClick={() => setShowCreate(false)}
            >
              {tc("cancel")}
            </Button>
            <Button
              size="sm"
              className="rounded-sm shadow-none"
              onClick={handleCreate}
              disabled={creating || !newName.trim()}
            >
              {creating ? t("diocese.creating") : t("diocese.create_btn")}
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 border-t border-border/70 pt-4">
        {selected ? (
          <>
            <p className="text-sm text-muted-foreground">
              {t("diocese.selection_ready", { name: selected.name })}
            </p>
            <Button
              onClick={onContinue}
              className="h-11 w-full rounded-sm shadow-none"
            >
              {t("diocese.continue_with_selection")}
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t("diocese.select_hint")}
          </p>
        )}
        <button
          type="button"
          onClick={onSkip}
          className="py-2 text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          {t("diocese.skip")}
        </button>
      </div>
    </div>
  );
}
