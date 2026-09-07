import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BookOpen,
  Plus,
  Send,
  Copy,
  EyeOff,
  Check,
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
import {
  useQuery,
  listOfficialResources,
  createOfficialResource,
  publishOfficialResource,
  adoptOfficialResource,
} from "wasp/client/operations";
import { useActiveParish } from "../../client/hooks/useActiveParish";
import { useUserContext } from "../../client/hooks/useUserContext";
import { toast } from "../../client/hooks/use-toast";
import { OriginBadge } from "../components/OriginBadge";
import { OFFICIAL_RESOURCE_KINDS } from "../../shared/resourceInheritance";

const COORDINATOR_ROLES = [
  "SUPER_ADMIN",
  "DIOCESE_ADMIN",
  "PARISH_COORDINATOR",
  "COMMUNITY_COORDINATOR",
  "PERSONAL_OWNER",
];

export default function OfficialLibraryPage() {
  const { t } = useTranslation("hierarchy");
  const { t: tc } = useTranslation("common");
  const { userRole } = useUserContext();
  const { activeParishId } = useActiveParish();
  const canPublish = COORDINATOR_ROLES.includes(userRole);

  const [kind, setKind] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");
  const [newKind, setNewKind] = useState<(typeof OFFICIAL_RESOURCE_KINDS)[number]>(
    "DIRECTORY",
  );

  const { data: resources = [], isLoading } = useQuery(
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

  const handleCreate = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await createOfficialResource({
        workspaceId: activeParishId,
        title: title.trim(),
        summary: summary.trim() || undefined,
        body: body.trim() || undefined,
        kind: newKind,
      });
      toast({ title: t("library.created") });
      setTitle("");
      setSummary("");
      setBody("");
      setShowForm(false);
    } catch (e: any) {
      toast({
        title: t("library.create_error"),
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
            <Button size="sm" onClick={() => setShowForm(!showForm)}>
              <Plus className="mr-1 h-4 w-4" />
              {t("library.new")}
            </Button>
          ) : undefined
        }
      />

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
            {t("library.form_title")}
          </h3>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("library.title_placeholder")}
            aria-label={t("library.title_field")}
          />
          <Input
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder={t("library.summary_placeholder")}
            aria-label={t("library.summary")}
          />
          <Select value={newKind} onValueChange={(v) => setNewKind(v as any)}>
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
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t("library.body_placeholder")}
            rows={6}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreate} disabled={!title.trim() || saving}>
              {saving ? t("library.saving") : tc("create")}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>
              {tc("cancel")}
            </Button>
          </div>
        </AppPanel>
      )}

      {isLoading ? (
        <div className="h-40 animate-pulse rounded-sm bg-muted" />
      ) : resources.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={t("library.empty_title")}
          description={t("library.empty_desc")}
        />
      ) : (
        <div className="space-y-3">
          {resources.map((row: any) => {
            const adoption = row.adoption?.status;
            const canAdapt =
              row.inherited &&
              (row.inheritancePolicy === "SUGGESTED" ||
                row.inheritancePolicy === "REQUIRED_EXTENDABLE");
            const canDismiss =
              row.inherited && row.inheritancePolicy === "SUGGESTED";
            return (
              <AppPanel key={row.id} className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-brand-ink">
                        {row.title}
                      </h3>
                      <OriginBadge origin={row.origin} ownerType={row.ownerType} inherited={row.inherited} policy={row.inheritancePolicy} />
                      <Badge variant="outline" size="sm">
                        {t(`library.kinds.${row.kind}`)}
                      </Badge>
                      <Badge
                        variant={row.status === "PUBLISHED" ? "success" : "secondary"}
                        size="sm"
                      >
                        {t(`library.status.${row.status}`)}
                      </Badge>
                      {adoption && (
                        <Badge variant="info" size="sm">
                          {t(`library.adoption.${adoption}`)}
                        </Badge>
                      )}
                    </div>
                    {row.summary && (
                      <p className="text-sm text-muted-foreground">{row.summary}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {canPublish && !row.inherited && row.status === "DRAFT" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePublish(row.id)}
                      >
                        <Send className="mr-1 h-3.5 w-3.5" />
                        {t("library.publish")}
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
    </div>
  );
}
