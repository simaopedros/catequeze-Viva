import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, listClasses } from "wasp/client/operations";
import { Link, useNavigate } from "react-router";
import {
  Plus,
  Users,
  ClipboardList,
  Clock,
  Search,
  User,
  MoreHorizontal,
  X,
} from "lucide-react";
import { Button } from "../../client/components/ui/button";
import { Badge } from "../../client/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../client/components/ui/dropdown-menu";
import { FilterPills } from "../../client/components/FilterPills";
import { SearchInput } from "../../client/components/SearchInput";
import { EmptyState } from "../../client/components/EmptyState";
import { SkeletonCard } from "../../client/components/Skeletons";
import { ResponsiveTable } from "../../client/components/ResponsiveTable";
import { useActiveWorkspace } from "../../client/hooks/useActiveWorkspace";
import { useUserContext } from "../../client/hooks/useUserContext";
import { getPlanLimits } from "../../shared/planLimits";
import { canManageWorkspaceBilling } from "../../shared/billingAccess";
import { PlanLimitBanner } from "../components/PlanLimitBanner";
import { useClassFilters, useClassStatusMap } from "../../i18n/useLabels";
import { useLocale } from "../../i18n/useLocale";
import { formatDate } from "../../i18n/format";
import { cn } from "../../client/utils";
import {
  AppDisplayTitle,
  AppPageHeader,
  AppPanel,
  AppMetric,
  AppEyebrow,
  AppGoldRule,
} from "../../client/components/brand/AppChrome";

