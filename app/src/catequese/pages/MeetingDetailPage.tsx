import { useMemo, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams, useSearchParams } from "react-router";
import {
  useQuery,
  getMeeting,
  updateMeeting,
  justifyAbsenceByMeeting,
} from "wasp/client/operations";
import { Button } from "../../client/components/ui/button";
import { Badge } from "../../client/components/ui/badge";
import { Textarea } from "../../client/components/ui/textarea";
import { Label } from "../../client/components/ui/label";
import {
  AppPageHeader,
  AppPanel,
  AppEyebrow,
} from "../../client/components/brand/AppChrome";
import { SkeletonPage } from "../../client/components/Skeletons";
import { toast } from "../../client/hooks/use-toast";
import { useLocale } from "../../i18n/useLocale";
import { formatDate } from "../../i18n/format";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  ClipboardList,
  BookOpen,
  CheckCircle2,
  Play,
  Ban,
  MessageSquare,
} from "lucide-react";

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  NOT_STARTED: "outline",
  IN_PROGRESS: "default",
  COMPLETED: "secondary",
  CANCELLED: "destructive",
};

export default function MeetingDetailPage() {
  const { t } = useTranslation("meetings");
  const { t: tc } = useTranslation("common");
  const { currentLocale } = useLocale();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const dependentIdParam = searchParams.get("dependentId");
  const actionParam = searchParams.get("action");

  const {
    data: meetingRaw,
    isLoading,
    error,
    refetch,
  } = useQuery(getMeeting, { id: id! }, { enabled: Boolean(id) });
  // Role-shaped DTO has optional profile fields not expressible as a single Wasp type
  const meeting = meetingRaw as any;

  const [justifyFor, setJustifyFor] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (actionParam === "justify" && dependentIdParam) {
      setJustifyFor(dependentIdParam);
    }
  }, [actionParam, dependentIdParam]);

  const dateLabel = useMemo(() => {
    if (!meeting?.date) return "";
    return formatDate(meeting.date, currentLocale, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [meeting?.date, currentLocale]);

  const changeStatus = async (status: string) => {
    if (!meeting) return;
    setSaving(true);
    try {
      await updateMeeting({ id: meeting.id, status });
      toast({ title: t("status_updated") });
      await refetch();
    } catch (e: any) {
      toast({
        title: t("update_error", { message: e.message || t("server_error") }),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const submitJustify = async () => {
    if (!meeting || !justifyFor) return;
    setSaving(true);
    try {
      await justifyAbsenceByMeeting({
        meetingId: meeting.id,
        catechumenProfileId: justifyFor,
        note,
      });
      toast({ title: t("justify_success") });
      setNote("");
      setJustifyFor(null);
      await refetch();
    } catch (e: any) {
      toast({
        title: t("justify_error", { message: e.message || t("server_error") }),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <SkeletonPage />;

  if (error || !meeting) {
    return (
      <div className="space-y-4">
        <AppPageHeader
          eyebrow={t("detail_eyebrow")}
          title={t("detail_not_found")}
          subtitle={(error as any)?.message || t("detail_not_found_desc")}
        />
        <Button asChild variant="outline" className="h-11 min-h-11 rounded-sm">
          <Link to="/app">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {tc("back")}
          </Link>
        </Button>
      </div>
    );
  }

  const perms = meeting.permissions || {
    canEdit: false,
    canTakeAttendance: false,
    canChangeStatus: false,
    canJustify: false,
  };

  const primaryStaffAction =
    perms.canChangeStatus && meeting.status === "NOT_STARTED"
      ? {
          label: t("action_start"),
          onClick: () => changeStatus("IN_PROGRESS"),
          icon: Play,
        }
      : perms.canChangeStatus && meeting.status === "IN_PROGRESS"
        ? {
            label: t("action_complete"),
            onClick: () => changeStatus("COMPLETED"),
            icon: CheckCircle2,
          }
        : perms.canTakeAttendance
          ? {
              label: t("action_attendance"),
              href: `/app/classes/${meeting.class.id}/attendance?meetingId=${meeting.id}`,
              icon: ClipboardList,
            }
          : null;

  return (
    <div className="space-y-6">
      <AppPageHeader
        eyebrow={meeting.class?.name || t("detail_eyebrow")}
        title={meeting.title || meeting.theme || t("no_title")}
        subtitle={dateLabel}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              asChild
              variant="outline"
              className="h-11 min-h-11 rounded-sm"
            >
              <Link to="/app">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {tc("back")}
              </Link>
            </Button>
            {primaryStaffAction &&
              ("href" in primaryStaffAction && primaryStaffAction.href ? (
                <Button asChild className="h-11 min-h-11 rounded-sm shadow-none">
                  <Link to={primaryStaffAction.href}>
                    <primaryStaffAction.icon className="mr-2 h-4 w-4" />
                    {primaryStaffAction.label}
                  </Link>
                </Button>
              ) : (
                <Button
                  className="h-11 min-h-11 rounded-sm shadow-none"
                  disabled={saving}
                  onClick={
                    "onClick" in primaryStaffAction
                      ? primaryStaffAction.onClick
                      : undefined
                  }
                >
                  <primaryStaffAction.icon className="mr-2 h-4 w-4" />
                  {primaryStaffAction.label}
                </Button>
              ))}
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={STATUS_VARIANT[meeting.status] || "outline"}>
          {t(`status.${meeting.status}`, { defaultValue: meeting.status })}
        </Badge>
        {meeting.theme && (
          <span className="text-sm text-muted-foreground">{meeting.theme}</span>
        )}
      </div>

      <AppPanel className="space-y-3">
        <div className="space-y-1.5">
          <AppEyebrow className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {t("detail_info")}
          </AppEyebrow>
          <div className="h-px w-8 bg-[#D39A2B]" aria-hidden />
        </div>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">{t("date")}</dt>
            <dd className="font-medium text-[#071A2D]">{dateLabel}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t("detail_class")}</dt>
            <dd className="font-medium text-[#071A2D]">{meeting.class?.name}</dd>
          </div>
          {meeting.locationHint && (
            <div className="sm:col-span-2">
              <dt className="flex items-center gap-1 text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                {t("detail_location")}
              </dt>
              <dd className="font-medium text-[#071A2D]">
                {meeting.locationHint}
              </dd>
            </div>
          )}
          {meeting.attendanceSummary && (
            <div>
              <dt className="text-muted-foreground">{t("detail_attendance")}</dt>
              <dd className="font-medium text-[#071A2D]">
                {t("attendance_progress", {
                  registered: meeting.attendanceSummary.registered,
                  total: meeting.attendanceSummary.totalActive,
                })}
              </dd>
            </div>
          )}
        </dl>

        {perms.canChangeStatus && meeting.status !== "CANCELLED" && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-border/70">
            {meeting.status === "NOT_STARTED" && (
              <Button
                className="h-11 min-h-11 rounded-sm"
                disabled={saving}
                onClick={() => changeStatus("IN_PROGRESS")}
              >
                <Play className="mr-2 h-4 w-4" />
                {t("action_start")}
              </Button>
            )}
            {meeting.status === "IN_PROGRESS" && (
              <Button
                className="h-11 min-h-11 rounded-sm"
                disabled={saving}
                onClick={() => changeStatus("COMPLETED")}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {t("action_complete")}
              </Button>
            )}
            {(meeting.status === "NOT_STARTED" ||
              meeting.status === "IN_PROGRESS") && (
              <Button
                variant="outline"
                className="h-11 min-h-11 rounded-sm"
                disabled={saving}
                onClick={() => changeStatus("CANCELLED")}
              >
                <Ban className="mr-2 h-4 w-4" />
                {t("action_cancel")}
              </Button>
            )}
            {perms.canTakeAttendance && (
              <Button asChild variant="outline" className="h-11 min-h-11 rounded-sm">
                <Link
                  to={`/app/classes/${meeting.class.id}/attendance?meetingId=${meeting.id}`}
                >
                  <ClipboardList className="mr-2 h-4 w-4" />
                  {t("action_attendance")}
                </Link>
              </Button>
            )}
          </div>
        )}
      </AppPanel>

      {meeting.content && (
        <AppPanel className="space-y-3">
          <div className="space-y-1.5">
            <AppEyebrow className="flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5" />
              {t("detail_materials")}
            </AppEyebrow>
            <div className="h-px w-8 bg-[#D39A2B]" aria-hidden />
          </div>
          <h3
            className="text-base font-semibold text-[#071A2D]"
            style={{ fontFamily: "var(--font-brand-display)" }}
          >
            {meeting.content.title}
          </h3>
          {meeting.content.theme && (
            <p className="text-sm text-muted-foreground">
              {meeting.content.theme}
            </p>
          )}
          {meeting.content.openingPrayer && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("content_opening_prayer")}
              </p>
              <p className="mt-1 text-sm whitespace-pre-wrap">
                {meeting.content.openingPrayer}
              </p>
            </div>
          )}
          {meeting.content.mainContent && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("content_main")}
              </p>
              <p className="mt-1 text-sm whitespace-pre-wrap">
                {meeting.content.mainContent}
              </p>
            </div>
          )}
          {meeting.content.materials && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("content_materials")}
              </p>
              <p className="mt-1 text-sm whitespace-pre-wrap">
                {meeting.content.materials}
              </p>
            </div>
          )}
          {meeting.content.activity && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("content_activity")}
              </p>
              <p className="mt-1 text-sm whitespace-pre-wrap">
                {meeting.content.activity}
              </p>
            </div>
          )}
          {perms.canEdit && meeting.content.id && (
            <Button asChild variant="outline" className="h-11 min-h-11 rounded-sm">
              <Link to={`/app/content/${meeting.content.id}`}>
                {t("open_content")}
              </Link>
            </Button>
          )}
        </AppPanel>
      )}

      {meeting.notes && perms.canEdit && (
        <AppPanel className="space-y-2">
          <AppEyebrow>{t("detail_notes")}</AppEyebrow>
          <p className="text-sm whitespace-pre-wrap">{meeting.notes}</p>
        </AppPanel>
      )}

      {meeting.myAttendance && (
        <AppPanel className="space-y-2">
          <AppEyebrow>{t("detail_my_attendance")}</AppEyebrow>
          <p className="text-sm font-medium text-[#071A2D]">
            {meeting.myAttendance.status
              ? t(`attendance_status.${meeting.myAttendance.status}`, {
                  defaultValue: meeting.myAttendance.status,
                })
              : t("attendance_status.none")}
          </p>
          {meeting.myAttendance.note && (
            <p className="text-sm text-muted-foreground">
              {meeting.myAttendance.note}
            </p>
          )}
        </AppPanel>
      )}

      {meeting.dependentsOnMeeting && meeting.dependentsOnMeeting.length > 0 && (
        <AppPanel className="space-y-3">
          <div className="space-y-1.5">
            <AppEyebrow>{t("detail_dependents")}</AppEyebrow>
            <div className="h-px w-8 bg-[#D39A2B]" aria-hidden />
          </div>
          <ul className="divide-y divide-border/70">
            {meeting.dependentsOnMeeting.map((d: any) => {
              const canJustifyThis =
                !d.status ||
                d.status === "ABSENT" ||
                d.status === "LATE" ||
                d.status === "JUSTIFIED";
              return (
                <li
                  key={d.catechumenProfileId}
                  className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold text-[#071A2D]">
                      {d.firstName} {d.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {d.status
                        ? t(`attendance_status.${d.status}`, {
                            defaultValue: d.status,
                          })
                        : t("attendance_status.none")}
                      {d.note ? ` — ${d.note}` : ""}
                    </p>
                  </div>
                  {canJustifyThis && meeting.status !== "CANCELLED" && (
                    <Button
                      variant="outline"
                      className="h-11 min-h-11 rounded-sm"
                      onClick={() => {
                        setJustifyFor(d.catechumenProfileId);
                        setNote(d.note || "");
                      }}
                    >
                      {t("action_justify")}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>

          {justifyFor && (
            <div className="space-y-3 rounded-sm border border-border/70 p-4">
              <Label htmlFor="justify-note">{t("justify_note_label")}</Label>
              <Textarea
                id="justify-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                maxLength={500}
                className="min-h-[88px]"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  className="h-11 min-h-11 rounded-sm"
                  disabled={saving || note.trim().length < 3}
                  onClick={submitJustify}
                >
                  {t("justify_submit")}
                </Button>
                <Button
                  variant="outline"
                  className="h-11 min-h-11 rounded-sm"
                  onClick={() => {
                    setJustifyFor(null);
                    setNote("");
                  }}
                >
                  {tc("cancel")}
                </Button>
              </div>
            </div>
          )}
        </AppPanel>
      )}

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" className="h-11 min-h-11 rounded-sm">
          <Link to="/app/calendar">
            <Calendar className="mr-2 h-4 w-4" />
            {t("open_calendar")}
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-11 min-h-11 rounded-sm">
          <Link to="/app/messages">
            <MessageSquare className="mr-2 h-4 w-4" />
            {t("open_messages")}
          </Link>
        </Button>
      </div>
    </div>
  );
}
