import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../client/components/ui/button";
import { Input } from "../../../client/components/ui/input";
import { Label } from "../../../client/components/ui/label";
import { ArrowRight, Check, Search } from "lucide-react";
import {
  useQuery,
  searchParishesForOnboarding,
  createParish,
} from "wasp/client/operations";
import {
  useOsmParishes,
  type OsmParish,
} from "../../../client/hooks/useOsmParishes";
import CityStateSelect from "../../../client/components/CityStateSelect";
import type { DioceseSelection } from "./DioceseStep";
import { cn } from "../../../client/utils";
import {
  AppEyebrow,
  AppDisplayTitle,
  AppGoldRule,
} from "../../../client/components/brand/AppChrome";

export interface ParishSelection {
  id?: string;
  name: string;
  city?: string;
  state?: string;
  osmId?: string | null;
  isNew?: boolean;
}

interface ParishStepProps {
  diocese: DioceseSelection | null;
  selected: ParishSelection | null;
  onSelect: (p: ParishSelection) => void;
  initialState?: string;
  onContinue: () => void;
}

export function ParishStep({
  diocese,
  selected,
  onSelect,
  initialState,
  onContinue,
}: ParishStepProps) {
  const { t } = useTranslation("onboarding");
  const { t: tc } = useTranslation("common");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchCity, setSearchCity] = useState("");
  const [searchState, setSearchState] = useState(initialState || "");
  const [selectedDbId, setSelectedDbId] = useState("");
  const [selectedOsm, setSelectedOsm] = useState<OsmParish | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const { data: dbParishes = [] } = useQuery(searchParishesForOnboarding, {
    name: searchQuery,
    city: searchCity,
    state: searchState,
  });
  const { parishes: osmParishes, loading: loadingOsm } = useOsmParishes(
    searchCity,
    searchState,
  );

  const dbOsmIds = new Set(
    dbParishes.filter((p: any) => p.osmId).map((p: any) => p.osmId),
  );
  const uniqueOsm = osmParishes.filter((o: any) => !dbOsmIds.has(o.osmId));
  const shouldShowResults = Boolean(
    searchCity || searchState || searchQuery.trim().length >= 2,
  );

  const duplicateParish =
    newName.trim().length >= 3
      ? dbParishes.find(
          (p: any) =>
            p.name.toLowerCase().includes(newName.trim().toLowerCase()) ||
            newName.trim().toLowerCase().includes(p.name.toLowerCase()),
        )
      : null;

  const handleDbSelect = (p: any) => {
    setSelectedDbId(p.id);
    setSelectedOsm(null);
    onSelect({
      id: p.id,
      name: p.name,
      city: p.city,
      state: p.state,
      osmId: p.osmId,
    });
  };

  const handleOsmSelect = (op: OsmParish) => {
    setSelectedOsm(op);
    setSelectedDbId("");
    onSelect({
      name: op.name,
      city: op.city,
      state: op.state,
      osmId: op.osmId,
    });
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    setError("");
    try {
      const result = await createParish({
        name: newName.trim(),
        city: searchCity || undefined,
        state: searchState || undefined,
        dioceseId: diocese?.id,
      });
      if (result?.existingParishId) {
        onSelect({
          id: result.id,
          name: newName.trim(),
          city: searchCity,
          state: searchState,
          isNew: false,
        });
        return;
      }
      if (result?.id) {
        onSelect({
          id: result.id,
          name: newName.trim(),
          city: searchCity,
          state: searchState,
          isNew: true,
        });
      }
    } catch (e: any) {
      setError(e.message || t("parish.create_error"));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-7">
      <div className="space-y-3">
        <AppEyebrow>{t("parish.progress_status")}</AppEyebrow>
        <AppDisplayTitle as="h2">{t("parish.title")}</AppDisplayTitle>
        <AppGoldRule />
        <p className="text-sm leading-relaxed text-muted-foreground">
          {t("parish.subtitle")}
        </p>
      </div>

      {diocese && (
        <div className="border border-border/70 px-4 py-3 rounded-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {t("parish.diocese_context_label")}
          </p>
          <p
            className="mt-0.5 text-sm font-semibold tracking-tight text-[#071A2D]"
            style={{ fontFamily: "var(--font-brand-display)" }}
          >
            {diocese.name}
            {diocese.state ? ` (${diocese.state})` : ""}
          </p>
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">
            {t("parish.city_state")}
          </Label>
          <CityStateSelect
            city={searchCity}
            state={searchState}
            onCityChange={(c) => {
              setSearchCity(c);
              setSelectedDbId("");
              setSelectedOsm(null);
            }}
            onStateChange={(s) => {
              setSearchState(s);
              setSelectedDbId("");
              setSelectedOsm(null);
            }}
          />
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-11 rounded-sm pl-9"
            placeholder={t("parish.filter_placeholder")}
          />
        </div>
      </div>

      <div className="max-h-64 space-y-3 overflow-y-auto">
        {!shouldShowResults && (
          <div className="border border-border/70 px-4 py-4 rounded-sm">
            <p
              className="text-sm font-semibold tracking-tight text-[#071A2D]"
              style={{ fontFamily: "var(--font-brand-display)" }}
            >
              {t("parish.start_hint_title")}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("parish.start_hint_body")}
            </p>
          </div>
        )}

        {shouldShowResults && dbParishes.length > 0 && (
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {t("parish.platform_section")}
            </p>
            {dbParishes.map((p: any) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleDbSelect(p)}
                className={cn(
                  "mb-1 flex w-full items-center gap-2 border px-3 py-2.5 text-left text-sm transition-colors rounded-sm",
                  selectedDbId === p.id
                    ? "border-[#071A2D]/40 bg-muted/30"
                    : "border-border/70 hover:bg-muted/30",
                )}
              >
                <div className="min-w-0 flex-1">
                  <span
                    className="font-semibold tracking-tight text-[#071A2D]"
                    style={{ fontFamily: "var(--font-brand-display)" }}
                  >
                    {p.name}
                  </span>
                  {p.city && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      {p.city}
                      {p.state ? `/${p.state}` : ""}
                    </span>
                  )}
                </div>
                {selectedDbId === p.id && (
                  <Check className="h-4 w-4 shrink-0 text-[#071A2D]" />
                )}
              </button>
            ))}
          </div>
        )}

        {shouldShowResults && searchCity && uniqueOsm.length > 0 && (
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {t("parish.osm_section")}
            </p>
            {uniqueOsm.map((op: any) => (
              <button
                key={op.osmId}
                type="button"
                onClick={() => handleOsmSelect(op)}
                className={cn(
                  "mb-1 flex w-full items-center gap-2 border px-3 py-2.5 text-left text-sm transition-colors rounded-sm",
                  selectedOsm?.osmId === op.osmId
                    ? "border-[#071A2D]/40 bg-muted/30"
                    : "border-border/70 hover:bg-muted/30",
                )}
              >
                <div className="min-w-0 flex-1">
                  <span
                    className="font-semibold tracking-tight text-[#071A2D]"
                    style={{ fontFamily: "var(--font-brand-display)" }}
                  >
                    {op.name}
                  </span>
                  {op.address && (
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {op.address}
                    </span>
                  )}
                </div>
                {selectedOsm?.osmId === op.osmId && (
                  <Check className="h-4 w-4 shrink-0 text-[#071A2D]" />
                )}
              </button>
            ))}
          </div>
        )}

        {shouldShowResults && searchCity && loadingOsm && (
          <p className="text-xs text-muted-foreground">
            {t("parish.searching_map")}
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
          {t("parish.create_link")}
        </button>
      ) : (
        <div className="space-y-3 border border-border/70 p-4 rounded-sm">
          <Label className="text-xs font-medium">
            {t("parish.new_name_label")}
          </Label>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="h-11 rounded-sm"
            placeholder={t("parish.new_name_placeholder")}
          />
          {duplicateParish && (
            <div className="border border-border/70 px-3 py-2 text-xs text-muted-foreground rounded-sm">
              {t("parish.duplicate_warning")}{" "}
              <strong className="text-foreground">
                {duplicateParish.name}
              </strong>
              {duplicateParish.city && (
                <>
                  {" "}
                  {t("parish.duplicate_in", {
                    city:
                      duplicateParish.city +
                      (duplicateParish.state
                        ? `/${duplicateParish.state}`
                        : ""),
                  })}
                </>
              )}
              .
              <button
                type="button"
                onClick={() => {
                  handleDbSelect(duplicateParish);
                  setShowCreate(false);
                  setNewName("");
                }}
                className="ml-2 font-medium text-foreground underline"
              >
                {t("parish.use_this")}
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
              {creating ? t("parish.creating") : t("parish.create_btn")}
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 border-t border-border/70 pt-4">
        {selected ? (
          <>
            <p className="text-sm text-muted-foreground">
              {t("parish.selection_ready", { name: selected.name })}
            </p>
            <Button
              onClick={onContinue}
              className="h-11 w-full rounded-sm shadow-none"
            >
              {t("parish.continue_with_selection")}
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t("parish.select_hint")}
          </p>
        )}
      </div>
    </div>
  );
}
