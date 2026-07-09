import { useState, useMemo, useCallback } from "react";
import { useQuery, listCatechumens } from "wasp/client/operations";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import {
  GraduationCap,
  Plus,
  LayoutGrid,
  List,
  Upload,
  Calendar,
  Search,
  Users,
  Loader2,
  ArrowRight,
  CheckCircle2,
  School,
  House,
} from "lucide-react";
import { Button } from "../../client/components/ui/button";
import { Badge } from "../../client/components/ui/badge";
import { SearchInput } from "../../client/components/SearchInput";
import { EmptyState } from "../../client/components/EmptyState";
import { SkeletonCard } from "../../client/components/Skeletons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../client/components/ui/select";
import { useActiveParish } from "../../client/hooks/useActiveParish";
import { useUserContext } from "../../client/hooks/useUserContext";
import { formatDateOnly, getAgeFromDate } from "../../i18n/format";
import { cn } from "../../client/utils";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import {
  AppDisplayTitle,
  AppPageHeader,
  AppPanel,
  AppMetric,
} from "../../client/components/brand/AppChrome";

const PAGE_SIZE = 50;

const AVATAR_COLORS = ["border border-border/70 bg-muted/30 text-foreground"];

function getAge(birthDate: string): number | null {
  return getAgeFromDate(birthDate);
}

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
    <AppPanel className={className}>
      <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </p>
      {children}
    </AppPanel>
  );
}

function CatechumenMetric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return <AppMetric label={label} value={value} />;
}

