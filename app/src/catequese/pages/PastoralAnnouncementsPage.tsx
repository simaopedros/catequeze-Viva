import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Megaphone, Plus, Send, Check, Repeat } from "lucide-react";
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
import {
  useQuery,
  listPastoralAnnouncements,
  createPastoralAnnouncement,
  publishPastoralAnnouncement,
  acknowledgePastoralAnnouncement,
  republishPastoralAnnouncement,
} from "wasp/client/operations";
import { useActiveParish } from "../../client/hooks/useActiveParish";
import { useUserContext } from "../../client/hooks/useUserContext";
import { toast } from "../../client/hooks/use-toast";
import { OriginBadge } from "../components/OriginBadge";

const COORDINATOR_ROLES = [
  "SUPER_ADMIN",
  "DIOCESE_ADMIN",
  "PARISH_COORDINATOR",
  "COMMUNITY_COORDINATOR",
  "PERSONAL_OWNER",
];

export default function PastoralAnnouncementsPage() {
  const { t } = useTranslation("hierarchy");
  const { t: tc } = useTranslation("common");
  const { userRole } = useUserContext();
  const { activeParishId } = useActiveParish();
  const canPublish = COORDINATOR_ROLES.includes(userRole);

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState("coordinators");

  const { data: rows = [], isLoading } = useQuery(
    listPastoralAnnouncements,
    { workspaceId: activeParishId || undefined } as any,
    { enabled: Boolean(activeParishId) },
  );

  const handleCreate = async () => {
    if (!title.trim() || !body.trim()) return;
    setSaving(true);
    try {
      await createPastoralAnnouncement({
        workspaceId: activeParishId,
        title: title.trim(),
        body: body.trim(),
        audience,
        requireAck: true,
      });
      toast({ title: t("announcements.created") });
      setTitle("");
      setBody("");
      setShowForm(false);
    } catch (e: any) {
      toast({
        title: t("announcements.create_error"),
        description: e?.message,
        variant: "destructive",
      });
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <AppPageHeader
        eyebrow={t("announcements.eyebrow")}
        title={t("announcements.title")}
        subtitle={t("announcements.subtitle")}
        actions={
          canPublish ? (
            <Button size="sm" onClick={() => setShowForm(!showForm)}>
              <Plus className="mr-1 h-4 w-4" />
              {t("announcements.new")}
            </Button>
          ) : undefined
        }
      />

      {showForm && canPublish && (
        <AppPanel className="space-y-3">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("announcements.title_placeholder")}
            aria-label={t("announcements.title_field")}
          />
          <Select value={audience} onValueChange={setAudience}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="coordinators">
                {t("announcements.audience.coordinators")}
              </SelectItem>
              <SelectItem value="catechists">
                {t("announcements.audience.catechists")}
              </SelectItem>
              <SelectItem value="families">
                {t("announcements.audience.families")}
              </SelectItem>
              <SelectItem value="all">
                {t("announcements.audience.all")}
              </SelectItem>
            </SelectContent>
          </Select>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t("announcements.body_placeholder")}
            rows={6}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={!title.trim() || !body.trim() || saving}
            >
              {saving ? t("announcements.saving") : tc("create")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowForm(false)}
            >
              {tc("cancel")}
            </Button>
          </div>
        </AppPanel>
      )}

      {isLoading ? (
        <div className="h-40 animate-pulse rounded-sm bg-muted" />
      ) : rows.length === 0 ? (
        <div data-testid="empty-announcements">
          <EmptyState
            icon={Megaphone}
            title={t("announcements.empty_title")}
            description={t("announcements.empty_desc")}
          />
        </div>
      ) : (
        <div className="space-y-3" data-testid="announcement-list">
          {rows.map((row: any) => (
            <AppPanel
              key={row.id}
              className="space-y-3"
              data-testid="pastoral-announcement"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
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
                      {t(`announcements.audience.${row.audience}`, {
                        defaultValue: row.audience,
                      })}
                    </Badge>
                    <Badge
                      variant={
                        row.status === "PUBLISHED" ? "success" : "secondary"
                      }
                      size="sm"
                    >
                      {t(`announcements.status.${row.status}`)}
                    </Badge>
                    {row.acknowledged && (
                      <Badge variant="info" size="sm">
                        {t("announcements.acked")}
                      </Badge>
                    )}
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-brand-ink/80">
                    {row.body}
                  </p>
                  {typeof row._count?.acknowledgements === "number" && (
                    <p className="text-xs text-muted-foreground">
                      {t("announcements.ack_count", {
                        count: row._count.acknowledgements,
                      })}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {canPublish && !row.inherited && row.status === "DRAFT" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        try {
                          await publishPastoralAnnouncement({ id: row.id });
                          toast({ title: t("announcements.published") });
                        } catch (e: any) {
                          toast({
                            title: t("announcements.publish_error"),
                            description: e?.message,
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      <Send className="mr-1 h-3.5 w-3.5" />
                      {t("announcements.publish")}
                    </Button>
                  )}
                  {row.status === "PUBLISHED" &&
                    row.requireAck &&
                    !row.acknowledged && (
                      <Button
                        size="sm"
                        onClick={() =>
                          acknowledgePastoralAnnouncement({ id: row.id })
                        }
                      >
                        <Check className="mr-1 h-3.5 w-3.5" />
                        {t("announcements.ack")}
                      </Button>
                    )}
                  {canPublish &&
                    row.inherited &&
                    row.status === "PUBLISHED" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          republishPastoralAnnouncement({
                            id: row.id,
                            workspaceId: activeParishId,
                          })
                        }
                      >
                        <Repeat className="mr-1 h-3.5 w-3.5" />
                        {t("announcements.republish")}
                      </Button>
                    )}
                </div>
              </div>
            </AppPanel>
          ))}
        </div>
      )}
    </div>
  );
}
