import { useTranslation } from "react-i18next";
import { useState } from "react";
import { CalendarDays, Plus, Check, Pencil, Trash2 } from "lucide-react";
import { Button } from "../../client/components/ui/button";
import {
  AppPageHeader,
  AppPanel,
} from "../../client/components/brand/AppChrome";
import { Badge } from "../../client/components/ui/badge";
import { EmptyState } from "../../client/components/EmptyState";
import { Input } from "../../client/components/ui/input";
import { Textarea } from "../../client/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../client/components/ui/select";
import { ConfirmDialog } from "../../client/components/ConfirmDialog";
import {
  useQuery,
  listCatecheticalYears,
  createCatecheticalYear,
  listCatecheticalItineraries,
  createCatecheticalItinerary,
  publishCatecheticalItinerary,
  instantiateCatecheticalItinerary,
  updateCatecheticalItinerary,
  deleteCatecheticalItinerary,
} from "wasp/client/operations";
import { useActiveParish } from "../../client/hooks/useActiveParish";
import { useActiveWorkspace } from "../../client/hooks/useActiveWorkspace";
import { useUserContext } from "../../client/hooks/useUserContext";
import { useLocale } from "../../i18n/useLocale";
import { formatDate } from "../../i18n/format";
import { Alert } from "../../client/components/ui/alert";
import { OriginBadge } from "../components/OriginBadge";
import { toast } from "../../client/hooks/use-toast";
import { INHERITANCE_POLICIES } from "../../shared/resourceInheritance";

interface CatecheticalYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  parishId: string;
  parish?: { name: string };
}

