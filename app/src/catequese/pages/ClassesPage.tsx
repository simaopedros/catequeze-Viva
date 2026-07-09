import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, listClasses } from "wasp/client/operations";
import { Link } from "react-router";
import {
  Plus,
  Users,
  BookOpen,
  ClipboardList,
  Edit3,
  LayoutGrid,
  List,
  Clock,
  Search,
  User,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { Button } from "../../client/components/ui/button";
import { Badge } from "../../client/components/ui/badge";
import { FilterPills } from "../../client/components/FilterPills";
import { SearchInput } from "../../client/components/SearchInput";
import { EmptyState } from "../../client/components/EmptyState";
import { SkeletonCard } from "../../client/components/Skeletons";
import { useActiveWorkspace } from "../../client/hooks/useActiveWorkspace";
import { useUserContext } from "../../client/hooks/useUserContext";
import { getPlanLimits } from "../../shared/planLimits";
import { PlanLimitBanner } from "../components/PlanLimitBanner";
import { useClassFilters, useClassStatusMap } from "../../i18n/useLabels";
import { useLocale } from "../../i18n/useLocale";
import { formatDate } from "../../i18n/format";
import { cn } from "../../client/utils";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import {
  AppDisplayTitle,
  AppPageHeader,
  AppPanel,
} from "../../client/components/brand/AppChrome";

function SurfaceSection({
  title,
  children,
  className,
}: {
  title: string;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
  tone?: "default" | "soft";
}) {
  return (
    <section
      className={cn(
        "rounded-sm border border-border/70 bg-white p-5",
        className,
      )}
    >
      <div className="mb-4 space-y-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {title}
        </p>
        <div className="h-px w-8 bg-[#D39A2B]" aria-hidden />
      </div>
      {children}
    </section>
  );
}

function ClassMetric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-sm border border-border/70 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1.5 text-2xl font-semibold tracking-tight text-foreground tabular-nums">
        {value}
      </p>
    </div>
  );
}

