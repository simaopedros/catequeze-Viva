import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { AlertCircle, ArrowRight, Upload, UserPlus } from "lucide-react";
import { useQuery, getEncounterFocus } from "wasp/client/operations";
import {
  AppDisplayTitle,
  AppEyebrow,
  AppGoldRule,
  AppListLink,
  AppPanel,
} from "../../../client/components/brand/AppChrome";
import { Button } from "../../../client/components/ui/button";
import { useActiveParish } from "../../../client/hooks/useActiveParish";
import { useFamilyPortalSurface } from "../../../client/hooks/useFamilyPortalSurface";
import { computeActivationFlags } from "../../../shared/activation";
import { buildNextActions } from "../../../shared/dashboardActions";
import { formatDashboardAvgAttendance } from "../../../shared/displayName";
import type { EncounterFocus } from "../../../shared/encounter";
import { ActivationChecklist } from "./ActivationChecklist";
import { DashboardHero } from "./DashboardHero";
import { NextActionsPanel } from "./NextActionsPanel";
import { MyCatechesisMetrics } from "./MyCatechesisMetrics";
import { MyClassesCard } from "./MyClassesCard";
import { UpcomingBirthdaysCard } from "./UpcomingBirthdaysCard";
import { QuickActionsGrid } from "./QuickActionsGrid";
import { RecentMeetingsList } from "./RecentMeetingsList";
import { RhemaPreviewCard } from "./RhemaPreviewCard";

interface CoordinatorDashboardProps {
  stats: any;
}

function PastoralAlerts({
  alerts,
}: {
  alerts: { type: string; message: string }[];
}) {
  const { t } = useTranslation("dashboard");
  if (!alerts?.length) return null;
  return (
    <AppPanel density="compact" className="min-w-0 space-y-3">
      <AppEyebrow>{t("pastoral_alerts")}</AppEyebrow>
      <ul className="space-y-2">
        {alerts.map((a, i) => (
          <li
            key={i}
            className="flex items-start gap-3 rounded-md border border-border/70 bg-muted/20 px-3 py-2.5"
          >
            <AlertCircle
              className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
              aria-hidden
            />
            <p className="text-sm font-medium leading-relaxed tracking-tight text-brand-ink">
              {a.message}
            </p>
          </li>
        ))}
      </ul>
    </AppPanel>
  );
}

function FirstStepsPanel() {
  const { t } = useTranslation("dashboard");
  return (
    <AppPanel className="space-y-6">
      <div className="space-y-2.5">
        <AppEyebrow>{t("first_steps")}</AppEyebrow>
        <AppDisplayTitle as="h2">{t("no_classes_yet")}</AppDisplayTitle>
        <AppGoldRule />
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          {t("no_classes_description")}
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button asChild className="h-11 min-h-11 rounded-md">
          <Link to="/app/classes/new">
            {t("create_class")}
            <ArrowRight aria-hidden />
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-11 min-h-11 rounded-md">
          <Link to="/app/catechumens/import">
            <Upload aria-hidden />
            {t("import_catechumens")}
          </Link>
        </Button>
      </div>
      <div>
        <AppListLink
          to="/app/classes/new"
          title={t("create_class")}
          description={t("empty_class_card_desc")}
        />
        <AppListLink
          to="/app/catechumens/import"
          title={t("import_catechumens")}
          description={t("empty_catechumen_card_desc")}
        />
      </div>
    </AppPanel>
  );
}

