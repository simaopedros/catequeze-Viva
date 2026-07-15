import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { useQuery, getCatechumenPortalDashboard } from "wasp/client/operations";
import { Button } from "../../../client/components/ui/button";
import {
  AppPageHeader,
  AppPanel,
  AppMetric,
  AppEyebrow,
} from "../../../client/components/brand/AppChrome";
import { SkeletonPage } from "../../../client/components/Skeletons";
import { EmptyState } from "../../../client/components/EmptyState";
import { formatDate } from "../../../i18n/format";
import { useLocale } from "../../../i18n/useLocale";
import {
  FileText,
  Calendar,
  MessageSquare,
  ChevronRight,
  Route,
  Heart,
} from "lucide-react";
import { EncounterFocusCard } from "./EncounterFocusCard";
import { useActiveParish } from "../../../client/hooks/useActiveParish";

/** @deprecated stats prop kept for DashboardPage fallback */
interface CatechumenDashboardProps {
  stats?: any;
}

export function CatechumenDashboard({ stats: _legacyStats }: CatechumenDashboardProps) {
  const { t } = useTranslation("common");
  const { t: td } = useTranslation("dashboard");
  const { t: tn } = useTranslation("navigation");
  const { currentLocale } = useLocale();
  const { activeParishId } = useActiveParish();

  const { data, isLoading, error } = useQuery(
    getCatechumenPortalDashboard,
    { parishId: activeParishId || undefined },
    { staleTime: 30_000, refetchOnWindowFocus: false },
  );

  if (isLoading) return <SkeletonPage />;

  if (error) {
    return (
      <EmptyState
        icon={Heart}
        title={t("error_loading")}
        description={(error as Error)?.message}
      />
    );
  }

  const dateOpts = {
    weekday: "short" as const,
    day: "numeric" as const,
    month: "short" as const,
  };

  const next = data?.nextMeeting;
  const pendingDocs = data?.pendingDocumentCount || 0;
  const unread = data?.messages?.unreadCount || 0;
  const progress = data?.sacramentalProgress || [];
  const pendingMilestones = progress.reduce((s, p) => s + p.pendingRequired, 0);

  return (
    <div className="space-y-8">
      <AppPageHeader
        eyebrow={t("catechumen_journey")}
        title={
          data?.profile
            ? `${data.profile.firstName} ${data.profile.lastName}`.trim()
            : t("catechumen_journey")
        }
        subtitle={t("catechumen_subtitle")}
      />

      <EncounterFocusCard workspaceId={activeParishId || data?.workspaceId} />

      {next && (
        <AppPanel className="space-y-3">
          <AppEyebrow className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {t("next_meeting", { defaultValue: "Próximo encontro" })}
          </AppEyebrow>
          <div>
            <p
              className="text-lg font-semibold tracking-tight text-[#071A2D]"
              style={{ fontFamily: "var(--font-brand-display)" }}
            >
              {next.title || next.theme || next.className || td("meeting_default")}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatDate(next.date, currentLocale, {
                weekday: "long",
                day: "numeric",
                month: "long",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          <Button asChild className="h-11 min-h-11 w-full rounded-sm sm:w-auto">
            <Link to={`/app/meetings/${next.id}`}>
              {t("view_meeting", { defaultValue: "Ver encontro" })}
              <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </AppPanel>
      )}

      <div className="grid gap-3 md:grid-cols-3">
        <AppMetric label={td("pending_milestones")} value={pendingMilestones} />
        <AppMetric
          label={t("upcoming_meetings")}
          value={data?.upcomingMeetings?.length || 0}
        />
        <AppMetric label={td("pending_documents")} value={pendingDocs} />
      </div>

      {progress.length > 0 && (
        <AppPanel>
          <AppEyebrow className="flex items-center gap-1.5">
            <Route className="h-3.5 w-3.5" />
            {t("my_journey", { defaultValue: "Minha jornada" })}
          </AppEyebrow>
          <div className="mt-2 space-y-2">
            {progress.map((j) => {
              const pct =
                j.total > 0 ? Math.round((j.completed / j.total) * 100) : 0;
              return (
                <Link
                  key={j.journeyId}
                  to="/app/my-journey"
                  className="block min-h-11 rounded-sm border border-border/70 px-3 py-2.5 hover:bg-muted/30"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-[#071A2D]">
                      {j.journeyName}
                    </p>
                    <span className="text-xs text-muted-foreground">{pct}%</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-[#D39A2B]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        </AppPanel>
      )}

      {data?.upcomingMeetings && data.upcomingMeetings.length > 1 && (
        <AppPanel>
          <div className="mb-3 space-y-1.5">
            <AppEyebrow>{t("upcoming_meetings")}</AppEyebrow>
            <div className="h-px w-8 bg-[#D39A2B]" aria-hidden />
          </div>
          <div className="divide-y divide-border/70">
            {data.upcomingMeetings.slice(1).map((m) => (
              <Link
                key={m.id}
                to={`/app/meetings/${m.id}`}
                className="flex min-h-11 items-center justify-between py-2.5 text-sm transition-colors hover:bg-muted/30 -mx-1 px-1 rounded-sm"
              >
                <span
                  className="mr-2 truncate text-sm font-semibold tracking-tight text-[#071A2D]"
                  style={{ fontFamily: "var(--font-brand-display)" }}
                >
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

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" className="h-11 min-h-11 rounded-sm">
          <Link to="/app/calendar">
            <Calendar className="mr-2 h-4 w-4" />
            {tn("calendar")}
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-11 min-h-11 rounded-sm">
          <Link to="/app/messages">
            <MessageSquare className="mr-2 h-4 w-4" />
            {tn("messages")}
            {unread > 0 ? ` (${unread})` : ""}
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-11 min-h-11 rounded-sm">
          <Link to="/app/documents">
            <FileText className="mr-2 h-4 w-4" />
            {td("my_documents")}
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-11 min-h-11 rounded-sm">
          <Link to="/app/my-journey">
            <Route className="mr-2 h-4 w-4" />
            {t("my_journey", { defaultValue: "Jornada" })}
          </Link>
        </Button>
      </div>
    </div>
  );
}
