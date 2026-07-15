import { useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { useQuery, getEncounterFocus } from "wasp/client/operations";
import { Button } from "../../../client/components/ui/button";
import { Badge } from "../../../client/components/ui/badge";
import {
  AppPanel,
  AppEyebrow,
} from "../../../client/components/brand/AppChrome";
import { formatDate } from "../../../i18n/format";
import { useLocale } from "../../../i18n/useLocale";
import {
  Calendar,
  MapPin,
  ChevronRight,
  MoreHorizontal,
  Users,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../client/components/ui/dropdown-menu";

interface EncounterFocusCardProps {
  workspaceId?: string | null;
  /** When false, skip query (e.g. institutional dashboard). Default true. */
  enabled?: boolean;
}

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  NOT_STARTED: "outline",
  IN_PROGRESS: "default",
  COMPLETED: "secondary",
  CANCELLED: "destructive",
};

export function EncounterFocusCard({
  workspaceId,
  enabled = true,
}: EncounterFocusCardProps) {
  const { t } = useTranslation("meetings");
  const { currentLocale } = useLocale();
  const [dependentId, setDependentId] = useState<string | undefined>(undefined);

  const { data, isLoading, error } = useQuery(
    getEncounterFocus,
    {
      workspaceId: workspaceId || undefined,
      dependentId,
    },
    {
      enabled,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  );

  if (!enabled) return null;

  if (isLoading) {
    return (
      <AppPanel className="animate-pulse space-y-3">
        <div className="h-3 w-24 rounded bg-muted" />
        <div className="h-6 w-2/3 rounded bg-muted" />
        <div className="h-4 w-1/2 rounded bg-muted" />
        <div className="h-11 w-full rounded bg-muted" />
      </AppPanel>
    );
  }

  if (error || !data) {
    return null;
  }

  const meeting = data.meeting;
  const ctaLabel = t(data.primaryCta.labelKey, {
    defaultValue: t("encounter.cta.view"),
  });

  return (
    <AppPanel className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1.5 min-w-0">
          <AppEyebrow className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {t(`encounter.focus_kind.${data.focusKind}`, {
              defaultValue: t("encounter.focus_kind.none"),
            })}
          </AppEyebrow>
          <div className="h-px w-8 bg-[#D39A2B]" aria-hidden />
        </div>
        {data.secondaryActions?.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 min-h-11 min-w-11 shrink-0 rounded-sm"
                aria-label={t("encounter.more_actions")}
              >
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {data.secondaryActions.map((a: any) => (
                <DropdownMenuItem key={a.id} asChild>
                  <Link to={a.href}>
                    {t(a.labelKey, { defaultValue: a.id })}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {data.dependents && data.dependents.length > 1 && (
        <div className="flex flex-wrap gap-2" role="tablist">
          {data.dependents.map((d: any) => {
            const selected =
              (dependentId || data.dependent?.id) === d.id;
            return (
              <button
                key={d.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setDependentId(d.id)}
                className={`inline-flex h-11 min-h-11 items-center rounded-sm border px-3 text-sm font-medium transition-colors ${
                  selected
                    ? "border-[#071A2D] bg-[#071A2D] text-white"
                    : "border-border/70 bg-white text-[#071A2D] hover:bg-muted/40"
                }`}
              >
                <Users className="mr-1.5 h-3.5 w-3.5" />
                {d.firstName}
              </button>
            );
          })}
        </div>
      )}

      {!meeting ? (
        <div className="space-y-3">
          <p
            className="text-base font-semibold tracking-tight text-[#071A2D]"
            style={{ fontFamily: "var(--font-brand-display)" }}
          >
            {t("encounter.empty_title")}
          </p>
          <p className="text-sm text-muted-foreground">
            {t("encounter.empty_desc")}
          </p>
          {data.primaryCta.action !== "NONE" || data.primaryCta.href ? (
            <Button asChild className="h-11 min-h-11 w-full rounded-sm sm:w-auto">
              <Link to={data.primaryCta.href}>
                {ctaLabel}
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={STATUS_VARIANT[meeting.status] || "outline"}>
              {t(`status.${meeting.status}`, {
                defaultValue: meeting.status,
              })}
            </Badge>
            {data.dependent && (
              <span className="text-xs text-muted-foreground">
                {data.dependent.firstName} {data.dependent.lastName}
              </span>
            )}
          </div>

          <div>
            <h2
              className="text-lg font-semibold tracking-tight text-[#071A2D] sm:text-xl"
              style={{ fontFamily: "var(--font-brand-display)" }}
            >
              {meeting.title || meeting.theme || t("no_title")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {meeting.class?.name}
              {meeting.theme && meeting.title ? ` · ${meeting.theme}` : ""}
            </p>
          </div>

          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div className="flex items-start gap-2">
              <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <dt className="sr-only">{t("date")}</dt>
                <dd className="font-medium text-[#071A2D]">
                  {formatDate(meeting.date, currentLocale, {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </dd>
              </div>
            </div>
            {meeting.locationHint && (
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <dd className="font-medium text-[#071A2D]">
                  {meeting.locationHint}
                </dd>
              </div>
            )}
          </dl>

          {data.attendanceSummary && (
            <p className="text-sm text-muted-foreground">
              {data.attendanceSummary.myStatus != null ||
              data.attendanceSummary.totalActive === 1
                ? t("encounter.attendance_self", {
                    status: data.attendanceSummary.myStatus
                      ? t(
                          `attendance_status.${data.attendanceSummary.myStatus}`,
                          {
                            defaultValue: data.attendanceSummary.myStatus,
                          },
                        )
                      : t("attendance_status.none"),
                  })
                : t("attendance_progress", {
                    registered: data.attendanceSummary.registered,
                    total: data.attendanceSummary.totalActive,
                  })}
            </p>
          )}

          {data.preparation && roleShowsPrep(data) && (
            <p className="text-xs text-muted-foreground">
              {data.preparation.hasContent
                ? t("encounter.prep_ready", {
                    title: data.preparation.contentTitle || "",
                  })
                : t("encounter.prep_missing")}
            </p>
          )}

          {data.materialsReleased && data.materialsReleased.length > 0 && (
            <ul className="space-y-1 text-sm">
              {data.materialsReleased.map((mat: any) => (
                <li key={mat.id} className="text-muted-foreground">
                  {t("encounter.material")}: {mat.title}
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center">
            <Button
              asChild
              className="h-11 min-h-11 w-full rounded-sm shadow-none sm:w-auto sm:min-w-[12rem]"
            >
              <Link to={data.primaryCta.href}>
                {ctaLabel}
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      )}
    </AppPanel>
  );
}

function roleShowsPrep(data: any): boolean {
  return Boolean(data?.preparation);
}
