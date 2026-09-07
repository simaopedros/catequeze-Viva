import { useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { GraduationCap, Plus, UserPlus, ArrowRight } from "lucide-react";
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
  listFormationTracks,
  createFormationTrack,
  enrollInFormationTrack,
} from "wasp/client/operations";
import { useActiveParish } from "../../client/hooks/useActiveParish";
import { useUserContext } from "../../client/hooks/useUserContext";
import { toast } from "../../client/hooks/use-toast";
import { OriginBadge } from "../components/OriginBadge";
import { INHERITANCE_POLICIES } from "../../shared/resourceInheritance";

const COORDINATOR_ROLES = [
  "SUPER_ADMIN",
  "DIOCESE_ADMIN",
  "PARISH_COORDINATOR",
  "COMMUNITY_COORDINATOR",
  "PERSONAL_OWNER",
];

const TRACK_KINDS = [
  "INITIAL",
  "PERMANENT",
  "INSTITUTED_MINISTRY",
  "COORDINATION",
  "INCLUSIVE",
] as const;

export default function FormationPage() {
  const { t } = useTranslation("hierarchy");
  const { t: tc } = useTranslation("common");
  const { userRole } = useUserContext();
  const { activeParishId } = useActiveParish();
  const canPublish = COORDINATOR_ROLES.includes(userRole);

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<(typeof TRACK_KINDS)[number]>("INITIAL");
  const [hours, setHours] = useState("");
  const [policy, setPolicy] =
    useState<(typeof INHERITANCE_POLICIES)[number]>("SUGGESTED");

  const { data: tracks = [], isLoading } = useQuery(
    listFormationTracks,
    { workspaceId: activeParishId || undefined } as any,
    { enabled: Boolean(activeParishId) },
  );

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await createFormationTrack({
        workspaceId: activeParishId,
        name: name.trim(),
        description: description.trim() || undefined,
        kind,
        hours: hours ? Number(hours) : undefined,
        inheritancePolicy: policy,
      });
      toast({ title: t("formation.created") });
      setName("");
      setDescription("");
      setHours("");
      setShowForm(false);
    } catch (e: any) {
      toast({
        title: t("formation.create_error"),
        description: e?.message,
        variant: "destructive",
      });
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <AppPageHeader
        eyebrow={t("formation.eyebrow")}
        title={t("formation.title")}
        subtitle={t("formation.subtitle")}
        actions={
          canPublish ? (
            <Button size="sm" onClick={() => setShowForm(!showForm)}>
              <Plus className="mr-1 h-4 w-4" />
              {t("formation.new")}
            </Button>
          ) : undefined
        }
      />

      {showForm && canPublish && (
        <AppPanel className="space-y-3">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("formation.name_placeholder")}
            aria-label={t("formation.name")}
          />
          <Select value={kind} onValueChange={(v) => setKind(v as any)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TRACK_KINDS.map((k) => (
                <SelectItem key={k} value={k}>
                  {t(`formation.kinds.${k}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={policy} onValueChange={(v) => setPolicy(v as any)}>
            <SelectTrigger aria-label={t("formation.policy")}>
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
          <Input
            type="number"
            min={1}
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            placeholder={t("formation.hours_placeholder")}
            aria-label={t("formation.hours")}
          />
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("formation.desc_placeholder")}
            rows={4}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={!name.trim() || saving}
            >
              {saving ? t("formation.saving") : tc("create")}
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
      ) : tracks.length === 0 ? (
        <div data-testid="empty-formation">
          <EmptyState
            icon={GraduationCap}
            title={t("formation.empty_title")}
            description={t("formation.empty_desc")}
          />
        </div>
      ) : (
        <div className="space-y-3" data-testid="formation-track-list">
          {tracks.map((track: any) => {
            const enrolled = Boolean(
              track.myEnrollment && track.myEnrollment.status !== "DROPPED",
            );
            return (
              <AppPanel
                key={track.id}
                className="space-y-3"
                data-testid="formation-track"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-brand-ink">
                        {track.name}
                      </h3>
                      <OriginBadge
                        ownerType={track.ownerType}
                        inherited={track.inherited}
                        policy={track.inheritancePolicy}
                      />
                      <Badge variant="outline" size="sm">
                        {t(`formation.kinds.${track.kind}`)}
                      </Badge>
                      {enrolled && (
                        <Badge variant="success" size="sm">
                          {t(
                            `formation.enrollment.${track.myEnrollment.status}`,
                          )}
                        </Badge>
                      )}
                      {!track.active && (
                        <Badge variant="secondary" size="sm">
                          {tc("archived")}
                        </Badge>
                      )}
                    </div>
                    {track.description && (
                      <p className="text-sm text-muted-foreground">
                        {track.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {t("formation.meta", {
                        sessions: track._count?.sessions || 0,
                        enrolled: track._count?.enrollments || 0,
                        hours: track.hours || 0,
                      })}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {!enrolled && track.active !== false && (
                      <Button
                        size="sm"
                        onClick={() =>
                          enrollInFormationTrack({
                            trackId: track.id,
                            workspaceId: activeParishId,
                          })
                        }
                      >
                        <UserPlus className="mr-1 h-3.5 w-3.5" />
                        {t("formation.enroll")}
                      </Button>
                    )}
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`/app/formation/${track.id}`}>
                        {t("formation.open")}
                        <ArrowRight className="ml-1 h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </AppPanel>
            );
          })}
        </div>
      )}
    </div>
  );
}
