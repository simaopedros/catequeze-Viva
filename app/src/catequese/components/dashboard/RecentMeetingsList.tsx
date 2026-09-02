import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Calendar, ChevronRight } from "lucide-react";
import {
  AppEyebrow,
  AppPanel,
} from "../../../client/components/brand/AppChrome";
import { cn } from "../../../client/utils";
import { formatDate } from "../../../i18n/format";
import { useLocale } from "../../../i18n/useLocale";

export type RecentMeeting = {
  id: string;
  title: string | null;
  theme: string | null;
  date: Date | string;
  status: string;
  class: { id: string; name: string };
  registeredCount: number;
  presentCount: number;
  enrollmentCount: number;
};

interface RecentMeetingsListProps {
  meetings: RecentMeeting[];
  limit?: number;
  className?: string;
}

export function RecentMeetingsList({
  meetings,
  limit = 3,
  className,
}: RecentMeetingsListProps) {
  const { t } = useTranslation("dashboard");
  const { currentLocale } = useLocale();
  if (meetings.length === 0) return null;

  return (
    <AppPanel
      density="compact"
      className={cn("space-y-2", className)}
      data-testid="dashboard-recent-meetings"
    >
      <div className="flex items-center justify-between gap-3">
        <AppEyebrow>{t("recent_meetings")}</AppEyebrow>
        <Link
          to="/app/calendar"
          className="text-xs font-medium text-brand-ink underline-offset-4 hover:underline"
        >
          {t("see_all")}
        </Link>
      </div>
      <ul className="divide-y divide-border/60">
        {meetings.slice(0, limit).map((m) => {
          const total = m.registeredCount || m.enrollmentCount;
          const unregistered = m.registeredCount === 0;
          return (
            <li key={m.id}>
              <Link
                to={`/app/meetings/${m.id}`}
                className="group flex min-h-11 items-center gap-3 py-2.5 transition-colors hover:text-brand-ink-soft"
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-ink/8 text-brand-ink"
                  aria-hidden
                >
                  <Calendar className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold tracking-tight text-brand-ink">
                    {m.title || m.theme || t("meeting_default")}
                    <span className="font-normal text-muted-foreground">
                      {" · "}
                      {m.class.name}
                    </span>
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {unregistered ? (
                      <span className="text-brand-gold-muted">
                        {t("attendance_not_registered")}
                      </span>
                    ) : (
                      <>
                        <span className="font-semibold tabular-nums text-success">
                          {t("present_count", { count: m.presentCount })}
                        </span>{" "}
                        {t("of_registered", { total })}
                      </>
                    )}
                  </span>
                </span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {formatDate(m.date, currentLocale, {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-brand-ink" />
              </Link>
            </li>
          );
        })}
      </ul>
    </AppPanel>
  );
}
