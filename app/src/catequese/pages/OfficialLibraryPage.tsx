import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BookOpen,
  Plus,
  Send,
  Copy,
  EyeOff,
  Check,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "../../client/components/ui/button";
import { Badge } from "../../client/components/ui/badge";
import { Input } from "../../client/components/ui/input";
import { Textarea } from "../../client/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../client/components/ui/select";
import {
  AppPageHeader,
  AppPanel,
} from "../../client/components/brand/AppChrome";
import { EmptyState } from "../../client/components/EmptyState";
import { FilterPills } from "../../client/components/FilterPills";
import { Alert } from "../../client/components/ui/alert";
import { ConfirmDialog } from "../../client/components/ConfirmDialog";
import {
  useQuery,
  listOfficialResources,
  createOfficialResource,
  publishOfficialResource,
  adoptOfficialResource,
  updateOfficialResource,
  deleteOfficialResource,
} from "wasp/client/operations";
import { useActiveParish } from "../../client/hooks/useActiveParish";
import { useUserContext } from "../../client/hooks/useUserContext";
import { toast } from "../../client/hooks/use-toast";
import { OriginBadge } from "../components/OriginBadge";
import { OfficialResourceAttachments } from "../components/OfficialResourceAttachments";
import { PastoralCompanion } from "../components/social/PastoralCompanion";
import {
  INHERITANCE_POLICIES,
  OFFICIAL_RESOURCE_KINDS,
} from "../../shared/resourceInheritance";

const COORDINATOR_ROLES = [
  "SUPER_ADMIN",
  "DIOCESE_ADMIN",
  "PARISH_COORDINATOR",
  "COMMUNITY_COORDINATOR",
  "PERSONAL_OWNER",
];

const EDITABLE_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;

type ResourceForm = {
  title: string;
  summary: string;
  body: string;
  kind: (typeof OFFICIAL_RESOURCE_KINDS)[number];
  inheritancePolicy: (typeof INHERITANCE_POLICIES)[number];
  status: (typeof EDITABLE_STATUSES)[number];
};

const emptyForm = (): ResourceForm => ({
  title: "",
  summary: "",
  body: "",
  kind: "DIRECTORY",
  inheritancePolicy: "SUGGESTED",
  status: "DRAFT",
});

