import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  ChevronRight,
} from "lucide-react";
import { Button } from "../../../client/components/ui/button";
import { Progress } from "../../../client/components/ui/progress";
import {
  AppEyebrow,
  AppPanel,
} from "../../../client/components/brand/AppChrome";
import { cn } from "../../../client/utils";

export type ClassInsight = {
  id: string;
  name: string;
  enrollmentCount: number;
  attendanceRate: number | null;
  lowFrequencyCount: number;
  lastMeeting: {
    id: string;
    date: Date | string;
    presentCount: number;
    registeredCount: number;
    enrollmentCount: number;
  } | null;
};

function rateTone(rate: number | null): string {
  if (rate == null) return "text-muted-foreground";
  if (rate >= 75) return "text-brand-ink";
  if (rate >= 50) return "text-brand-gold-muted";
  return "text-destructive";
}

function SingleClass({ cls }: { cls: ClassInsight }) {
  const { t } = useTranslation("dashboard");
  const last = cls.lastMeeting;

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-ink/8 text-brand-ink"
            aria-hidden
          >
            <BookOpen className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold tracking-tight text-brand-ink">
              {cls.name}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t("catechumens_count", { count: cls.enrollmentCount })}
            </p>
          </div>
        </div>
        <Button
          asChild
          variant="outline"
          size="sm"
          className="shrink-0 rounded-md"
        >
          <Link to={`/app/classes/${cls.id}`}>
            {t("open_class")}
            <ArrowRight aria-hidden />
          </Link>
        </Button>
      </div>

      <dl className="grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs text-muted-foreground">
            {t("attendance_avg_label")}
          </dt>
          <dd
            className={cn(
              "mt-0.5 font-sans text-title-sm font-semibold tabular-nums",
              rateTone(cls.attendanceRate),
            )}
          >
            {cls.attendanceRate == null
              ? t("mobile.no_attendance")
              : `${cls.attendanceRate}%`}
          </dd>
          <Progress
            value={cls.attendanceRate ?? 0}
            aria-label={t("attendance_avg_label")}
            className="mt-2 h-1.5"
          />
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">{t("last_meeting")}</dt>
          <dd className="mt-0.5 text-sm text-brand-ink">
            {last ? (
              <Link
                to={`/app/meetings/${last.id}`}
                className="underline-offset-4 hover:underline"
              >
                <span className="font-semibold tabular-nums text-success">
                  {t("present_count", { count: last.presentCount })}
                </span>{" "}
                <span className="text-muted-foreground">
                  {t("of_registered", {
                    total: last.registeredCount || last.enrollmentCount,
                  })}
                </span>
              </Link>
            ) : (
              <span className="text-muted-foreground">
                {t("no_meetings_yet")}
              </span>
            )}
          </dd>
        </div>
      </dl>

      {cls.lowFrequencyCount > 0 ? (
        <Link
          to={`/app/classes/${cls.id}/reports`}
          className="group mt-auto flex min-h-11 items-center justify-between gap-3 rounded-md border border-brand-gold/30 bg-brand-gold/8 px-3 py-2.5 text-sm text-brand-ink transition-colors hover:bg-brand-gold/12"
        >
          <span className="inline-flex items-center gap-2">
            <AlertTriangle
              className="h-4 w-4 shrink-0 text-brand-gold-muted"
              aria-hidden
            />
            {t("low_frequency_count", { count: cls.lowFrequencyCount })}
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-brand-ink" />
        </Link>
      ) : (
        <p className="mt-auto text-xs text-muted-foreground">
          {t("class_all_clear")}
        </p>
      )}
    </div>
  );
}

function ClassRow({ cls }: { cls: ClassInsight }) {
  const { t } = useTranslation("dashboard");
  return (
    <Link
      to={`/app/classes/${cls.id}`}
      className="group flex min-h-11 items-center gap-3 border-b border-border/60 py-3 last:border-0 transition-colors hover:bg-muted/20"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-semibold tracking-tight text-brand-ink">
            {cls.name}
          </p>
          <span
            className={cn(
              "shrink-0 text-sm font-semibold tabular-nums",
              rateTone(cls.attendanceRate),
            )}
          >
            {cls.attendanceRate == null ? "—" : `${cls.attendanceRate}%`}
          </span>
        </div>
        <Progress value={cls.attendanceRate ?? 0} className="mt-1.5 h-1" />
        <p className="mt-1.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
          <span>{t("catechumens_count", { count: cls.enrollmentCount })}</span>
          {cls.lowFrequencyCount > 0 && (
            <span className="inline-flex items-center gap-1 text-brand-gold-muted">
              <AlertTriangle className="h-3 w-3" aria-hidden />
              {t("low_frequency_count", { count: cls.lowFrequencyCount })}
            </span>
          )}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-brand-ink" />
    </Link>
  );
}

interface MyClassesCardProps {
  classes: ClassInsight[];
  className?: string;
}

export function MyClassesCard({ classes, className }: MyClassesCardProps) {
  const { t } = useTranslation("dashboard");
  const { t: tc } = useTranslation("common");
  if (classes.length === 0) return null;
  const single = classes.length === 1;

  return (
    <AppPanel
      density="compact"
      className={cn("flex flex-col gap-4", className)}
      data-testid="dashboard-my-classes"
    >
      <div className="flex items-center justify-between gap-3">
        <AppEyebrow>{single ? t("my_class") : tc("my_classes")}</AppEyebrow>
        {!single && (
          <Link
            to="/app/classes"
            className="text-xs font-medium text-brand-ink underline-offset-4 hover:underline"
          >
            {t("see_all")}
          </Link>
        )}
      </div>
      {single ? (
        <SingleClass cls={classes[0]} />
      ) : (
        <div className="-my-1">
          {classes.slice(0, 5).map((c) => (
            <ClassRow key={c.id} cls={c} />
          ))}
        </div>
      )}
    </AppPanel>
  );
}
