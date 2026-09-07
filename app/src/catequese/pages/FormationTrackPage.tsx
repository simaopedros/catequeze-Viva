import { useState } from "react";
import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  GraduationCap,
  Pencil,
  Plus,
  Trash2,
  UserMinus,
  UserPlus,
} from "lucide-react";
import { Button } from "../../client/components/ui/button";
import { Badge } from "../../client/components/ui/badge";
import { Input } from "../../client/components/ui/input";
import { Textarea } from "../../client/components/ui/textarea";
import { Checkbox } from "../../client/components/ui/checkbox";
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
import { ConfirmDialog } from "../../client/components/ConfirmDialog";
import {
  useQuery,
  getFormationTrack,
  updateFormationTrack,
  deleteFormationTrack,
  createFormationSession,
  updateFormationSession,
  deleteFormationSession,
  enrollInFormationTrack,
  unenrollFromFormationTrack,
  markFormationAttendance,
} from "wasp/client/operations";
import { useActiveParish } from "../../client/hooks/useActiveParish";
import { useUserContext } from "../../client/hooks/useUserContext";
import { toast } from "../../client/hooks/use-toast";
import { OriginBadge } from "../components/OriginBadge";
import { FormationCurriculum } from "../components/FormationCurriculum";
import { useLocale } from "../../i18n/useLocale";
import { formatDate } from "../../i18n/format";
import { INHERITANCE_POLICIES } from "../../shared/resourceInheritance";

const TRACK_KINDS = [
  "INITIAL",
  "PERMANENT",
  "INSTITUTED_MINISTRY",
  "COORDINATION",
  "INCLUSIVE",
] as const;

