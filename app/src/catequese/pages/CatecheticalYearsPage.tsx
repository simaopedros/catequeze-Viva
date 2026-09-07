import { useTranslation } from "react-i18next";
import { useState } from "react";
import { CalendarDays, Plus, Check } from "lucide-react";
import { Button } from "../../client/components/ui/button";
import {
  AppPageHeader,
  AppPanel,
} from "../../client/components/brand/AppChrome";
import { Badge } from "../../client/components/ui/badge";
import { EmptyState } from "../../client/components/EmptyState";
import {
  useQuery,
  listCatecheticalYears,
  createCatecheticalYear,
  listCatecheticalItineraries,
  createCatecheticalItinerary,
  publishCatecheticalItinerary,
  instantiateCatecheticalItinerary,
} from "wasp/client/operations";
import { useActiveParish } from "../../client/hooks/useActiveParish";
import { useActiveWorkspace } from "../../client/hooks/useActiveWorkspace";
import { useUserContext } from "../../client/hooks/useUserContext";
import { useLocale } from "../../i18n/useLocale";
import { formatDate } from "../../i18n/format";
import { Alert } from "../../client/components/ui/alert";
import { OriginBadge } from "../components/OriginBadge";
import { toast } from "../../client/hooks/use-toast";

interface CatecheticalYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  parishId: string;
  parish?: { name: string };
}

