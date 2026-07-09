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
import { GraduationCap, FileText } from "lucide-react";

interface CatechumenDashboardProps {
  stats: any;
}

export function CatechumenDashboard({ stats }: CatechumenDashboardProps) {
  const { t } = useTranslation("common");
  const { t: td } = useTranslation("dashboard");
  const { currentLocale } = useLocale();

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
            <div className="h-px w-8 bg-[#D39A2B]" aria-hidden />
          </div>
          <div className="divide-y divide-border/70">
            {stats.upcomingMeetings.map((m: any) => (
              <div
                key={m.id}
                className="flex items-center justify-between py-2.5 text-sm"
              >
                <span className="mr-2 truncate font-medium">
                  {m.class?.name || td("meeting_default")}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatDate(m.date, currentLocale, dateOpts)}
                </span>
              </div>
            ))}
          </div>
        </AppPanel>
      )}

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" className="h-10 rounded-sm">
          <Link to="/app/sacramental-journeys">
            <GraduationCap className="mr-2 h-4 w-4" />
            {td("my_sacramental_journey")}
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-10 rounded-sm">
          <Link to="/app/documents">
            <FileText className="mr-2 h-4 w-4" />
            {td("my_documents")}
          </Link>
        </Button>
      </div>
    </div>
  );
}