function toLocalInput(value?: string | Date | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

export default function FormationTrackPage() {
  const { t } = useTranslation("hierarchy");
  const { t: tc } = useTranslation("common");
  const { currentLocale } = useLocale();
  const { id } = useParams<{ id: string }>();
  const { userRole, userId } = useUserContext();
  const { activeParishId } = useActiveParish();

  const { data: track, isLoading, refetch } = useQuery(
    getFormationTrack,
    { id: id!, workspaceId: activeParishId || undefined } as any,
    { enabled: Boolean(id && activeParishId) },
  );

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<(typeof TRACK_KINDS)[number]>("INITIAL");
  const [hours, setHours] = useState("");
  const [policy, setPolicy] =
    useState<(typeof INHERITANCE_POLICIES)[number]>("SUGGESTED");
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [sessionTitle, setSessionTitle] = useState("");
  const [sessionStarts, setSessionStarts] = useState("");
  const [sessionEnds, setSessionEnds] = useState("");
  const [sessionLocation, setSessionLocation] = useState("");
  const [sessionHours, setSessionHours] = useState("");
  const [sessionNotes, setSessionNotes] = useState("");
  const [pendingDelete, setPendingDelete] = useState<"track" | string | null>(
    null,
  );
  const [tab, setTab] = useState<"program" | "sessions" | "roster">("program");

  const canManage = Boolean(track?.canManage);
  const enrolled = Boolean(
    track?.myEnrollment && track.myEnrollment.status !== "DROPPED",
  );

  const startEdit = () => {
    if (!track) return;
    setName(track.name || "");
    setDescription(track.description || "");
    setKind(track.kind || "INITIAL");
    setHours(track.hours ? String(track.hours) : "");
    setPolicy(track.inheritancePolicy || "SUGGESTED");
    setEditing(true);
  };

  const resetSessionForm = () => {
    setShowSessionForm(false);
    setEditingSessionId(null);
    setSessionTitle("");
    setSessionStarts("");
    setSessionEnds("");
    setSessionLocation("");
    setSessionHours("");
    setSessionNotes("");
  };

  const startEditSession = (session: any) => {
    setEditingSessionId(session.id);
    setShowSessionForm(true);
    setSessionTitle(session.title || "");
    setSessionStarts(toLocalInput(session.startsAt));
    setSessionEnds(toLocalInput(session.endsAt));
    setSessionLocation(session.location || "");
    setSessionHours(session.hours ? String(session.hours) : "");
    setSessionNotes(session.notes || "");
  };

  const handleSaveTrack = async () => {
    if (!track || !name.trim()) return;
    setSaving(true);
    try {
      await updateFormationTrack({
        id: track.id,
        workspaceId: activeParishId,
        name: name.trim(),
        description: description.trim() || null,
        kind,
        hours: hours ? Number(hours) : null,
        inheritancePolicy: policy,
      });
      toast({ title: t("formation.updated") });
      setEditing(false);
    } catch (e: any) {
      toast({
        title: t("formation.update_error"),
        description: e?.message,
        variant: "destructive",
      });
    }
    setSaving(false);
  };

  const handleSaveSession = async () => {
    if (!track || !sessionTitle.trim() || !sessionStarts) return;
    try {
      const payload = {
        title: sessionTitle.trim(),
        startsAt: sessionStarts,
        endsAt: sessionEnds || undefined,
        location: sessionLocation.trim() || undefined,
        hours: sessionHours ? Number(sessionHours) : undefined,
        notes: sessionNotes.trim() || undefined,
      };
      if (editingSessionId) {
        await updateFormationSession({
          id: editingSessionId,
          workspaceId: activeParishId,
          ...payload,
        });
      } else {
        await createFormationSession({
          trackId: track.id,
          workspaceId: activeParishId,
          ...payload,
        });
      }
      toast({ title: t("formation.session_created") });
      resetSessionForm();
    } catch (e: any) {
      toast({
        title: t("formation.session_error"),
        description: e?.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!track || !pendingDelete) return;
    try {
      if (pendingDelete === "track") {
        const result = await deleteFormationTrack({
          id: track.id,
          workspaceId: activeParishId,
        });
        toast({
          title: result?.archived
            ? t("formation.archived")
            : t("formation.deleted"),
        });
        window.location.assign("/app/formation");
      } else {
        await deleteFormationSession({
          id: pendingDelete,
          workspaceId: activeParishId,
        });
        toast({ title: t("formation.session_deleted") });
      }
    } catch (e: any) {
      toast({
        title: t("formation.delete_error"),
        description: e?.message,
        variant: "destructive",
      });
    }
    setPendingDelete(null);
  };

  if (isLoading) {
    return <div className="h-40 animate-pulse rounded-sm bg-muted" />;
  }
  if (!track) {
    return (
      <EmptyState
        icon={GraduationCap}
        title={t("formation.not_found")}
        description={t("formation.empty_desc")}
      >
        <Button size="sm" asChild>
          <Link to="/app/formation">{tc("back")}</Link>
        </Button>
      </EmptyState>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" className="mt-1 shrink-0" asChild>
          <Link to="/app/formation" aria-label={tc("back")}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <AppPageHeader
          className="min-w-0 flex-1 border-0 pb-0"
          eyebrow={t("formation.eyebrow")}
          title={track.name}
          subtitle={t("formation.detail_subtitle", {
            modules: track.modules?.length || track._count?.modules || 0,
            lessons: track.lessonTotal || 0,
            sessions: track._count?.sessions || track.sessions?.length || 0,
            enrolled:
              track._count?.enrollments || track.enrollments?.length || 0,
          })}
          actions={
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
              {enrolled && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    unenrollFromFormationTrack({
                      trackId: track.id,
                      workspaceId: activeParishId,
                    })
                  }
                >
                  <UserMinus className="mr-1 h-3.5 w-3.5" />
                  {t("formation.unenroll")}
                </Button>
              )}
              {canManage && (
                <Button size="sm" variant="outline" onClick={startEdit}>
                  <Pencil className="mr-1 h-3.5 w-3.5" />
                  {tc("edit")}
                </Button>
              )}
              {canManage && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setPendingDelete("track")}
                >
                  <Trash2 className="mr-1 h-3.5 w-3.5" />
                  {tc("delete")}
                </Button>
              )}
            </div>
          }
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <OriginBadge
          ownerType={track.ownerType}
          inherited={track.inherited}
          policy={track.inheritancePolicy}
        />
        <Badge variant="outline" size="sm">
          {t(`formation.kinds.${track.kind}`)}
        </Badge>
        <Badge variant="outline" size="sm">
          {t(`policy.${track.inheritancePolicy}`)}
        </Badge>
        {enrolled && (
          <Badge variant="success" size="sm">
            {t(`formation.enrollment.${track.myEnrollment.status}`)}
          </Badge>
        )}
        {track.inherited && !canManage && (
          <p className="text-xs text-muted-foreground">
            {t("formation.inherited_readonly")}
          </p>
        )}
      </div>

      {editing && canManage ? (
        <AppPanel className="space-y-3">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
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
            <SelectTrigger>
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
            aria-label={t("formation.hours")}
          />
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSaveTrack} disabled={saving}>
              {tc("save")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEditing(false)}
            >
              {tc("cancel")}
            </Button>
          </div>
        </AppPanel>
      ) : (
        track.description && (
          <AppPanel>
            <p className="whitespace-pre-wrap text-sm text-brand-ink/80">
              {track.description}
            </p>
          </AppPanel>
        )
      )}

      <div className="flex flex-wrap gap-1 border-b border-border/60 pb-2">
        {(
          [
            ["program", t("formation.tab_program")],
            ["sessions", t("formation.tab_sessions")],
            ["roster", t("formation.tab_roster")],
          ] as const
        ).map(([id, label]) => (
          <Button
            key={id}
            size="sm"
            variant={tab === id ? "secondary" : "ghost"}
            onClick={() => setTab(id)}
          >
            {label}
          </Button>
        ))}
      </div>

      {tab === "program" && (
        <FormationCurriculum
          trackId={track.id}
          workspaceId={activeParishId}
          modules={track.modules || []}
          canManage={canManage}
          enrolled={enrolled}
          onChanged={refetch}
        />
      )}

      {tab === "sessions" && (
        <AppPanel className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {t("formation.sessions_title")}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t("formation.sessions_hint")}
              </p>
            </div>
            {canManage && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  resetSessionForm();
                  setShowSessionForm(true);
                }}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                {t("formation.add_session")}
              </Button>
            )}
          </div>

          {showSessionForm && canManage && (
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                value={sessionTitle}
                onChange={(e) => setSessionTitle(e.target.value)}
                placeholder={t("formation.session_title")}
                aria-label={t("formation.session_title")}
              />
              <Input
                type="datetime-local"
                value={sessionStarts}
                onChange={(e) => setSessionStarts(e.target.value)}
                aria-label={t("formation.session_starts")}
              />
              <Input
                type="datetime-local"
                value={sessionEnds}
                onChange={(e) => setSessionEnds(e.target.value)}
                aria-label={t("formation.session_ends")}
              />
              <Input
                value={sessionLocation}
                onChange={(e) => setSessionLocation(e.target.value)}
                placeholder={t("formation.location_placeholder")}
                aria-label={t("formation.session_location")}
              />
              <Input
                type="number"
                min={1}
                value={sessionHours}
                onChange={(e) => setSessionHours(e.target.value)}
                placeholder={t("formation.session_hours")}
              />
              <Textarea
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                placeholder={t("formation.notes_placeholder")}
                rows={2}
                className="sm:col-span-2"
              />
              <div className="flex gap-2 sm:col-span-2">
                <Button
                  size="sm"
                  onClick={handleSaveSession}
                  disabled={!sessionTitle.trim() || !sessionStarts}
                >
                  {t("formation.save_session")}
                </Button>
                <Button size="sm" variant="outline" onClick={resetSessionForm}>
                  {tc("cancel")}
                </Button>
              </div>
            </div>
          )}

          {(track.sessions || []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("formation.empty_sessions")}
            </p>
          ) : (
            <ul className="space-y-3">
              {track.sessions.map((session: any) => {
                const mine = (session.attendances || []).find(
                  (a: any) => a.userId === userId,
                );
                return (
                  <li
                    key={session.id}
                    className="space-y-2 rounded-sm border border-border/60 p-3"
                    data-testid="formation-session"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">{session.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(session.startsAt, currentLocale, {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {session.location ? ` · ${session.location}` : ""}
                          {session.hours ? ` · ${session.hours}h` : ""}
                        </p>
                        {session.notes && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {session.notes}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {enrolled && userId && (
                          <Button
                            size="sm"
                            variant={mine?.present ? "outline" : "ghost"}
                            onClick={() =>
                              markFormationAttendance({
                                sessionId: session.id,
                                userId,
                                present: !mine?.present,
                                workspaceId: activeParishId,
                              })
                            }
                          >
                            {mine?.present
                              ? t("formation.present")
                              : t("formation.mark_present")}
                          </Button>
                        )}
                        {canManage && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startEditSession(session)}
                          >
                            {tc("edit")}
                          </Button>
                        )}
                        {canManage && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setPendingDelete(session.id)}
                          >
                            {tc("delete")}
                          </Button>
                        )}
                      </div>
                    </div>
                    {track.canSeeRoster &&
                      (track.enrollments || []).length > 0 && (
                        <div
                          className="space-y-1"
                          data-testid="formation-attendance"
                        >
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                            {t("formation.attendance")}
                          </p>
                          <ul className="space-y-1">
                            {track.enrollments
                              .filter((e: any) => e.status !== "DROPPED")
                              .map((enrollment: any) => {
                                const att = (session.attendances || []).find(
                                  (a: any) => a.userId === enrollment.userId,
                                );
                                const present = Boolean(att?.present);
                                return (
                                  <li
                                    key={`${session.id}-${enrollment.userId}`}
                                    className="flex items-center justify-between gap-2 text-sm"
                                  >
                                    <span>
                                      {enrollment.userName || enrollment.userId}
                                    </span>
                                    {(canManage ||
                                      [
                                        "SUPER_ADMIN",
                                        "DIOCESE_ADMIN",
                                        "PARISH_COORDINATOR",
                                        "PERSONAL_OWNER",
                                      ].includes(userRole)) && (
                                      <label className="flex items-center gap-2 text-xs">
                                        <Checkbox
                                          checked={present}
                                          onCheckedChange={(checked) =>
                                            markFormationAttendance({
                                              sessionId: session.id,
                                              userId: enrollment.userId,
                                              present: Boolean(checked),
                                              workspaceId: activeParishId,
                                            })
                                          }
                                          aria-label={t(
                                            "formation.mark_present",
                                          )}
                                        />
                                        {present
                                          ? t("formation.present")
                                          : t("formation.absent")}
                                      </label>
                                    )}
                                  </li>
                                );
                              })}
                          </ul>
                        </div>
                      )}
                  </li>
                );
              })}
            </ul>
          )}
        </AppPanel>
      )}

      {tab === "roster" && (
        <AppPanel className="space-y-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {t("formation.enrollments_title")}
          </h3>
          {(track.enrollments || []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("formation.enroll_to_progress")}
            </p>
          ) : (
            <ul className="space-y-1 text-sm">
              {track.enrollments.map((enrollment: any) => (
                <li
                  key={enrollment.id}
                  className="flex items-center justify-between gap-2"
                >
                  <span>{enrollment.userName || enrollment.userId}</span>
                  <Badge variant="outline" size="sm">
                    {t(`formation.enrollment.${enrollment.status}`)}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </AppPanel>
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title={
          pendingDelete === "track"
            ? t("formation.delete_title")
            : t("formation.delete_session_title")
        }
        description={
          pendingDelete === "track"
            ? t("formation.delete_confirm")
            : t("formation.delete_session_confirm")
        }
        confirmLabel={tc("delete")}
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