export default function CatecheticalYearsPage() {
  const { t } = useTranslation("catecheticalYears");
  const { t: th } = useTranslation("hierarchy");
  const { t: tc } = useTranslation("common");
  const { currentLocale } = useLocale();
  const { activeParishId } = useActiveParish();
  const { workspaceType } = useActiveWorkspace();
  const { userRole } = useUserContext();
  const isDioceseWorkspace = workspaceType === "DIOCESE";
  const canPublishItinerary = [
    "SUPER_ADMIN",
    "DIOCESE_ADMIN",
    "PARISH_COORDINATOR",
    "PERSONAL_OWNER",
  ].includes(userRole);

  const { data: years = [], isLoading: loading } = useQuery(
    listCatecheticalYears,
  );
  const { data: itineraries = [] } = useQuery(
    listCatecheticalItineraries,
    { workspaceId: activeParishId || undefined } as any,
    { enabled: Boolean(activeParishId) },
  );
  const [error, setError] = useState("");

  const filteredYears = activeParishId
    ? years.filter((y: any) => y.parishId === activeParishId)
    : years;
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [itineraryName, setItineraryName] = useState("");
  const [itineraryDesc, setItineraryDesc] = useState("");
  const [instantiateId, setInstantiateId] = useState<string | null>(null);

  const handleInstantiate = async (itineraryId: string) => {
    if (!name || !startDate || !endDate) return;
    setSaving(true);
    setError("");
    try {
      await instantiateCatecheticalItinerary({
        itineraryId,
        workspaceId: activeParishId,
        name,
        startDate,
        endDate,
      });
      toast({ title: th("itinerary.instantiated") });
      setName("");
      setStartDate("");
      setEndDate("");
      setInstantiateId(null);
    } catch (e: any) {
      setError(e.message || t("create_error"));
    }
    setSaving(false);
  };

  const handleCreateItinerary = async () => {
    if (!itineraryName.trim()) return;
    setSaving(true);
    try {
      await createCatecheticalItinerary({
        workspaceId: activeParishId,
        name: itineraryName.trim(),
        description: itineraryDesc.trim() || undefined,
        stages: [{ name: th("itinerary.default_stage") }],
      });
      toast({ title: th("itinerary.created") });
      setItineraryName("");
      setItineraryDesc("");
    } catch (e: any) {
      setError(e.message || th("itinerary.create_error"));
    }
    setSaving(false);
  };

  const handleCreate = async () => {
    if (!name || !startDate || !endDate) return;
    setSaving(true);
    setError("");
    try {
      await createCatecheticalYear({
        name,
        startDate,
        endDate,
        parishId: activeParishId || undefined,
      });
      setName("");
      setStartDate("");
      setEndDate("");
      setShowForm(false);
    } catch (e: any) {
      setError(e.message || t("create_error"));
    }
    setSaving(false);
  };

  const isActive = (year: CatecheticalYear) => {
    const now = new Date();
    const end = new Date(year.endDate);
    return end >= now;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-ink"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <AppPageHeader
        eyebrow={t("eyebrow", { defaultValue: "Pastoral" })}
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          <Button
            size="sm"
            className="h-10 rounded-md"
            onClick={() => setShowForm(!showForm)}
          >
            <Plus className="mr-1 h-4 w-4" />
            {t("new_year")}
          </Button>
        }
      />

      {error && <Alert variant="destructive">{error}</Alert>}

      {itineraries.length > 0 && (
        <AppPanel className="space-y-3">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {th("itinerary.section")}
          </h3>
          <div className="space-y-2">
            {itineraries.map((it: any) => (
              <div
                key={it.id}
                className="flex flex-wrap items-start justify-between gap-2 rounded-sm border border-border/60 p-3"
                data-testid="catechetical-itinerary"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold">{it.name}</p>
                    <OriginBadge
                      ownerType={it.ownerType}
                      policy={it.inheritancePolicy}
                      inherited={Boolean(it.inherited || it.origin?.inherited)}
                    />
                    <Badge variant="outline" size="sm">
                      {th(`library.status.${it.status}`)}
                    </Badge>
                  </div>
                  {it.description && (
                    <p className="text-xs text-muted-foreground">
                      {it.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {th("itinerary.stages_count", {
                      count: it.stages?.length || 0,
                    })}
                    {typeof it._count?.years === "number"
                      ? ` · ${th("itinerary.years_count", {
                          count: it._count.years,
                        })}`
                      : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {canPublishItinerary &&
                    it.status === "DRAFT" &&
                    it.ownerType ===
                      (isDioceseWorkspace ? "DIOCESE" : "PARISH") && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          publishCatecheticalItinerary({ id: it.id })
                        }
                      >
                        {th("itinerary.publish")}
                      </Button>
                    )}
                  {!isDioceseWorkspace && it.status === "PUBLISHED" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setInstantiateId(it.id);
                        setShowForm(true);
                      }}
                    >
                      {th("itinerary.instantiate")}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </AppPanel>
      )}

      {canPublishItinerary && (
        <AppPanel className="space-y-3">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {th("itinerary.new")}
          </h3>
          <input
            value={itineraryName}
            onChange={(e) => setItineraryName(e.target.value)}
            className="flex h-10 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm"
            placeholder={th("itinerary.name_placeholder")}
          />
          <input
            value={itineraryDesc}
            onChange={(e) => setItineraryDesc(e.target.value)}
            className="flex h-10 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm"
            placeholder={th("itinerary.desc_placeholder")}
          />
          <Button
            size="sm"
            onClick={handleCreateItinerary}
            disabled={!itineraryName.trim() || saving}
          >
            {th("itinerary.create")}
          </Button>
        </AppPanel>
      )}

      {showForm && (
        <AppPanel className="space-y-4">
          <div className="space-y-1.5">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {t("form_title")}
            </h3>
            <div className="h-px w-8 bg-brand-gold" aria-hidden />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="text-sm font-medium">{t("name")} *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex h-10 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm mt-1"
                placeholder={t("name_placeholder")}
                aria-label={t("name")}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t("start")} *</label>
              <input
                aria-label={t("start")}
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="flex h-10 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t("end")} *</label>
              <input
                aria-label={t("end")}
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="flex h-10 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm mt-1"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() =>
                instantiateId
                  ? handleInstantiate(instantiateId)
                  : handleCreate()
              }
              disabled={saving || !name || !startDate || !endDate}
            >
              <Check className="mr-1 h-4 w-4" />
              {saving
                ? t("creating")
                : instantiateId
                  ? th("itinerary.instantiate")
                  : tc("create")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-sm"
              onClick={() => {
                setShowForm(false);
                setInstantiateId(null);
              }}
            >
              {tc("cancel")}
            </Button>
          </div>
        </AppPanel>
      )}

      {filteredYears.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title={t("empty_title")}
          description={t("empty_desc")}
        >
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="mr-1 h-4 w-4" /> {t("create_btn")}
          </Button>
        </EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredYears.map((year: any) => (
            <AppPanel
              key={year.id}
              className="transition-colors hover:border-brand-ink/30"
            >
              <div className="mb-3 flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="rounded-sm border border-border/70 bg-muted/30 p-2">
                    <CalendarDays className="h-5 w-5 text-brand-ink" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold tracking-tight text-brand-ink">
                      {year.name}
                    </h3>
                    {year.parish?.name && (
                      <p className="text-xs text-muted-foreground">
                        {year.parish.name}
                      </p>
                    )}
                  </div>
                </div>
                <Badge
                  variant={isActive(year) ? "default" : "secondary"}
                  className="rounded-sm"
                >
                  {isActive(year) ? t("status_active") : t("status_concluded")}
                </Badge>
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>
                  {t("start_label", {
                    date: formatDate(year.startDate, currentLocale),
                  })}
                </p>
                <p>
                  {t("end_label", {
                    date: formatDate(year.endDate, currentLocale),
                  })}
                </p>
                {year.sourceItinerary?.name && (
                  <div className="pt-1">
                    <OriginBadge
                      ownerType={year.sourceItinerary.ownerType || "DIOCESE"}
                      inherited
                    />
                    <p className="mt-1 text-xs">
                      {th("itinerary.from", {
                        name: year.sourceItinerary.name,
                      })}
                    </p>
                  </div>
                )}
              </div>
            </AppPanel>
          ))}
        </div>
      )}
    </div>
  );
}
