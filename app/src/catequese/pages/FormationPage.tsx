import { useState } from "react";
import { useTranslation } from "react-i18next";
import { GraduationCap, Plus, UserPlus } from "lucide-react";
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
  createFormationSession,
  enrollInFormationTrack,
  markFormationAttendance,
} from "wasp/client/operations";
import { useActiveParish } from "../../client/hooks/useActiveParish";
import { useUserContext } from "../../client/hooks/useUserContext";
import { toast } from "../../client/hooks/use-toast";
import { OriginBadge } from "../components/OriginBadge";
import { useLocale } from "../../i18n/useLocale";
import { formatDate } from "../../i18n/format";

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
  const { currentLocale } = useLocale();
  const { userRole, userId } = useUserContext();
  const { activeParishId } = useActiveParish();
  const canPublish = COORDINATOR_ROLES.includes(userRole);

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<(typeof TRACK_KINDS)[number]>("INITIAL");
  const [hours, setHours] = useState("");
  const [sessionTrackId, setSessionTrackId] = useState<string | null>(null);
  const [sessionTitle, setSessionTitle] = useState("");
  const [sessionStarts, setSessionStarts] = useState("");

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

  const handleSession = async (trackId: string) => {
    if (!sessionTitle.trim() || !sessionStarts) return;
    try {
      await createFormationSession({
        trackId,
        title: sessionTitle.trim(),
        startsAt: sessionStarts,
      });
      toast({ title: t("formation.session_created") });
      setSessionTrackId(null);
      setSessionTitle("");
      setSessionStarts("");
    } catch (e: any) {
      toast({
        title: t("formation.session_error"),
        description: e?.message,
        variant: "destructive",
      });
    }
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
            <Button size="sm" onClick={handleCreate} disabled={!name.trim() || saving}>
              {saving ? t("formation.saving") : tc("create")}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>
              {tc("cancel")}
            </Button>
          </div>
        </AppPanel>
      )}

      {isLoading ? (
        <div className="h-40 animate-pulse rounded-sm bg-muted" />
      ) : tracks.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title={t("formation.empty_title")}
          description={t("formation.empty_desc")}
        />
      ) : (
        <div className="space-y-3">
          {tracks.map((track: any) => {
            const enrolled = Boolean(track.myEnrollment);
            return (
              <AppPanel key={track.id} className="space-y-3">
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
                          {t(`formation.enrollment.${track.myEnrollment.status}`)}
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
                    {!enrolled && (
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
                    {canPublish && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setSessionTrackId(
                            sessionTrackId === track.id ? null : track.id,
                          )
                        }
                      >
                        <Plus className="mr-1 h-3.5 w-3.5" />
                        {t("formation.add_session")}
                      </Button>
                    )}
                  </div>
                </div>

                {sessionTrackId === track.id && (
                  <div className="grid gap-2 sm:grid-cols-3">
                    <Input
                      value={sessionTitle}
                      onChange={(e) => setSessionTitle(e.target.value)}
                      placeholder={t("formation.session_title")}
                    />
                    <Input
                      type="datetime-local"
                      value={sessionStarts}
                      onChange={(e) => setSessionStarts(e.target.value)}
                    />
                    <Button
                      size="sm"
                      onClick={() => handleSession(track.id)}
                      disabled={!sessionTitle.trim() || !sessionStarts}
                    >
                      {t("formation.save_session")}
                    </Button>
                  </div>
                )}

                {(track.sessions || []).length > 0 && (
                  <ul className="space-y-1.5">
                    {track.sessions.map((session: any) => (
                      <li
                        key={session.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-border/60 px-3 py-2 text-sm"
                      >
                        <span>
                          {session.title}
                          <span className="ml-2 text-xs text-muted-foreground">
                            {formatDate(session.startsAt, currentLocale, {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </span>
                        {enrolled && userId && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              markFormationAttendance({
                                sessionId: session.id,
                                userId,
                                present: true,
                              })
                            }
                          >
                            {t("formation.mark_present")}
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </AppPanel>
            );
          })}
        </div>
      )}
    </div>
  );
}
