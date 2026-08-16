import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Button } from "../../../client/components/ui/button";
import {
  AppPageHeader,
  AppPanel,
  AppMetric,
  AppEyebrow,
} from "../../../client/components/brand/AppChrome";
import { formatDate } from "../../../i18n/format";
import { useLocale } from "../../../i18n/useLocale";
import { FileText, Calendar, MessageSquare } from "lucide-react";
import { EncounterFocusCard } from "./EncounterFocusCard";
import { useActiveParish } from "../../../client/hooks/useActiveParish";

interface CatechumenDashboardProps {
  stats: any;
}

export function CatechumenDashboard({ stats }: CatechumenDashboardProps) {
  const { t } = useTranslation("common");
  const { t: td } = useTranslation("dashboard");
  const { t: tn } = useTranslation("navigation");
  const { currentLocale } = useLocale();
  const { activeParishId } = useActiveParish();

  const dateOpts = {
    weekday: "short" as const,
    day: "numeric" as const,
    month: "short" as const,
  };

  return (
    <div className="space-y-8">
      <AppPageHeader
        eyebrow={t("catechumen_journey")}
        title={t("catechumen_journey")}
        subtitle={t("catechumen_subtitle")}
      />

      <EncounterFocusCard workspaceId={activeParishId} forceFamilySurface />

      <div className="grid gap-3 md:grid-cols-3">
        <AppMetric
          label={td("pending_milestones")}
          value={stats?.pendingSacraments || 0}
        />
        <AppMetric
          label={t("upcoming_meetings")}
          value={stats?.upcomingMeetings?.length || 0}
        />
        <AppMetric
          label={td("attendance_label")}
          value={`${stats?.avgAttendance || 0}%`}
        />
      </div>

      {stats?.upcomingMeetings?.length > 0 && (
        <AppPanel>
          <div className="mb-3 space-y-1.5">
            <AppEyebrow>{t("upcoming_meetings")}</AppEyebrow>
            <div className="h-px w-8 bg-brand-gold" aria-hidden />
          </div>
          <div className="divide-y divide-border/70">
            {stats.upcomingMeetings.map((m: any) => (
              <Link
                key={m.id}
                to={`/app/meetings/${m.id}`}
                className="flex items-center justify-between py-2.5 text-sm transition-colors hover:bg-muted/30 -mx-1 px-1 rounded-sm"
              >
                <span className="mr-2 truncate text-sm font-semibold tracking-tight text-brand-ink">
                  {m.title || m.theme || m.class?.name || td("meeting_default")}
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
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-11 min-h-11 rounded-sm">
          <Link to="/app/documents">
            <FileText className="mr-2 h-4 w-4" />
            {td("my_documents")}
          </Link>
        </Button>
      </div>
    </div>
  );
}
