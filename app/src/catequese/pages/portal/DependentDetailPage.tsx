import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { useQuery, getPortalDependentDetail } from "wasp/client/operations";
import {
  AppPageHeader,
  AppPanel,
  AppEyebrow,
} from "../../../client/components/brand/AppChrome";
import { SkeletonPage } from "../../../client/components/Skeletons";
import { EmptyState } from "../../../client/components/EmptyState";
import { Button } from "../../../client/components/ui/button";
import { Badge } from "../../../client/components/ui/badge";
import { formatDate } from "../../../i18n/format";
import { useLocale } from "../../../i18n/useLocale";
import {
  Calendar,
  FileText,
  ArrowLeft,
  User,
  CheckCircle2,
} from "lucide-react";

/**
 * Family-portal dependent sheet — not the staff CatechumenDetailPage.
 */
export default function DependentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation("common");
  const { t: td } = useTranslation("dashboard");
  const { currentLocale } = useLocale();

  const { data, isLoading, error } = useQuery(
    getPortalDependentDetail,
    { id: id! },
    { enabled: !!id, staleTime: 30_000 },
  );

  if (isLoading) return <SkeletonPage />;

  if (error || !data) {
    return (
      <EmptyState
        icon={User}
        title={t("error_loading")}
        description={(error as Error)?.message}
      >
        <Button asChild variant="outline" className="h-11 min-h-11">
          <Link to="/app">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("back", { defaultValue: "Voltar" })}
          </Link>
        </Button>
      </EmptyState>
    );
  }

  const dateOpts = {
    weekday: "short" as const,
    day: "numeric" as const,
    month: "short" as const,
  };

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm" className="h-11 min-h-11 px-3">
          <Link to="/app" aria-label={t("back", { defaultValue: "Voltar" })}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
      </div>

      <AppPageHeader
        eyebrow={t("guardian_portal")}
        title={`${data.firstName} ${data.lastName}`.trim()}
        subtitle={data.classNames.join(", ") || t("no_class")}
      />

      {data.enrollments?.length > 0 && (
        <AppPanel>
          <AppEyebrow>{t("classes", { defaultValue: "Turmas" })}</AppEyebrow>
          <div className="mt-2 space-y-2">
            {data.enrollments.map((e) => (
              <div
                key={e.classId}
                className="rounded-sm border border-border/70 px-3 py-2.5 text-sm"
              >
                <p className="font-semibold text-[#071A2D]">{e.className}</p>
              </div>
            ))}
          </div>
        </AppPanel>
      )}

      {data.upcomingMeetings?.length > 0 && (
        <AppPanel>
          <AppEyebrow className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {t("upcoming_meetings")}
          </AppEyebrow>
          <div className="mt-2 divide-y divide-border/70">
            {data.upcomingMeetings.map((m) => (
              <Link
                key={m.id}
                to={`/app/meetings/${m.id}?dependentId=${data.id}`}
                className="flex min-h-11 items-center justify-between py-2.5 text-sm hover:bg-muted/30 -mx-1 px-1 rounded-sm"
              >
                <span className="truncate font-semibold text-[#071A2D]">
                  {m.title || m.theme || m.className || td("meeting_default")}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatDate(m.date, currentLocale, dateOpts)}
                </span>
              </Link>
            ))}
          </div>
        </AppPanel>
      )}

      {data.sacramentalProgress?.length > 0 && (
        <AppPanel>
          <AppEyebrow className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {td("pending_milestones")}
          </AppEyebrow>
          <div className="mt-2 space-y-2">
            {data.sacramentalProgress.map((j) => (
              <div
                key={j.journeyId}
                className="rounded-sm border border-border/70 px-3 py-2.5"
              >
                <p className="text-sm font-semibold text-[#071A2D]">
                  {j.journeyName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {j.completed}/{j.total}
                  {j.pendingRequired > 0
                    ? ` · ${j.pendingRequired} ${td("pending_milestones").toLowerCase()}`
                    : ""}
                </p>
              </div>
            ))}
          </div>
        </AppPanel>
      )}

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" className="h-11 min-h-11 rounded-sm">
          <Link to={`/app/documents?dependentId=${data.id}`}>
            <FileText className="mr-2 h-4 w-4" />
            {td("my_documents", { defaultValue: "Documentos" })}
            {data.documents?.filter((d) => !d.verifiedAt).length
              ? ` (${data.documents.filter((d) => !d.verifiedAt).length})`
              : ""}
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-11 min-h-11 rounded-sm">
          <Link to="/app/my-journey">
            {t("my_journey", { defaultValue: "Minha jornada" })}
          </Link>
        </Button>
      </div>

      {data.recentAttendance?.length > 0 && (
        <AppPanel>
          <AppEyebrow>{td("attendance_label")}</AppEyebrow>
          <div className="mt-2 space-y-1">
            {data.recentAttendance.map((r) => (
              <div
                key={r.id}
                className="flex min-h-11 items-center justify-between text-sm"
              >
                <span className="truncate text-[#071A2D]">
                  {r.meetingTitle || "—"}
                </span>
                <Badge variant="outline" className="shrink-0">
                  {r.status}
                </Badge>
              </div>
            ))}
          </div>
        </AppPanel>
      )}
    </div>
  );
}