export default function ClassesPage() {
  const { t } = useTranslation("classes");
  const { t: tc } = useTranslation("common");
  const classFilters = useClassFilters();
  const classStatusMap = useClassStatusMap();
  const { currentLocale } = useLocale();
  const { workspaceId, workspacePlan, isPersonal } = useActiveWorkspace();
  const { data: classes, isLoading } = useQuery(listClasses, {
    workspaceId,
  } as any);
  const { userRole } = useUserContext();
  const canCreateClass = userRole !== "ASSISTANT_CATECHIST";
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
  const activeLabel = classStatusMap.ACTIVE?.label || "Ativas";
  const draftLabel = classStatusMap.DRAFT?.label || "Rascunho";

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
    <div className="space-y-8">
      <AppPageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          <>
            {canCreateClass && !isClassLimitReached && (
              <Button asChild className="h-10 rounded-sm shadow-none">
                <Link to="/app/classes/new">
                  <Plus className="mr-2 h-4 w-4" />
                  {t("new_class")}
                </Link>
              </Button>
            )}
            <Button
              variant="outline"
              className="h-10 rounded-sm"
              onClick={() => setView((v) => (v === "grid" ? "list" : "grid"))}
              aria-label={view === "grid" ? t("view_list") : t("view_grid")}
            >
              {view === "grid" ? (
                <List className="mr-2 h-4 w-4" />
              ) : (
                <LayoutGrid className="mr-2 h-4 w-4" />
              )}
              {view === "grid" ? t("view_list") : t("view_grid")}
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <ClassMetric label={t("metrics_visible")} value={filtered.length} />
        <ClassMetric label={activeLabel} value={activeCount} />
        <ClassMetric label={draftLabel} value={draftCount} />
      </div>

      <AppPanel>
        <div className="space-y-4">
          <FilterPills
            options={filterOptions}
            value={filter}
            onChange={setFilter}
          />
          <SearchInput
            placeholder={t("search_placeholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {isClassLimitReached && (
            <PlanLimitBanner
              type="class_limit"
              currentCount={activeClassesCount}
              userPlan={effectivePlan}
              isParishManaged={!isPersonal}
              isPersonalWorkspace={isPersonal}
              compact
            />
          )}
        </div>
      </AppPanel>

      {filtered.length === 0 && !search ? (
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <SurfaceSection
            title="Primeiras turmas"
            icon={CheckCircle2}
            tone="soft"
            className="p-6 lg:p-8"
          >
            <div className="space-y-6">
              <div className="space-y-2">
                <AppDisplayTitle as="h2">
                  {t("no_classes")}
                </AppDisplayTitle>
                <div className="h-px w-10 bg-[#D39A2B]" aria-hidden />
                <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                  {t("no_classes_desc")}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-sm border border-border/70 bg-white px-4 py-4">
                  <p className="text-sm font-semibold text-foreground">
                    1. {t("empty_step1")}
                  </p>
                </div>
                <div className="rounded-sm border border-border/70 bg-white px-4 py-4">
                  <p className="text-sm font-semibold text-foreground">
                    2. {t("empty_step2")}
                  </p>
                </div>
                <div className="rounded-sm border border-border/70 bg-white px-4 py-4">
                  <p className="text-sm font-semibold text-foreground">
                    3. {t("empty_step3")}
                  </p>
                </div>
              </div>

              {isClassLimitReached ? (
                <PlanLimitBanner
                  type="class_limit"
                  currentCount={activeClassesCount}
                  userPlan={effectivePlan}
                  isParishManaged={!isPersonal}
                  isPersonalWorkspace={isPersonal}
                />
              ) : canCreateClass ? (
                <div className="flex flex-wrap gap-3">
                  <Button className="h-11 rounded-sm px-5" asChild>
                    <Link to="/app/classes/new">{t("create")}</Link>
                  </Button>
                </div>
              ) : null}
            </div>
          </SurfaceSection>

          <SurfaceSection title="Estrutura sugerida" icon={BookOpen}>
            <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              <div className="rounded-sm border border-border/70 bg-white px-4 py-3">
                Defina etapa, horario e catequista principal para cada turma.
              </div>
              <div className="rounded-sm border border-border/70 bg-white px-4 py-3">
                Cadastre os catequizandos para acompanhar presenca, encontros e
                progresso.
              </div>
              <div className="rounded-sm border border-border/70 bg-white px-4 py-3">
                Use a assistência editorial para preparar os encontros com
                mais consistência.
              </div>
            </div>
          </SurfaceSection>
        </div>
      ) : filtered.length === 0 ? (
        <SurfaceSection title="Busca" icon={Search} tone="soft">
          <EmptyState
            compact
            icon={Search}
            title={t("no_filter_results")}
            description={t("no_filter_desc")}
          />
        </SurfaceSection>
      ) : view === "list" ? (
        <section className="overflow-hidden rounded-sm border border-border/70 bg-white/90 ">
          <div className="border-b border-border/70 bg-muted/30 px-5 py-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {t("table_class")}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/20 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  <th className="p-4">{t("table_class")}</th>
                  <th className="p-4">{t("status")}</th>
                  <th className="p-4 hidden md:table-cell">{t("enrolled")}</th>
                  <th className="p-4 hidden md:table-cell">
                    {t("table_schedule")}
                  </th>
                  <th className="p-4">{tc("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((cls: any) => (
                  <tr
                    key={cls.id}
                    className="border-b border-border/60 last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="p-4">
                      <Link
                        to={`/app/classes/${cls.id}`}
                        className="font-medium text-sm hover:text-[#071A2D]"
                      >
                        {cls.name}
                      </Link>
                    </td>
                    <td className="p-4">
                      <Badge
                        variant={
                          classStatusMap[
                            cls.status as keyof typeof classStatusMap
                          ]?.variant || "secondary"
                        }
                        className="text-overline"
                      >
                        {classStatusMap[
                          cls.status as keyof typeof classStatusMap
                        ]?.label || cls.status}
                      </Badge>
                    </td>
                    <td className="p-4 hidden md:table-cell text-sm">
                      {cls._count?.enrollments || 0}
                    </td>
                    <td className="p-4 hidden md:table-cell text-sm text-muted-foreground">
                      {formatDay(cls.dayOfWeek)}
                      {cls.startTime && ` ${cls.startTime}`}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs"
                          asChild
                        >
                          <Link to={`/app/classes/${cls.id}`}>
                            <Edit3 className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs"
                          asChild
                        >
                          <Link to={`/app/classes/${cls.id}/attendance`}>
                            <ClipboardList className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((cls: any) => (
            <div
              key={cls.id}
              className="group overflow-hidden rounded-sm border border-border/70 bg-white p-5 transition-colors hover:border-[#071A2D]/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      to={`/app/classes/${cls.id}`}
                      className="block truncate text-lg font-semibold tracking-tight text-foreground hover:text-[#071A2D]"
                      style={{ fontFamily: "var(--font-brand-display)" }}
                    >
                      {cls.name}
                    </Link>
                    <Badge
                      variant={
                        classStatusMap[
                          cls.status as keyof typeof classStatusMap
                        ]?.variant || "secondary"
                      }
                      className="ml-2 shrink-0 text-overline"
                    >
                      {
                        classStatusMap[
                          cls.status as keyof typeof classStatusMap
                        ]?.label
                      }
                    </Badge>
                  </div>
                  {cls.stage && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {cls.stage.name}
                      {cls.parish?.name && ` · ${cls.parish.name}`}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-sm border border-border/70 bg-white px-4 py-3">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    {t("enrolled")}
                  </div>
                  <p className="mt-1 text-lg font-semibold text-foreground">
                    {cls._count?.enrollments || 0}
                  </p>
                </div>
                <div className="rounded-sm border border-border/70 bg-white px-4 py-3">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    {t("table_schedule")}
                  </div>
                  <p className="mt-1 text-sm font-medium text-foreground">
                    {cls.dayOfWeek != null && cls.dayOfWeek !== ""
                      ? `${formatDay(cls.dayOfWeek)}${
                          cls.startTime ? ` ${cls.startTime}` : ""
                        }`
                      : "Sem horario"}
                  </p>
                </div>
              </div>

              {cls.leadCatechist && (
                <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{cls.leadCatechist.firstName}</span>
                </div>
              )}

              {cls.meetings?.[0] && (
                <div
                  className={cn(
                    "mt-4 rounded-sm px-4 py-3 text-sm font-medium",
                    isToday(cls.meetings[0].date)
                      ? "border border-[#071A2D]/20 bg-muted/30 text-foreground"
                      : "border border-border/70 bg-muted/30 text-muted-foreground",
                  )}
                >
                  {isToday(cls.meetings[0].date)
                    ? t("meeting_today")
                    : t("next_meeting", {
                        date: formatDate(cls.meetings[0].date, currentLocale, {
                          day: "2-digit",
                          month: "2-digit",
                        }),
                      })}
                </div>
              )}

              <div className="mt-5 flex gap-2 border-t border-border/60 pt-4">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 flex-1 rounded-sm bg-white"
                  asChild
                >
                  <Link to={`/app/classes/${cls.id}/attendance`}>
                    <ClipboardList className="mr-2 h-3.5 w-3.5" />
                    {t("attendance")}
                  </Link>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 flex-1 rounded-sm bg-white"
                  asChild
                >
                  <Link to={`/app/classes/${cls.id}`}>
                    <Edit3 className="mr-2 h-3.5 w-3.5" />
                    {t("details")}
                  </Link>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-9 w-9 rounded-sm px-0"
                  asChild
                >
                  <Link to={`/app/classes/${cls.id}`} aria-label={t("details")}>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        {t("found_count", { count: filtered.length })}
      </p>
    </div>
  );
}
