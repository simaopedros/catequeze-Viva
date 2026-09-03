import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { Button } from "../../client/components/ui/button";
import { QueryErrorState } from "../../client/components/QueryErrorState";
import { Textarea } from "../../client/components/ui/textarea";
import {
  Building2,
  Plus,
  Loader2,
  Check,
  X,
  Search,
  Church,
} from "lucide-react";
import { useCommunityTypeOptions } from "../../i18n/useLabels";
import {
  useQuery,
  listCommunities,
  createCommunity,
  updateCommunity,
} from "wasp/client/operations";
import { useActiveWorkspace } from "../../client/hooks/useActiveWorkspace";
import { toast } from "../../client/hooks/use-toast";
import { CommunityCreateForm } from "../components/community/CommunityCreateForm";
import { CommunityCard } from "../components/community/CommunityCard";
import PhoneMaskInput from "../../client/components/PhoneMaskInput";
import { AppPageHeader } from "../../client/components/brand/AppChrome";
import { SearchInput } from "../../client/components/SearchInput";
import { EmptyState } from "../../client/components/EmptyState";
import { SkeletonCard } from "../../client/components/Skeletons";
import { isInstitutionalWorkspaceType } from "../../shared/workspace";

export default function CommunitiesPage() {
  const { t } = useTranslation("common");
  const { t: tp } = useTranslation("parishes");
  const { t: tn } = useTranslation("navigation");
  const communityTypeOptions = useCommunityTypeOptions();
  const navigate = useNavigate();
  const { workspaceId, isPersonal, availableWorkspaces, switchWorkspace } =
    useActiveWorkspace();

  const institutionalParishes = useMemo(
    () =>
      availableWorkspaces.filter(
        (w) => !w.isPersonal && isInstitutionalWorkspaceType(w.type),
      ),
    [availableWorkspaces],
  );

  const [parishId, setParishId] = useState("");

  useEffect(() => {
    if (parishId && institutionalParishes.some((w) => w.id === parishId)) {
      return;
    }
    const fromWorkspace =
      !isPersonal && institutionalParishes.some((w) => w.id === workspaceId)
        ? workspaceId
        : "";
    const next = fromWorkspace || institutionalParishes[0]?.id || "";
    setParishId(next);
    if (next && isPersonal) switchWorkspace(next);
  }, [
    institutionalParishes,
    isPersonal,
    parishId,
    switchWorkspace,
    workspaceId,
  ]);

  const handleParishChange = (id: string) => {
    setParishId(id);
    if (id) switchWorkspace(id);
  };

  const {
    data: communities = [],
    isLoading: loading,
    error: communitiesError,
    refetch: refetchCommunities,
  } = useQuery(listCommunities, { parishId }, { enabled: Boolean(parishId) });

  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const updateEditField = (field: string, value: string) => {
    setEditFields((prev: any) => ({ ...prev, [field]: value }));
  };

  const startEdit = (c: any) => {
    setEditFields({
      name: c.name || "",
      type: c.type || "",
      description: c.description || "",
      street: c.street || "",
      number: c.number || "",
      neighborhood: c.neighborhood || "",
      zipCode: c.zipCode || "",
      complement: c.complement || "",
      city: c.city || "",
      state: c.state || "",
      phone: c.phone || "",
      email: c.email || "",
      coordinatorName: c.coordinatorName || "",
      coordinatorPhone: c.coordinatorPhone || "",
    });
    setEditingId(c.id);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditFields({});
  };

  const handleUpdate = async () => {
    if (!editingId || !editFields.name?.trim()) return;
    setSaving(true);
    try {
      await updateCommunity({
        id: editingId,
        name: editFields.name.trim(),
        type: editFields.type || undefined,
        description: editFields.description?.trim() || undefined,
        location:
          [
            editFields.street,
            editFields.number,
            editFields.neighborhood,
            editFields.city,
            editFields.state,
          ]
            .filter(Boolean)
            .join(", ") || undefined,
        street: editFields.street?.trim() || undefined,
        number: editFields.number?.trim() || undefined,
        neighborhood: editFields.neighborhood?.trim() || undefined,
        zipCode: editFields.zipCode?.trim() || undefined,
        complement: editFields.complement?.trim() || undefined,
        city: editFields.city?.trim() || undefined,
        state: editFields.state?.trim() || undefined,
        phone: editFields.phone?.trim() || undefined,
        email: editFields.email?.trim() || undefined,
        coordinatorName: editFields.coordinatorName?.trim() || undefined,
        coordinatorPhone: editFields.coordinatorPhone?.trim() || undefined,
      });
      cancelEdit();
    } catch (e: any) {
      toast({
        title: t("error_saving"),
        description: e.message || t("try_again"),
        variant: "destructive",
      });
    }
    setSaving(false);
  };

  const handleCreate = async (data: any) => {
    try {
      await createCommunity(data);
      setShowCreate(false);
    } catch (e: any) {
      toast({
        title: t("error_creating"),
        description: e.message || t("try_again"),
        variant: "destructive",
      });
    }
  };

  const filterCommunities = useMemo(() => {
    if (!search) return communities;
    const q = search.toLowerCase();
    return communities.filter(
      (c: any) =>
        c.name?.toLowerCase().includes(q) ||
        c.type?.toLowerCase().includes(q) ||
        c.city?.toLowerCase().includes(q),
    );
  }, [communities, search]);

  const hasFilters = !!search;

  const inputClass =
    "w-full h-9 rounded-sm border border-input bg-background px-3 text-sm mt-1";

  return (
    <div className="space-y-6">
      <AppPageHeader
        eyebrow={tp("communities_eyebrow", { defaultValue: "Paróquia" })}
        title={tn("communities")}
        subtitle={tp("communities_page_subtitle")}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {institutionalParishes.length > 1 && (
              <select
                aria-label={tp("select_parish_to_manage")}
                value={parishId}
                onChange={(e) => handleParishChange(e.target.value)}
                className="h-10 min-w-[12rem] rounded-md border border-input bg-background px-3 text-sm"
              >
                {institutionalParishes.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            )}
            <Button
              size="sm"
              className="h-10 rounded-md"
              onClick={() => setShowCreate(!showCreate)}
              disabled={!parishId}
            >
              <Plus className="mr-1 h-4 w-4" />
              {tp("new_community_btn")}
            </Button>
          </div>
        }
      />

      {showCreate && parishId && (
        <CommunityCreateForm
          parishId={parishId}
          onCreate={handleCreate}
          onCancel={() => setShowCreate(false)}
        />
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <SearchInput
          placeholder={tp("search_communities")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : communitiesError && communities.length === 0 ? (
        <QueryErrorState
          compact
          error={communitiesError}
          onRetry={refetchCommunities}
        />
      ) : filterCommunities.length === 0 ? (
        hasFilters ? (
          <EmptyState
            compact
            icon={Search}
            title={t("no_results")}
            description={tp("no_communities_found")}
          />
        ) : (
          <EmptyState
            icon={Building2}
            title={
              institutionalParishes.length === 0
                ? tp("no_institutional_parish")
                : tp("no_community")
            }
            description={
              institutionalParishes.length === 0
                ? tp("no_institutional_parish_desc")
                : parishId
                  ? tp("no_communities_desc")
                  : tp("select_parish_to_manage")
            }
          >
            {institutionalParishes.length === 0 && (
              <Button
                size="sm"
                className="mt-3"
                onClick={() => navigate("/app/parishes?new=true")}
              >
                <Church className="mr-1 h-4 w-4" />
                {tp("create_first")}
              </Button>
            )}
          </EmptyState>
        )
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filterCommunities.map((c: any) => (
            <CommunityCard
              key={c.id}
              community={c}
              onEdit={startEdit}
              isEditing={editingId === c.id}
              editForm={
                <div className="rounded-sm border border-border/70 bg-white p-4 space-y-3">
                  <div className="space-y-1.5">
                    <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {tp("edit_community")}
                    </h3>
                    <div className="h-px w-8 bg-brand-gold" aria-hidden />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="text-xs font-medium text-muted-foreground">
                        {tp("name")} *
                      </label>
                      <input
                        aria-label={tp("name")}
                        value={editFields.name}
                        onChange={(e) =>
                          updateEditField("name", e.target.value)
                        }
                        className={inputClass}
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">
                        {tp("type")}
                      </label>
                      <select
                        aria-label={tp("type")}
                        value={editFields.type}
                        onChange={(e) =>
                          updateEditField("type", e.target.value)
                        }
                        className={inputClass}
                      >
                        {communityTypeOptions.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">
                        {t("phone")}
                      </label>
                      <PhoneMaskInput
                        value={editFields.phone}
                        onChange={(v) => updateEditField("phone", v)}
                        className={inputClass}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-xs font-medium text-muted-foreground">
                        {tp("email")}
                      </label>
                      <input
                        aria-label={tp("email")}
                        value={editFields.email}
                        onChange={(e) =>
                          updateEditField("email", e.target.value)
                        }
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="sm:col-span-2">
                      <label className="text-xs font-medium text-muted-foreground">
                        {tp("street")}
                      </label>
                      <input
                        aria-label={tp("street")}
                        value={editFields.street}
                        onChange={(e) =>
                          updateEditField("street", e.target.value)
                        }
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">
                        {tp("number")}
                      </label>
                      <input
                        aria-label={tp("number")}
                        value={editFields.number}
                        onChange={(e) =>
                          updateEditField("number", e.target.value)
                        }
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">
                        {tp("neighborhood")}
                      </label>
                      <input
                        aria-label={tp("neighborhood")}
                        value={editFields.neighborhood}
                        onChange={(e) =>
                          updateEditField("neighborhood", e.target.value)
                        }
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">
                        {tp("city")}
                      </label>
                      <input
                        aria-label={tp("city")}
                        value={editFields.city}
                        onChange={(e) =>
                          updateEditField("city", e.target.value)
                        }
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">
                        {tp("state_abbr")}
                      </label>
                      <input
                        aria-label={tp("state_abbr")}
                        value={editFields.state}
                        onChange={(e) =>
                          updateEditField("state", e.target.value)
                        }
                        className={inputClass}
                        maxLength={2}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">
                        {tp("coordinator")}
                      </label>
                      <input
                        aria-label={tp("coordinator")}
                        value={editFields.coordinatorName}
                        onChange={(e) =>
                          updateEditField("coordinatorName", e.target.value)
                        }
                        className={inputClass}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-xs font-medium text-muted-foreground">
                        {tp("coordinator_phone")}
                      </label>
                      <PhoneMaskInput
                        value={editFields.coordinatorPhone}
                        onChange={(v) => updateEditField("coordinatorPhone", v)}
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      {tp("description")}
                    </label>
                    <Textarea
                      aria-label={tp("description")}
                      value={editFields.description}
                      onChange={(e) =>
                        updateEditField("description", e.target.value)
                      }
                      className="w-full rounded-sm border border-input bg-background px-3 py-2 text-sm mt-1"
                      rows={2}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleUpdate}
                      disabled={saving || !editFields.name?.trim()}
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="mr-1 h-4 w-4" />
                          {tp("save")}
                        </>
                      )}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={cancelEdit}>
                      <X className="mr-1 h-4 w-4" />
                      {tp("cancel")}
                    </Button>
                  </div>
                </div>
              }
            />
          ))}
          <p className="col-span-full text-xs text-muted-foreground">
            {tp("found_count", { count: filterCommunities.length })}
          </p>
        </div>
      )}
    </div>
  );
}
