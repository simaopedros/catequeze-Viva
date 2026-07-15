import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { useQuery, getGuardianPortalDashboard } from "wasp/client/operations";
import { Button } from "../../../client/components/ui/button";
import {
  AppPageHeader,
  AppPanel,
  AppEyebrow,
  AppMetric,
} from "../../../client/components/brand/AppChrome";
import { EmptyState } from "../../../client/components/EmptyState";
import { SkeletonPage } from "../../../client/components/Skeletons";
import { formatDate } from "../../../i18n/format";
import { useLocale } from "../../../i18n/useLocale";
import {
  Heart,
  Calendar,
  MessageSquare,
  FileText,
  Shield,
  ChevronRight,
  Route,
} from "lucide-react";
import { EncounterFocusCard } from "./EncounterFocusCard";
import { useActiveParish } from "../../../client/hooks/useActiveParish";
import { cn } from "../../../client/utils";

/** @deprecated stats prop kept for DashboardPage fallback when query disabled */
interface GuardianDashboardProps {
  stats?: any;
}

export function GuardianDashboard({ stats: _legacyStats }: GuardianDashboardProps) {
  const { t } = useTranslation("common");
  const { t: tn } = useTranslation("navigation");
  const { t: td } = useTranslation("dashboard");
  const { currentLocale } = useLocale();
  const { activeParishId } = useActiveParish();
  const [dependentId, setDependentId] = useState<string | undefined>();

  const { data, isLoading, error } = useQuery(
    getGuardianPortalDashboard,
    {
      parishId: activeParishId || undefined,
      dependentId,
    },
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
    day: "2-digit" as const,
    month: "2-digit" as const,
  };

  const dependents = data?.dependents || [];
  const hasDependents = dependents.length > 0;
  const next = data?.nextMeeting;
  const pendingDocs = data?.pendingDocumentCount || 0;
  const pendingConsents = data?.consents?.pendingMinorConsents || 0;
  const unread = data?.messages?.unreadCount || 0;
  const progress = data?.sacramentalProgress || [];

  return (
    <div className="space-y-8">
      <AppPageHeader
        eyebrow={t("guardian_portal")}
        title={t("guardian_portal")}
        subtitle={t("guardian_subtitle")}
      />

      {/* Dependent selector */}
      {dependents.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setDependentId(undefined)}
            className={cn(
              "min-h-11 rounded-sm border px-3 py-2 text-sm font-medium",
              !dependentId
                ? "border-[#071A2D] bg-[#071A2D] text-white"
                : "border-border/70 bg-white text-[#071A2D]",
            )}
          >
            {t("all", { defaultValue: "Todos" })}
          </button>
          {dependents.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setDependentId(d.id)}
              className={cn(
                "min-h-11 rounded-sm border px-3 py-2 text-sm font-medium",
                dependentId === d.id
                  ? "border-[#071A2D] bg-[#071A2D] text-white"
                  : "border-border/70 bg-white text-[#071A2D]",
              )}
            >
              {d.firstName}
            </button>
          ))}
        </div>
      )}

      <EncounterFocusCard
        workspaceId={activeParishId || data?.workspaceId}
        enabled
      />

      {/* Next meeting CTA */}
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
              {next.className ? ` · ${next.className}` : ""}
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

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <AppMetric label={td("pending_documents")} value={pendingDocs} />
        <AppMetric
          label={tn("consents")}
          value={pendingConsents}
        />
        <AppMetric label={tn("messages")} value={unread} />
        <AppMetric
          label={td("pending_milestones")}
          value={progress.reduce((s, p) => s + p.pendingRequired, 0)}
        />
      </div>

      {hasDependents ? (
        <div className="grid gap-3 md:grid-cols-2">
          {dependents
            .filter((d) => !dependentId || d.id === dependentId)
            .map((d) => (
              <Link
                key={d.id}
                to={`/app/dependents/${d.id}`}
                className="flex min-h-11 items-center gap-3 rounded-sm border border-border/70 bg-white p-5 transition-colors hover:bg-muted/30"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border border-border/70 bg-muted/30 text-sm font-semibold text-[#071A2D]">
                  {d.firstName?.[0]}
                  {d.lastName?.[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className="truncate font-semibold tracking-tight text-[#071A2D]"
                    style={{ fontFamily: "var(--font-brand-display)" }}
                  >
                    {d.firstName} {d.lastName}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {d.classNames?.join(", ") || t("no_class")}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
              </Link>
            ))}
        </div>
      ) : (
        <EmptyState icon={Heart} title={t("no_dependents")} compact />
      )}

      {/* Consents / docs alerts */}
      {(pendingDocs > 0 || pendingConsents > 0) && (
        <AppPanel className="space-y-2">
          <AppEyebrow>{t("pending_actions", { defaultValue: "Pendências" })}</AppEyebrow>
          {pendingDocs > 0 && (
            <Link
              to="/app/documents"
              className="flex min-h-11 items-center justify-between rounded-sm border border-border/70 px-3 py-2 text-sm hover:bg-muted/30"
            >
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {td("pending_documents")}: {pendingDocs}
              </span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          )}
          {pendingConsents > 0 && (
            <Link
              to="/app/consents"
              className="flex min-h-11 items-center justify-between rounded-sm border border-border/70 px-3 py-2 text-sm hover:bg-muted/30"
            >
              <span className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                {tn("consents")}: {pendingConsents}
              </span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          )}
        </AppPanel>
      )}

      {progress.length > 0 && (
        <AppPanel>
          <AppEyebrow className="flex items-center gap-1.5">
            <Route className="h-3.5 w-3.5" />
            {t("catechumen_journey")}
          </AppEyebrow>
          <div className="mt-2 space-y-2">
            {progress.map((j) => (
              <Link
                key={j.journeyId}
                to="/app/my-journey"
                className="flex min-h-11 items-center justify-between rounded-sm border border-border/70 px-3 py-2 text-sm hover:bg-muted/30"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[#071A2D]">
                    {j.journeyName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {j.catechumenName} · {j.completed}/{j.total}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0" />
              </Link>
            ))}
          </div>
        </AppPanel>
      )}

      {data?.upcomingMeetings && data.upcomingMeetings.length > 1 && (
        <AppPanel>
          <div className="mb-3 space-y-1.5">
            <AppEyebrow className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {t("upcoming_meetings")}
            </AppEyebrow>
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
                  {m.className}
                  {m.title || m.theme ? ` — ${m.title || m.theme}` : ""}
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
            {t("calendar")}
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
            {tn("documents")}
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-11 min-h-11 rounded-sm">
          <Link to="/app/consents">
            <Shield className="mr-2 h-4 w-4" />
            {tn("consents")}
          </Link>
        </Button>
      </div>
    </div>
  );
}
