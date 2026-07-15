import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Button } from "../../../client/components/ui/button";
import {
  AppPageHeader,
  AppPanel,
  AppEyebrow,
} from "../../../client/components/brand/AppChrome";
import { EmptyState } from "../../../client/components/EmptyState";
import { formatDate } from "../../../i18n/format";
import { useLocale } from "../../../i18n/useLocale";
import { Heart, Calendar, MessageSquare, FileText } from "lucide-react";
import { EncounterFocusCard } from "./EncounterFocusCard";
import { useActiveParish } from "../../../client/hooks/useActiveParish";

interface GuardianDashboardProps {
  stats: any;
}

export function GuardianDashboard({ stats }: GuardianDashboardProps) {
  const { t } = useTranslation("common");
  const { t: tn } = useTranslation("navigation");
  const { currentLocale } = useLocale();
  const { activeParishId } = useActiveParish();

  const dateOpts = {
    weekday: "short" as const,
    day: "2-digit" as const,
    month: "2-digit" as const,
  };
  const hasDependents = stats?.dependents?.length > 0;

  return (
    <div className="space-y-8">
      <AppPageHeader
        eyebrow={t("guardian_portal")}
        title={t("guardian_portal")}
        subtitle={t("guardian_subtitle")}
      />

      <EncounterFocusCard workspaceId={activeParishId} />

      {hasDependents ? (
        <div className="grid gap-3 md:grid-cols-2">
          {stats.dependents.map((d: any) => (
            <div
              key={d.id}
              className="rounded-sm border border-border/70 bg-white p-5"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border border-border/70 bg-muted/30 text-sm font-semibold text-[#071A2D]">
                  {d.firstName?.[0]}
                  {d.lastName?.[0]}
                </div>
                <div className="min-w-0">
                  <p
                    className="truncate font-semibold tracking-tight text-[#071A2D]"
                    style={{ fontFamily: "var(--font-brand-display)" }}
                  >
                    {d.firstName} {d.lastName}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {d.enrollments?.map((e: any) => e.class.name).join(", ") ||
                      t("no_class")}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={Heart} title={t("no_dependents")} compact />
      )}

      {stats?.upcomingMeetings?.length > 0 && (
        <AppPanel>
          <div className="mb-3 space-y-1.5">
            <AppEyebrow className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {t("upcoming_meetings")}
            </AppEyebrow>
            <div className="h-px w-8 bg-[#D39A2B]" aria-hidden />
          </div>
          <div className="divide-y divide-border/70">
            {stats.upcomingMeetings.map((m: any) => (
              <Link
                key={m.id}
                to={`/app/meetings/${m.id}`}
                className="flex items-center justify-between py-2.5 text-sm transition-colors hover:bg-muted/30 -mx-1 px-1 rounded-sm"
              >
                <span
                  className="mr-2 truncate text-sm font-semibold tracking-tight text-[#071A2D]"
                  style={{ fontFamily: "var(--font-brand-display)" }}
                >
                  {m.class?.name}
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
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-11 min-h-11 rounded-sm">
          <Link to="/app/documents">
            <FileText className="mr-2 h-4 w-4" />
            {tn("documents")}
          </Link>
        </Button>
      </div>
    </div>
  );
}