export function CoordinatorDashboard({ stats }: CoordinatorDashboardProps) {
  const { t } = useTranslation("dashboard");
  const { activeParishId } = useActiveParish();
  const { surfaceArg } = useFamilyPortalSurface();

  const hasClasses = (stats?.activeClasses || 0) > 0;
  const hasCatechumens = (stats?.activeCatechumens || 0) > 0;
  const activation = useMemo(() => computeActivationFlags(stats), [stats]);
  const showActivationChrome = !activation.firstValueReached;

  const { data: focus } = useQuery(
    getEncounterFocus,
    { workspaceId: activeParishId || undefined, ...surfaceArg },
    { enabled: hasClasses, staleTime: 30_000, refetchOnWindowFocus: false },
  );

  const actions = useMemo(
    () =>
      buildNextActions(stats, (focus as EncounterFocus | undefined) ?? null),
    [stats, focus],
  );

  const facts = [
    {
      label: t("fact_catechumens"),
      value: stats?.activeCatechumens ?? 0,
    },
    {
      label: t("fact_upcoming_meetings"),
      value: stats?.upcomingMeetings?.length ?? 0,
    },
    {
      label: t("fact_attendance"),
      value: formatDashboardAvgAttendance({
        hasAnyAttendance: stats?.hasAnyAttendance,
        avgAttendance: stats?.avgAttendance,
        openRollCallIncomplete: stats?.openRollCallIncomplete,
        noDataLabel: t("mobile.no_attendance"),
      }),
    },
  ];

  const classInsights =
    stats?.classInsights ??
    (stats?.myClasses ?? []).map((c: any) => ({
      id: c.id,
      name: c.name,
      enrollmentCount: c.enrollmentCount ?? c._count?.enrollments ?? 0,
      attendanceRate: null,
      lowFrequencyCount: 0,
      lastMeeting: null,
    }));

  return (
    <div className="space-y-4 sm:space-y-6" data-testid="coordinator-dashboard">
      {/* 1) Onboarding — one highlighted next step until first value */}
      {showActivationChrome && <ActivationChecklist stats={stats} />}

      {/* 2) Human, contextual header: greeting, date, search, create CTAs */}
      <DashboardHero />

      {hasClasses ? (
        <>
          {/* 3) What needs doing now */}
          <NextActionsPanel actions={actions} facts={facts} />

          <RhemaPreviewCard />

          {/* 4) Context numbers, secondary to the actions */}
          <MyCatechesisMetrics stats={stats} />

          {/* 5) Class health · people · shortcuts and history */}
          <div className="grid gap-4 sm:gap-5 md:grid-cols-2 2xl:grid-cols-[1.15fr_0.95fr_0.95fr]">
            <MyClassesCard classes={classInsights} />
            <UpcomingBirthdaysCard birthdays={stats?.upcomingBirthdays ?? []} />
            <div className="grid min-w-0 gap-4 sm:gap-5 md:col-span-2 md:grid-cols-2 2xl:col-span-1 2xl:grid-cols-1">
              <QuickActionsGrid />
              <RecentMeetingsList meetings={stats?.recentMeetings ?? []} />
              <PastoralAlerts alerts={stats?.recentAlerts ?? []} />
            </div>
          </div>

          {!hasCatechumens && !showActivationChrome && (
            <AppPanel density="compact" className="space-y-3">
              <AppEyebrow>{t("registration_section")}</AppEyebrow>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t("no_catechumens_description")}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" className="rounded-md">
                  <Link to="/app/catechumens/new">
                    <UserPlus aria-hidden />
                    {t("register_first_catechumen")}
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="rounded-md"
                >
                  <Link to="/app/catechumens/import">
                    {t("import_catechumens")}
                  </Link>
                </Button>
              </div>
            </AppPanel>
          )}
        </>
      ) : (
        // No class yet: the checklist (when not dismissed) drives the first
        // step; this block guarantees the screen is never empty otherwise.
        <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <FirstStepsPanel />
          <div className="space-y-5">
            <RhemaPreviewCard />
            <PastoralAlerts alerts={stats?.recentAlerts ?? []} />
            <AppPanel density="compact" className="space-y-3">
              <AppEyebrow>{t("how_to_start")}</AppEyebrow>
              <ol className="space-y-2 text-sm leading-relaxed text-muted-foreground">
                <li className="rounded-md border border-border/70 px-3 py-2.5">
                  1. {t("how_to_start_1")}
                </li>
                <li className="rounded-md border border-border/70 px-3 py-2.5">
                  2. {t("how_to_start_2")}
                </li>
                <li className="rounded-md border border-border/70 px-3 py-2.5">
                  3. {t("how_to_start_3")}
                </li>
              </ol>
            </AppPanel>
          </div>
        </div>
      )}
    </div>
  );
}