export default function OfficialLibraryPage() {
  const { t } = useTranslation("hierarchy");
  const { t: tc } = useTranslation("common");
  const { userRole } = useUserContext();
  const { activeParishId } = useActiveParish();
  const canPublish = COORDINATOR_ROLES.includes(userRole);

  const [kind, setKind] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ResourceForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<any>(null);

  const {
    data: resources = [],
    isLoading,
    refetch,
  } = useQuery(
    listOfficialResources,
    {
      workspaceId: activeParishId || undefined,
      kind: kind === "all" ? undefined : kind,
      includeDrafts: canPublish,
    } as any,
    { enabled: Boolean(activeParishId) },
  );

  const counts = useMemo(() => {
    const published = resources.filter(
      (r: any) => r.status === "PUBLISHED" || r.status === "APPROVED",
    ).length;
    const inherited = resources.filter((r: any) => r.inherited).length;
    return { published, inherited, total: resources.length };
  }, [resources]);

  const resetForm = () => {
    setForm(emptyForm());
    setShowForm(false);
    setEditingId(null);
  };

  const handleCreate = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await createOfficialResource({
        workspaceId: activeParishId,
        title: form.title.trim(),
        summary: form.summary.trim() || undefined,
        body: form.body.trim() || undefined,
        kind: form.kind,
        inheritancePolicy: form.inheritancePolicy,
      });
      toast({ title: t("library.created") });
      resetForm();
    } catch (e: any) {
      toast({
        title: t("library.create_error"),
        description: e?.message,
        variant: "destructive",
      });
    }
    setSaving(false);
  };

  const handleUpdate = async () => {
    if (!editingId || !form.title.trim()) return;
    setSaving(true);
    try {
      await updateOfficialResource({
        id: editingId,
        workspaceId: activeParishId,
        title: form.title.trim(),
        summary: form.summary.trim() || null,
        body: form.body.trim() || null,
        kind: form.kind,
        inheritancePolicy: form.inheritancePolicy,
        status: form.status,
      });
      toast({ title: t("library.updated") });
      resetForm();
    } catch (e: any) {
      toast({
        title: t("library.update_error"),
        description: e?.message,
        variant: "destructive",
      });
    }
    setSaving(false);
  };

  const handlePublish = async (id: string) => {
    try {
      await publishOfficialResource({ id });
      toast({ title: t("library.published") });
    } catch (e: any) {
      toast({
        title: t("library.publish_error"),
        description: e?.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    try {
      const result = await deleteOfficialResource({
        id: pendingDelete.id,
        workspaceId: activeParishId,
      });
      toast({
        title: result?.archived ? t("library.archived") : t("library.deleted"),
      });
      if (editingId === pendingDelete.id) resetForm();
    } catch (e: any) {
      toast({
        title: t("library.delete_error"),
        description: e?.message,
        variant: "destructive",
      });
    }
    setPendingDelete(null);
  };

  const handleAdopt = async (
    id: string,
    status: "INHERITED" | "ADAPTED" | "DISMISSED",
  ) => {
    try {
      await adoptOfficialResource({
        id,
        workspaceId: activeParishId,
        status,
      });
      toast({ title: t(`library.adopt_${status.toLowerCase()}`) });
    } catch (e: any) {
      toast({
        title: t("library.adopt_error"),
        description: e?.message,
        variant: "destructive",
      });
    }
  };

  const startEdit = (row: any) => {
    setEditingId(row.id);
    setShowForm(true);
    setForm({
      title: row.title || "",
      summary: row.summary || "",
      body: row.body || "",
      kind: row.kind || "DIRECTORY",
      inheritancePolicy: row.inheritancePolicy || "LOCKED",
      status:
        row.status === "ARCHIVED" || row.status === "PUBLISHED"
          ? row.status
          : "DRAFT",
    });
  };

  return (
    <div className="space-y-6">
      <AppPageHeader
        eyebrow={t("library.eyebrow")}
        title={t("library.title")}
        subtitle={t("library.subtitle", {
          published: counts.published,
          inherited: counts.inherited,
        })}
        actions={
          canPublish ? (
            <Button
              size="sm"
              onClick={() => {
                if (showForm && !editingId) {
                  resetForm();
                } else {
                  setEditingId(null);
                  setForm(emptyForm());
                  setShowForm(true);
                }
              }}
            >
              <Plus className="mr-1 h-4 w-4" />
              {t("library.new")}
            </Button>
          ) : undefined
        }
      />

      <PastoralCompanion surface="library" />

      <FilterPills
        options={[
          { value: "all", label: t("library.kinds.all") },
          ...OFFICIAL_RESOURCE_KINDS.map((k) => ({
            value: k,
            label: t(`library.kinds.${k}`),
          })),
        ]}
        value={kind}
        onChange={setKind}
        onClear={() => setKind("all")}
        clearValue="all"
      />

      {showForm && canPublish && (
        <AppPanel className="space-y-3">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {editingId ? t("library.edit_title") : t("library.form_title")}
          </h3>
          <Input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder={t("library.title_placeholder")}
            aria-label={t("library.title_field")}
          />
          <Input
            value={form.summary}
            onChange={(e) =>
              setForm((f) => ({ ...f, summary: e.target.value }))
            }
            placeholder={t("library.summary_placeholder")}
            aria-label={t("library.summary")}
          />
          <Select
            value={form.kind}
            onValueChange={(v) =>
              setForm((f) => ({ ...f, kind: v as ResourceForm["kind"] }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OFFICIAL_RESOURCE_KINDS.map((k) => (
                <SelectItem key={k} value={k}>
                  {t(`library.kinds.${k}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={form.inheritancePolicy}
            onValueChange={(v) =>
              setForm((f) => ({
                ...f,
                inheritancePolicy: v as ResourceForm["inheritancePolicy"],
              }))
            }
          >
            <SelectTrigger aria-label={t("library.policy")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INHERITANCE_POLICIES.map((p) => (
                <SelectItem key={p} value={p}>
                  {t(`policy.${p}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {editingId && (
            <Select
              value={form.status}
              onValueChange={(v) =>
                setForm((f) => ({
                  ...f,
                  status: v as ResourceForm["status"],
                }))
              }
            >
              <SelectTrigger aria-label={t("library.status_field")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EDITABLE_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {t(`library.status.${s}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Textarea
            value={form.body}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            placeholder={t("library.body_placeholder")}
            rows={6}
            aria-label={t("library.body")}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={editingId ? handleUpdate : handleCreate}
              disabled={!form.title.trim() || saving}
            >
              {saving
                ? t("library.saving")
                : editingId
                  ? tc("save")
                  : tc("create")}
            </Button>
            <Button size="sm" variant="outline" onClick={resetForm}>
              {tc("cancel")}
            </Button>
          </div>
        </AppPanel>
      )}

      {isLoading ? (
        <div className="h-40 animate-pulse rounded-sm bg-muted" />
      ) : resources.length === 0 ? (
        <div data-testid="empty-official-library">
          <EmptyState
            icon={BookOpen}
            title={t("library.empty_title")}
            description={t("library.empty_desc")}
          />
        </div>
      ) : (
        <div className="space-y-3" data-testid="official-resource-list">
          {resources.map((row: any) => {
            const adoption = row.adoption?.status;
            const canManage = Boolean(row.canManage);
            const canAdapt =
              row.inherited &&
              (row.inheritancePolicy === "SUGGESTED" ||
                row.inheritancePolicy === "REQUIRED_EXTENDABLE");
            const canDismiss =
              row.inherited && row.inheritancePolicy === "SUGGESTED";
            return (
              <AppPanel
                key={row.id}
                className="space-y-3"
                data-testid="official-resource"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-brand-ink">
                        {row.title}
                      </h3>
                      <OriginBadge
                        origin={row.origin}
                        ownerType={row.ownerType}
                        inherited={row.inherited}
                        policy={row.inheritancePolicy}
                      />
                      <Badge variant="outline" size="sm">
                        {t(`library.kinds.${row.kind}`)}
                      </Badge>
                      <Badge
                        variant={
                          row.status === "PUBLISHED" ? "success" : "secondary"
                        }
                        size="sm"
                      >
                        {t(`library.status.${row.status}`)}
                      </Badge>
                      <Badge variant="outline" size="sm">
                        {t(`policy.${row.inheritancePolicy}`)}
                      </Badge>
                      {adoption && (
                        <Badge variant="info" size="sm">
                          {t(`library.adoption.${adoption}`)}
                        </Badge>
                      )}
                    </div>
                    {row.summary && (
                      <p className="text-sm text-muted-foreground">
                        {row.summary}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {canManage && row.status === "DRAFT" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePublish(row.id)}
                      >
                        <Send className="mr-1 h-3.5 w-3.5" />
                        {t("library.publish")}
                      </Button>
                    )}
                    {canManage && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startEdit(row)}
                      >
                        <Pencil className="mr-1 h-3.5 w-3.5" />
                        {tc("edit")}
                      </Button>
                    )}
                    {canManage && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setPendingDelete(row)}
                      >
                        <Trash2 className="mr-1 h-3.5 w-3.5" />
                        {row.status === "DRAFT"
                          ? tc("delete")
                          : t("library.archive")}
                      </Button>
                    )}
                    {row.inherited && adoption !== "INHERITED" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAdopt(row.id, "INHERITED")}
                      >
                        <Check className="mr-1 h-3.5 w-3.5" />
                        {t("library.adopt")}
                      </Button>
                    )}
                    {canAdapt && adoption !== "ADAPTED" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAdopt(row.id, "ADAPTED")}
                      >
                        <Copy className="mr-1 h-3.5 w-3.5" />
                        {t("library.adapt")}
                      </Button>
                    )}
                    {canDismiss && adoption !== "DISMISSED" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleAdopt(row.id, "DISMISSED")}
                      >
                        <EyeOff className="mr-1 h-3.5 w-3.5" />
                        {t("library.dismiss")}
                      </Button>
                    )}
                  </div>
                </div>
                {row.body && (
                  <p className="whitespace-pre-wrap text-sm text-brand-ink/80">
                    {row.body}
                  </p>
                )}
                <OfficialResourceAttachments
                  resourceId={row.id}
                  workspaceId={activeParishId || undefined}
                  attachments={row.attachments || []}
                  canEdit={canManage}
                  onChanged={() => refetch?.()}
                />
                {adoption === "ADAPTED" &&
                  row.version &&
                  row.adoption?.copiedVersion &&
                  row.version > row.adoption.copiedVersion && (
                    <Alert variant="warning">{t("library.new_version")}</Alert>
                  )}
              </AppPanel>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title={
          pendingDelete?.status === "DRAFT"
            ? t("library.delete_title")
            : t("library.archive_title")
        }
        description={
          pendingDelete?.status === "DRAFT"
            ? t("library.delete_confirm")
            : t("library.archive_confirm")
        }
        confirmLabel={
          pendingDelete?.status === "DRAFT"
            ? tc("delete")
            : t("library.archive")
        }
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