export default function ClassesPage() {
  const { t } = useTranslation("classes");
  const { t: tc } = useTranslation("common");
  const classFilters = useClassFilters();
  const classStatusMap = useClassStatusMap();
  const { currentLocale } = useLocale();
  const navigate = useNavigate();
  const { workspaceId, workspacePlan, isPersonal } = useActiveWorkspace();
  const { data: classes, isLoading } = useQuery(listClasses, {
    workspaceId,
  } as any);
  const { userRole, isAdmin } = useUserContext();
  const canCreateClass = userRole !== "ASSISTANT_CATECHIST";
  const canManageBilling = canManageWorkspaceBilling(userRole, {
    isPersonalOwner: isPersonal,
    isAdmin,
  });
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");

  const effectivePlan = workspacePlan || "catechist_free";
  const limits = getPlanLimits(effectivePlan);
  const activeClassesCount = classes
    ? classes.filter((c: any) => c.status !== "ARCHIVED").length
    : 0;
  const isClassLimitReached =
    limits.maxClasses !== null && activeClassesCount >= limits.maxClasses;

  const filtered = useMemo(() => {
    if (!classes) return [];
    let result = [...classes];
    if (filter) result = result.filter((c: any) => c.status === filter);
    if (search)
      result = result.filter((c: any) =>
        c.name.toLowerCase().includes(search.toLowerCase()),
      );
    return result;
  }, [classes, filter, search]);

  const activeCount = filtered.filter((c: any) => c.status === "ACTIVE").length;
  const draftCount = filtered.filter((c: any) => c.status === "DRAFT").length;
  const activeLabel = classStatusMap.ACTIVE?.label || t("active");
  const draftLabel = classStatusMap.DRAFT?.label || t("status");

  const hasFilters = Boolean(search || filter);

  const filterOptions = useMemo(
    () =>
      classFilters.map((f) => ({
        value: f.status,
        label:
          f.status === "" && classes
            ? `${f.label} (${classes.length})`
            : f.label,
      })),
    [classFilters, classes],
  );

  const formatDay = (dayOfWeek: string | number | null | undefined) => {
    if (dayOfWeek === null || dayOfWeek === undefined || dayOfWeek === "")
      return "";
    return t(`days_long.${dayOfWeek}`);
  };

  const isToday = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  };

  const clearFilters = () => {
    setSearch("");
    setFilter("");
  };

  const scheduleLabel = (cls: any) => {
    if (cls.dayOfWeek != null && cls.dayOfWeek !== "") {
      return `${formatDay(cls.dayOfWeek)}${
        cls.startTime ? ` ${cls.startTime}` : ""
      }`;
    }
    return t("no_schedule");
  };

  const nextActionLabel = (cls: any) => {
    if (cls.meetings?.[0] && isToday(cls.meetings[0].date)) {
      return t("meeting_today");
    }
    if (cls.meetings?.[0]) {
      return t("next_meeting", {
        date: formatDate(cls.meetings[0].date, currentLocale, {
          day: "2-digit",
          month: "2-digit",
        }),
      });
    }
    return t("attendance");
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-40 animate-pulse rounded bg-muted" />
        <div className="flex gap-2">
          {classFilters.map((f) => (
            <div
              key={f.status}
              className="h-8 w-20 animate-pulse rounded-sm bg-muted"
            />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <AppPageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        subtitle={t("subtitle")}
        primaryAction={
          canCreateClass && !isClassLimitReached
            ? { label: t("new_class"), href: "/app/classes/new" }
            : undefined
        }
        secondaryActions={[
          {
            label: view === "grid" ? t("view_list") : t("view_grid"),
            onClick: () => setView((v) => (v === "grid" ? "list" : "grid")),
          },
        ]}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <AppMetric label={t("metrics_visible")} value={filtered.length} />
        <AppMetric label={activeLabel} value={activeCount} />
        <AppMetric label={draftLabel} value={draftCount} />
      </div>

      <AppPanel density="compact">
        <div className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <SearchInput
                placeholder={t("search_placeholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <FilterPills
              options={filterOptions}
              value={filter}
              onChange={setFilter}
              onClear={() => setFilter("")}
              clearValue=""
            />
          </div>

          {/* Active filters + result count (always visible on mobile) */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <p className="text-muted-foreground">
              {t("found_count", { count: filtered.length })}
            </p>
            {hasFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 min-h-9 gap-1 rounded-sm text-brand-ink"
                onClick={clearFilters}
              >
                <X className="h-3.5 w-3.5" />
                {tc("clear_filters")}
              </Button>
            )}
          </div>

          {isClassLimitReached && (
            <PlanLimitBanner
              type="class_limit"
              currentCount={activeClassesCount}
              userPlan={effectivePlan}
              isParishManaged={!isPersonal}
              isPersonalWorkspace={isPersonal}
              canManageBilling={canManageBilling}
              compact
            />
          )}
        </div>
      </AppPanel>

      {filtered.length === 0 && !search && !filter ? (
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <AppPanel className="p-6 lg:p-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <AppEyebrow>{t("first_classes")}</AppEyebrow>
                <AppDisplayTitle as="h2">{t("no_classes")}</AppDisplayTitle>
                <AppGoldRule />
                <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                  {t("no_classes_desc")}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {[t("empty_step1"), t("empty_step2"), t("empty_step3")].map(
                  (step, i) => (
                    <div
                      key={i}
                      className="rounded-sm border border-border/70 bg-surface-elevated px-4 py-4"
                    >
                      <p
                        className="text-sm font-semibold tracking-tight text-brand-ink"
                        style={{ fontFamily: "var(--font-brand-display)" }}
                      >
                        {i + 1}. {step}
                      </p>
                    </div>
                  ),
                )}
              </div>

              {isClassLimitReached ? (
                <PlanLimitBanner
                  type="class_limit"
                  currentCount={activeClassesCount}
                  userPlan={effectivePlan}
                  isParishManaged={!isPersonal}
                  isPersonalWorkspace={isPersonal}
                  canManageBilling={canManageBilling}
                />
              ) : canCreateClass ? (
                <Button className="h-11 min-h-11 rounded-sm px-5" asChild>
                  <Link to="/app/classes/new">
                    <Plus className="mr-2 h-4 w-4" />
                    {t("create")}
                  </Link>
                </Button>
              ) : null}
            </div>
          </AppPanel>

          <AppPanel>
            <div className="mb-4 space-y-1.5">
              <AppEyebrow>{t("suggested_structure")}</AppEyebrow>
              <AppGoldRule className="w-8" />
            </div>
            <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              <div className="rounded-sm border border-border/70 bg-surface-elevated px-4 py-3">
                {t("suggested_1")}
              </div>
              <div className="rounded-sm border border-border/70 bg-surface-elevated px-4 py-3">
                {t("suggested_2")}
              </div>
              <div className="rounded-sm border border-border/70 bg-surface-elevated px-4 py-3">
                {t("suggested_3")}
              </div>
            </div>
          </AppPanel>
        </div>
      ) : filtered.length === 0 ? (
        <AppPanel>
          <EmptyState
            compact
            icon={Search}
            title={t("no_filter_results")}
            description={t("no_filter_desc")}
          >
            <Button
              type="button"
              variant="outline"
              className="mt-4 h-11 min-h-11 rounded-sm"
              onClick={clearFilters}
            >
              {tc("clear_filters")}
            </Button>
          </EmptyState>
        </AppPanel>
      ) : view === "list" ? (
        <ResponsiveTable
          data={filtered}
          getRowKey={(cls: any) => cls.id}
          onRowClick={(cls: any) => navigate(`/app/classes/${cls.id}`)}
          columns={[
            {
              key: "name",
              header: t("table_class"),
              render: (cls: any) => (
                <span
                  className="font-semibold tracking-tight text-brand-ink"
                  style={{ fontFamily: "var(--font-brand-display)" }}
                >
                  {cls.name}
                </span>
              ),
            },
            {
              key: "status",
              header: t("status"),
              render: (cls: any) => (
                <Badge
                  variant={
                    classStatusMap[cls.status as keyof typeof classStatusMap]
                      ?.variant || "secondary"
                  }
                  className="text-overline"
                >
                  {classStatusMap[cls.status as keyof typeof classStatusMap]
                    ?.label || cls.status}
                </Badge>
              ),
            },
            {
              key: "enrolled",
              header: t("enrolled"),
              hideOnMobile: true,
              render: (cls: any) => cls._count?.enrollments || 0,
            },
            {
              key: "schedule",
              header: t("table_schedule"),
              hideOnMobile: true,
              render: (cls: any) => (
                <span className="text-muted-foreground">
                  {scheduleLabel(cls)}
                </span>
              ),
            },
            {
              key: "actions",
              header: tc("actions"),
              render: (cls: any) => (
                <div
                  className="relative z-10 flex gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-11 w-11 min-h-11 p-0"
                    asChild
                  >
                    <Link
                      to={`/app/classes/${cls.id}/attendance`}
                      aria-label={t("attendance")}
                    >
                      <ClipboardList className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              ),
            },
          ]}
          renderMobileCard={(cls: any) => (
            <ClassMobileCard
              cls={cls}
              statusLabel={
                classStatusMap[cls.status as keyof typeof classStatusMap]
                  ?.label || cls.status
              }
              statusVariant={
                classStatusMap[cls.status as keyof typeof classStatusMap]
                  ?.variant || "secondary"
              }
              schedule={scheduleLabel(cls)}
              nextAction={nextActionLabel(cls)}
              enrolledLabel={t("enrolled")}
              attendanceLabel={t("attendance")}
              detailsLabel={t("details")}
            />
          )}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((cls: any) => (
            <article
              key={cls.id}
              className="group relative overflow-hidden rounded-sm border border-border/70 bg-surface-elevated p-5 transition-colors hover:border-brand-ink/30"
            >
              <Link
                to={`/app/classes/${cls.id}`}
                className="absolute inset-0 z-0 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label={cls.name}
              />
              <div className="relative z-[1] pointer-events-none">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate text-lg font-semibold tracking-tight text-brand-ink group-hover:text-brand-ink-soft"
                      style={{ fontFamily: "var(--font-brand-display)" }}
                    >
                      {cls.name}
                    </p>
                    {cls.stage && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {cls.stage.name}
                        {cls.parish?.name && ` · ${cls.parish.name}`}
                      </p>
                    )}
                  </div>
                  <Badge
                    variant={
                      classStatusMap[cls.status as keyof typeof classStatusMap]
                        ?.variant || "secondary"
                    }
                    className="ml-2 shrink-0 text-overline"
                  >
                    {
                      classStatusMap[cls.status as keyof typeof classStatusMap]
                        ?.label
                    }
                  </Badge>
                </div>

                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    {cls._count?.enrollments || 0} {t("enrolled").toLowerCase()}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    {scheduleLabel(cls)}
                  </span>
                </div>

                {cls.leadCatechist && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span>{cls.leadCatechist.firstName}</span>
                  </div>
                )}

                <div
                  className={cn(
                    "mt-4 rounded-sm px-3 py-2.5 text-sm font-medium",
                    cls.meetings?.[0] && isToday(cls.meetings[0].date)
                      ? "border border-brand-ink/20 bg-muted/30 font-semibold text-brand-ink"
                      : "border border-border/70 bg-muted/20 text-muted-foreground",
                  )}
                >
                  {nextActionLabel(cls)}
                </div>
              </div>

              {/* Primary CTA + overflow — re-enable pointer events */}
              <div className="relative z-[1] mt-4 flex gap-2 border-t border-border/60 pt-4 pointer-events-auto">
                <Button
                  size="sm"
                  className="h-11 min-h-11 flex-1 rounded-sm shadow-none"
                  asChild
                >
                  <Link to={`/app/classes/${cls.id}/attendance`}>
                    <ClipboardList className="mr-2 h-3.5 w-3.5" />
                    {t("attendance")}
                  </Link>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-11 w-11 min-h-11 rounded-sm px-0"
                      aria-label={tc("actions")}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link to={`/app/classes/${cls.id}`}>{t("details")}</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to={`/app/classes/${cls.id}/attendance`}>
                        {t("attendance")}
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function ClassMobileCard({
  cls,
  statusLabel,
  statusVariant,
  schedule,
  nextAction,
  enrolledLabel,
  attendanceLabel,
  detailsLabel,
}: {
  cls: any;
  statusLabel: string;
  statusVariant: any;
  schedule: string;
  nextAction: string;
  enrolledLabel: string;
  attendanceLabel: string;
  detailsLabel: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <p
          className="text-base font-semibold text-brand-ink"
          style={{ fontFamily: "var(--font-brand-display)" }}
        >
          {cls.name}
        </p>
        <Badge variant={statusVariant} className="shrink-0 text-overline">
          {statusLabel}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground">
        {cls._count?.enrollments || 0} {enrolledLabel.toLowerCase()} ·{" "}
        {schedule}
      </p>
      <p className="text-sm font-medium text-brand-ink">{nextAction}</p>
      <div
        className="flex gap-2 pt-1"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <Button size="sm" className="h-10 min-h-10 flex-1 rounded-sm" asChild>
          <Link to={`/app/classes/${cls.id}/attendance`}>
            {attendanceLabel}
          </Link>
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-10 min-h-10 rounded-sm"
          asChild
        >
          <Link to={`/app/classes/${cls.id}`}>{detailsLabel}</Link>
        </Button>
      </div>
    </div>
  );
}