export default function CatechumensPage() {
  const { t, i18n } = useTranslation("common");
  const { t: tn } = useTranslation("navigation");
  const { activeParishId } = useActiveParish();
  const { userRole } = useUserContext();
  const canManageCatechumens = [
    "SUPER_ADMIN",
    "DIOCESE_ADMIN",
    "PARISH_COORDINATOR",
    "COMMUNITY_COORDINATOR",
    "LEAD_CATECHIST",
    "ASSISTANT_CATECHIST",
    "PERSONAL_OWNER",
  ].includes(userRole);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [view, setView] = useState<"cards" | "table">("cards");
  const [pages, setPages] = useState(1);

  const { data: catechumens = [], isLoading } = useQuery(listCatechumens, {
    take: PAGE_SIZE * pages,
    search: search || undefined,
  });

  const classNames = useMemo(() => {
    if (!catechumens || catechumens.length === 0) return [];
    const names = new Set<string>();
    catechumens.forEach(
      (c: any) => c.enrollments?.forEach((e: any) => names.add(e.class?.name)),
    );
    return [...names].filter(Boolean).sort();
  }, [catechumens]);

  const filtered = useMemo(() => {
    if (!catechumens || catechumens.length === 0) return [];
    let result = [...catechumens];
    if (activeParishId) {
      result = result.filter(
        (c: any) =>
          c.enrollments?.some(
            (e: any) => e.class?.parishId === activeParishId,
          ) ||
          c.household?.parishId === activeParishId ||
          (!c.enrollments?.length && !c.household?.parishId),
      );
    }
    if (classFilter && classFilter !== "all") {
      result = result.filter(
        (c: any) =>
          c.enrollments?.some((e: any) => e.class?.name === classFilter),
      );
    }
    return result;
  }, [catechumens, classFilter, activeParishId]);

  const enrolledCount = filtered.filter(
    (c: any) => c.enrollments && c.enrollments.length > 0,
  ).length;
  const noClassCount = filtered.filter(
    (c: any) => !c.enrollments || c.enrollments.length === 0,
  ).length;

  const hasMore = catechumens.length === PAGE_SIZE * pages;
  const loadMore = useCallback(() => setPages((p) => p + 1), []);

  const hasFilters = !!(search || (classFilter && classFilter !== "all"));

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-44 animate-pulse rounded bg-muted" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <AppPageHeader
        eyebrow={t("catechumens.eyebrow", { defaultValue: "Pessoas" })}
        title={tn("catechumens")}
        subtitle={t("catechumens.subtitle_registered", {
          count: catechumens.length || 0,
        })}
        actions={
          <>
            <Button
              variant="outline"
              className="h-10 rounded-sm"
              onClick={() =>
                setView((v) => (v === "cards" ? "table" : "cards"))
              }
            >
              {view === "cards" ? (
                <List className="mr-2 h-4 w-4" />
              ) : (
                <LayoutGrid className="mr-2 h-4 w-4" />
              )}
              {view === "cards" ? "Tabela" : "Cards"}
            </Button>
            {canManageCatechumens && (
              <>
                <Button variant="outline" className="h-10 rounded-sm" asChild>
                  <Link to="/app/catechumens/import">
                    <Upload className="mr-2 h-4 w-4" />
                    {t("import")}
                  </Link>
                </Button>
                <Button className="h-10 rounded-sm shadow-none" asChild>
                  <Link to="/app/catechumens/new">
                    <Plus className="mr-2 h-4 w-4" />
                    {t("new")}
                  </Link>
                </Button>
              </>
            )}
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <CatechumenMetric
          label={t("catechumens.metrics_visible", { defaultValue: "Visíveis" })}
          value={filtered.length}
        />
        <CatechumenMetric
          label={t("catechumens.metrics_enrolled", {
            defaultValue: "Em turmas",
          })}
          value={enrolledCount}
        />
        <CatechumenMetric
          label={t("catechumens.metrics_no_class", {
            defaultValue: "Sem turma",
          })}
          value={noClassCount}
        />
      </div>

      <AppPanel>
        <div className="flex flex-col gap-3 sm:flex-row">
          <SearchInput
            placeholder={t("catechumens.search_by_name")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            value={classFilter || "all"}
            onValueChange={(v) => setClassFilter(v)}
          >
            <SelectTrigger className="h-10 rounded-sm border-border/70 bg-white sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {t("catechumens.all_classes")}
              </SelectItem>
              {classNames.map((n) => (
                <SelectItem key={n} value={n}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </AppPanel>

      {filtered.length === 0 ? (
        hasFilters ? (
          <SurfaceSection title="Busca" icon={Search} tone="soft">
            <EmptyState
              compact
              icon={Search}
              title={t("no_results")}
              description={t("catechumens.adjust_filters")}
            />
          </SurfaceSection>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <SurfaceSection
              title="Primeiros cadastros"
              icon={CheckCircle2}
              tone="soft"
              className="p-6 lg:p-8"
            >
              <div className="space-y-6">
                <div className="space-y-2">
                  <AppDisplayTitle as="h2">
                    {t("no_catechumens")}
                  </AppDisplayTitle>
                  <div className="h-px w-10 bg-[#D39A2B]" aria-hidden />
                  <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                    {t("catechumens.empty_desc")}
                  </p>
                </div>

                {canManageCatechumens && (
                  <div className="flex flex-wrap gap-3">
                    <Button className="h-11 rounded-sm px-5" asChild>
                      <Link to="/app/catechumens/new">
                        {t("create_catechumen")}
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-11 rounded-sm px-5 bg-white"
                      asChild
                    >
                      <Link to="/app/catechumens/import">{t("import")}</Link>
                    </Button>
                  </div>
                )}
              </div>
            </SurfaceSection>

            <SurfaceSection title="Fluxo sugerido" icon={School}>
              <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                <div className="rounded-sm border border-border/70 bg-white px-4 py-3">
                  Cadastre nome, data de nascimento e responsaveis para iniciar
                  o acompanhamento.
                </div>
                <div className="rounded-sm border border-border/70 bg-white px-4 py-3">
                  Vincule o catequizando a uma turma para organizar encontros e
                  presenca.
                </div>
                <div className="rounded-sm border border-border/70 bg-white px-4 py-3">
                  Mantenha a ficha atualizada para sacramentos, comunicacao e
                  progresso pastoral.
                </div>
              </div>
            </SurfaceSection>
          </div>
        )
      ) : view === "table" ? (
        <section className="overflow-hidden rounded-sm border border-border/70 bg-white/90 ">
          <div className="border-b border-border/70 bg-muted/30 px-5 py-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {tn("catechumens")}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/20 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  <th className="p-4">{t("first_name")}</th>
                  <th className="p-4 hidden md:table-cell">{t("age")}</th>
                  <th className="p-4 hidden md:table-cell">
                    {t("catechumens.table_family")}
                  </th>
                  <th className="p-4 hidden lg:table-cell">
                    {t("catechumens.table_classes")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c: any) => (
                  <tr
                    key={c.id}
                    className="border-b border-border/60 last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="p-4">
                      <Link
                        to={`/app/catechumens/${c.id}`}
                        className="flex items-center gap-3 hover:text-[#071A2D]"
                      >
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-sm text-sm font-semibold overflow-hidden ${
                            !c.photoUrl
                              ? AVATAR_COLORS[
                                  Math.abs(c.firstName?.charCodeAt(0) || 0) %
                                    AVATAR_COLORS.length
                                ]
                              : ""
                          }`}
                        >
                          {c.photoUrl ? (
                            <img
                              src={c.photoUrl}
                              className="h-full w-full object-cover"
                              alt=""
                            />
                          ) : (
                            `${c.firstName?.[0] || ""}${c.lastName?.[0] || ""}`
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {c.firstName} {c.lastName}
                          </p>
                          {c.birthDate && (
                            <p className="text-overline text-muted-foreground">
                              <Calendar className="mr-0.5 inline h-3 w-3" />
                              {formatDateOnly(c.birthDate, i18n.language)}
                            </p>
                          )}
                        </div>
                      </Link>
                    </td>
                    <td className="p-4 hidden md:table-cell text-sm">
                      {getAge(c.birthDate)
                        ? t("catechumens.years_old", {
                            age: getAge(c.birthDate),
                          })
                        : "—"}
                    </td>
                    <td className="p-4 hidden md:table-cell text-sm">
                      {c.household?.name || "—"}
                    </td>
                    <td className="p-4 hidden lg:table-cell text-sm">
                      {c.enrollments
                        ?.map((e: any) => e.class.name)
                        .join(", ") || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c: any) => (
            <Link
              key={c.id}
              to={`/app/catechumens/${c.id}`}
              className="group overflow-hidden rounded-sm border border-border/70 bg-white p-5 transition-colors hover:border-[#071A2D]/30"
            >
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-sm text-base font-semibold ring-1 ring-border/70 ${
                    !c.photoUrl
                      ? AVATAR_COLORS[
                          Math.abs(c.firstName?.charCodeAt(0) || 0) %
                            AVATAR_COLORS.length
                        ]
                      : ""
                  }`}
                >
                  {c.photoUrl ? (
                    <img
                      src={c.photoUrl}
                      className="h-full w-full object-cover"
                      alt=""
                    />
                  ) : (
                    `${c.firstName?.[0] || ""}${c.lastName?.[0] || ""}`
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-lg font-semibold tracking-tight text-foreground group-hover:text-[#071A2D]">
                        {c.firstName} {c.lastName}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {getAge(c.birthDate)
                          ? t("catechumens.years_old", {
                              age: getAge(c.birthDate),
                            })
                          : ""}
                        {c.birthDate &&
                          `${getAge(c.birthDate) ? " · " : ""}${formatDateOnly(
                            c.birthDate,
                            i18n.language,
                            {
                              day: "2-digit",
                              month: "2-digit",
                              year: "2-digit",
                            },
                          )}`}
                      </p>
                    </div>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-sm border border-border/70 bg-white px-4 py-3">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    <School className="h-3.5 w-3.5" />
                    Turmas
                  </div>
                  <p className="mt-1 text-sm font-medium text-foreground">
                    {c.enrollments?.length
                      ? `${c.enrollments.length} vinculada(s)`
                      : t("catechumens.no_class")}
                  </p>
                </div>
                <div className="rounded-sm border border-border/70 bg-white px-4 py-3">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    <House className="h-3.5 w-3.5" />
                    Familia
                  </div>
                  <p className="mt-1 truncate text-sm font-medium text-foreground">
                    {c.household?.name || "Nao vinculada"}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {c.enrollments?.map((e: any) => (
                  <Badge
                    key={e.id}
                    variant="secondary"
                    className="text-overline"
                  >
                    {e.class?.name}
                  </Badge>
                ))}
                {(!c.enrollments || c.enrollments.length === 0) && (
                  <Badge variant="warning" className="text-overline">
                    {t("catechumens.no_class")}
                  </Badge>
                )}
              </div>

              {c.household?.name && (
                <div className="mt-4 border-t border-border/60 pt-4 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    {c.household.name}
                  </span>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        {t("catechumens.count", { count: filtered.length })}
      </p>

      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-sm bg-white"
            onClick={loadMore}
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
            {t("load_more")}
          </Button>
        </div>
      )}
    </div>
  );
}