type StageDraft = { name: string; description: string };

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
  const [itineraryPolicy, setItineraryPolicy] = useState<
    (typeof INHERITANCE_POLICIES)[number]
  >("REQUIRED_EXTENDABLE");
  const [itineraryStages, setItineraryStages] = useState<StageDraft[]>([
    { name: "", description: "" },
  ]);
  const [editingItineraryId, setEditingItineraryId] = useState<string | null>(
    null,
  );
  const [itineraryStatus, setItineraryStatus] = useState("DRAFT");
  const [instantiateId, setInstantiateId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<any>(null);

  const resetItineraryForm = () => {
    setItineraryName("");
    setItineraryDesc("");
    setItineraryPolicy("REQUIRED_EXTENDABLE");
    setItineraryStages([{ name: "", description: "" }]);
    setEditingItineraryId(null);
    setItineraryStatus("DRAFT");
  };

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

  const stagesPayload = () =>
    itineraryStages
      .map((s) => ({
        name: s.name.trim(),
        description: s.description.trim() || undefined,
      }))
      .filter((s) => s.name);

  const handleCreateItinerary = async () => {
    if (!itineraryName.trim()) return;
    setSaving(true);
    try {
      await createCatecheticalItinerary({
        workspaceId: activeParishId,
        name: itineraryName.trim(),
        description: itineraryDesc.trim() || undefined,
        inheritancePolicy: itineraryPolicy,
        stages:
          stagesPayload().length > 0
            ? stagesPayload()
            : [{ name: th("itinerary.default_stage") }],
      });
      toast({ title: th("itinerary.created") });
      resetItineraryForm();
    } catch (e: any) {
      setError(e.message || th("itinerary.create_error"));
    }
    setSaving(false);
  };

  const handleUpdateItinerary = async () => {
    if (!editingItineraryId || !itineraryName.trim()) return;
    setSaving(true);
    try {
      await updateCatecheticalItinerary({
        id: editingItineraryId,
        workspaceId: activeParishId,
        name: itineraryName.trim(),
        description: itineraryDesc.trim() || null,
        inheritancePolicy: itineraryPolicy,
        status: itineraryStatus,
        stages:
          stagesPayload().length > 0
            ? stagesPayload()
            : [{ name: th("itinerary.default_stage") }],
      });
      toast({ title: th("itinerary.updated") });
      resetItineraryForm();
    } catch (e: any) {
      setError(e.message || th("itinerary.update_error"));
    }
    setSaving(false);
  };

  const handleDeleteItinerary = async () => {
    if (!pendingDelete) return;
    try {
      const result = await deleteCatecheticalItinerary({
        id: pendingDelete.id,
        workspaceId: activeParishId,
      });
      toast({
        title: result?.archived
          ? th("itinerary.archived")
          : th("itinerary.deleted"),
      });
      if (editingItineraryId === pendingDelete.id) resetItineraryForm();
    } catch (e: any) {
      setError(e.message || th("itinerary.delete_error"));
    }
    setPendingDelete(null);
  };

  const startEditItinerary = (it: any) => {
    setEditingItineraryId(it.id);
    setItineraryName(it.name || "");
    setItineraryDesc(it.description || "");
    setItineraryPolicy(it.inheritancePolicy || "REQUIRED_EXTENDABLE");
    setItineraryStatus(it.status || "DRAFT");
    setItineraryStages(
      (it.stages || []).length
        ? it.stages.map((s: any) => ({
            name: s.name || "",
            description: s.description || "",
          }))
        : [{ name: "", description: "" }],
    );
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

      <AppPanel className="space-y-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {th("itinerary.section")}
        </h3>
        {itineraries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {th("itinerary.empty_desc")}
          </p>
        ) : (
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
                    <Badge variant="outline" size="sm">
                      {th(`policy.${it.inheritancePolicy}`)}
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
                  {(it.stages || []).length > 0 && (
                    <ul className="mt-1 list-disc pl-4 text-xs text-muted-foreground">
                      {it.stages.map((stage: any) => (
                        <li key={stage.id || stage.name}>{stage.name}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {it.canManage && it.status === "DRAFT" && (
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
                  {it.canManage && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startEditItinerary(it)}
                    >
                      <Pencil className="mr-1 h-3.5 w-3.5" />
                      {tc("edit")}
                    </Button>
                  )}
                  {it.canManage && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setPendingDelete(it)}
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                      {it.status === "DRAFT"
                        ? tc("delete")
                        : th("itinerary.archive")}
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
        )}
      </AppPanel>

      {canPublishItinerary && (
        <AppPanel className="space-y-3">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {editingItineraryId ? th("itinerary.edit") : th("itinerary.new")}
          </h3>
          <Input
            value={itineraryName}
            onChange={(e) => setItineraryName(e.target.value)}
            placeholder={th("itinerary.name_placeholder")}
            aria-label={th("itinerary.name")}
          />
          <Input
            value={itineraryDesc}
            onChange={(e) => setItineraryDesc(e.target.value)}
            placeholder={th("itinerary.desc_placeholder")}
          />
          <Select
            value={itineraryPolicy}
            onValueChange={(v) => setItineraryPolicy(v as any)}
          >
            <SelectTrigger aria-label={th("itinerary.policy")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INHERITANCE_POLICIES.map((p) => (
                <SelectItem key={p} value={p}>
                  {th(`policy.${p}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {editingItineraryId && (
            <Select value={itineraryStatus} onValueChange={setItineraryStatus}>
              <SelectTrigger aria-label={th("itinerary.status")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["DRAFT", "PUBLISHED", "ARCHIVED"].map((s) => (
                  <SelectItem key={s} value={s}>
                    {th(`library.status.${s}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              {th("itinerary.stages")}
            </p>
            {itineraryStages.map((stage, index) => (
              <div key={index} className="grid gap-2 sm:grid-cols-2">
                <Input
                  value={stage.name}
                  onChange={(e) => {
                    const next = [...itineraryStages];
                    next[index] = { ...next[index], name: e.target.value };
                    setItineraryStages(next);
                  }}
                  placeholder={th("itinerary.stage_name")}
                  aria-label={th("itinerary.stage_name")}
                />
                <div className="flex gap-2">
                  <Input
                    value={stage.description}
                    onChange={(e) => {
                      const next = [...itineraryStages];
                      next[index] = {
                        ...next[index],
                        description: e.target.value,
                      };
                      setItineraryStages(next);
                    }}
                    placeholder={th("itinerary.stage_desc")}
                  />
                  {itineraryStages.length > 1 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setItineraryStages(
                          itineraryStages.filter((_, i) => i !== index),
                        )
                      }
                    >
                      {tc("delete")}
                    </Button>
                  )}
                </div>
              </div>
            ))}
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setItineraryStages([
                  ...itineraryStages,
                  { name: "", description: "" },
                ])
              }
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              {th("itinerary.add_stage")}
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={
                editingItineraryId
                  ? handleUpdateItinerary
                  : handleCreateItinerary
              }
              disabled={!itineraryName.trim() || saving}
            >
              {editingItineraryId ? tc("save") : th("itinerary.create")}
            </Button>
            {editingItineraryId && (
              <Button size="sm" variant="outline" onClick={resetItineraryForm}>
                {tc("cancel")}
              </Button>
            )}
          </div>
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

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title={th("itinerary.delete_title")}
        description={
          pendingDelete?.status === "DRAFT"
            ? th("itinerary.delete_confirm")
            : th("itinerary.archive_confirm")
        }
        confirmLabel={
          pendingDelete?.status === "DRAFT"
            ? tc("delete")
            : th("itinerary.archive")
        }
        variant="destructive"
        onConfirm={handleDeleteItinerary}
      />
    </div>
  );
}
