import { useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { useQuery, getPortalMyJourney } from "wasp/client/operations";
import {
  AppPageHeader,
  AppPanel,
  AppEyebrow,
  AppMetric,
} from "../../../client/components/brand/AppChrome";
import { SkeletonPage } from "../../../client/components/Skeletons";
import { EmptyState } from "../../../client/components/EmptyState";
import { Button } from "../../../client/components/ui/button";
import { formatDate } from "../../../i18n/format";
import { useLocale } from "../../../i18n/useLocale";
import { useActiveParish } from "../../../client/hooks/useActiveParish";
import { Calendar, Route, Heart } from "lucide-react";
import { cn } from "../../../client/utils";

/**
 * Read-only sacramental journey view for the family portal.
 */
export default function MyJourneyPage() {
  const { t } = useTranslation("common");
  const { t: td } = useTranslation("dashboard");
  const { currentLocale } = useLocale();
  const { activeParishId } = useActiveParish();
  const [dependentId, setDependentId] = useState<string | undefined>();

  const { data, isLoading, error } = useQuery(
    getPortalMyJourney,
    { dependentId, parishId: activeParishId || undefined },
    { staleTime: 30_000 },
  );

  if (isLoading) return <SkeletonPage />;

  if (error) {
    return (
      <EmptyState
        icon={Route}
        title={t("error_loading")}
        description={(error as Error)?.message}
      />
    );
  }

  const dependents = data?.dependents || [];
  const progress = data?.sacramentalProgress || [];
  const meetings = data?.upcomingMeetings || [];
  const dateOpts = {
    weekday: "short" as const,
    day: "numeric" as const,
    month: "short" as const,
  };

  const totalPending = progress.reduce((s, p) => s + p.pendingRequired, 0);
  const totalDone = progress.reduce((s, p) => s + p.completed, 0);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <AppPageHeader
        eyebrow={t("catechumen_journey")}
        title={t("my_journey", { defaultValue: "Minha jornada" })}
        subtitle={t("catechumen_subtitle")}
      />

      {dependents.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setDependentId(undefined)}
            className={cn(
              "min-h-11 rounded-sm border px-3 py-2 text-sm font-medium transition-colors",
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
                "min-h-11 rounded-sm border px-3 py-2 text-sm font-medium transition-colors",
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

      <div className="grid grid-cols-2 gap-3">
        <AppMetric label={td("pending_milestones")} value={totalPending} />
        <AppMetric
          label={t("completed", { defaultValue: "Concluídos" })}
          value={totalDone}
        />
      </div>

      {progress.length === 0 ? (
        <EmptyState
          icon={Heart}
          title={t("no_journey", { defaultValue: "Nenhuma jornada ativa" })}
          compact
        />
      ) : (
        <div className="space-y-3">
          {progress.map((j) => {
            const pct =
              j.total > 0 ? Math.round((j.completed / j.total) * 100) : 0;
            return (
              <AppPanel key={j.journeyId}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#071A2D]">
                      {j.journeyName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {j.catechumenName}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-[#071A2D]">
                    {pct}%
                  </span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-[#D39A2B]"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {j.completed}/{j.total}
                  {j.pendingRequired > 0
                    ? ` · ${j.pendingRequired} ${td("pending_milestones").toLowerCase()}`
                    : ""}
                </p>
              </AppPanel>
            );
          })}
        </div>
      )}

      {meetings.length > 0 && (
        <AppPanel>
          <AppEyebrow className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {t("upcoming_meetings")}
          </AppEyebrow>
          <div className="mt-2 divide-y divide-border/70">
            {meetings.map((m) => (
              <Link
                key={m.id}
                to={`/app/meetings/${m.id}`}
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

      <Button asChild variant="outline" className="h-11 min-h-11 w-full rounded-sm">
        <Link to="/app/calendar">{t("calendar", { defaultValue: "Agenda" })}</Link>
      </Button>
    </div>
  );
}
