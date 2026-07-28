import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery, listCatechumens } from "wasp/client/operations";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import useDebounce from "../../client/hooks/useDebounce";
import {
  Calendar,
  Search,
  Loader2,
  ArrowRight,
  CheckCircle2,
  School,
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

const AVATAR_COLORS = ["border border-border/70 bg-muted/30 text-brand-ink"];

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
      <div className="mb-4 space-y-1.5">
        <p className="text-xs font-medium tracking-wide text-muted-foreground">
          {title}
        </p>
        <div className="h-px w-8 bg-brand-gold" aria-hidden />
      </div>
      {children}
    </AppPanel>
  );
}

function CatechumenMetric({
  label,
  value,
  className,
}: {
  label: string;
  value: string | number;
  className?: string;
}) {
  return <AppMetric className={className} label={label} value={value} />;
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
  const debouncedSearch = useDebounce(search, 400);
  const [classFilter, setClassFilter] = useState("");
  const [view, setView] = useState<"cards" | "table">("cards");
  /** Accumulated pages — never re-fetch earlier pages when loading more */
  const [items, setItems] = useState<any[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);

  const serverSearch =
    debouncedSearch.trim().length >= 2 ? debouncedSearch.trim() : undefined;

  // Reset accumulation when filters/workspace change
  useEffect(() => {
    setItems([]);
    setNextCursor(null);
    setCursor(null);
  }, [debouncedSearch, classFilter, activeParishId]);

  const {
    data: pageData,
    isLoading,
    isFetching,
  } = useQuery(
    listCatechumens,
    {
      take: PAGE_SIZE,
      paginated: true,
      cursor: cursor || undefined,
      search: serverSearch,
      workspaceId: activeParishId || undefined,
    } as any,
    { enabled: Boolean(activeParishId) },
  );

  useEffect(() => {
    if (!pageData || typeof pageData !== "object" || !("items" in pageData)) {
      return;
    }
    const page = pageData as { items: any[]; nextCursor: string | null };
    setItems((prev) => {
      if (!cursor) return page.items;
      const seen = new Set(prev.map((p) => p.id));
      const appended = page.items.filter((p) => !seen.has(p.id));
      return [...prev, ...appended];
    });
    setNextCursor(page.nextCursor);
  }, [pageData, cursor]);

  const catechumens = items;

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
    if (classFilter && classFilter !== "all") {
      result = result.filter(
        (c: any) =>
          c.enrollments?.some((e: any) => e.class?.name === classFilter),
      );
    }
    return result;
  }, [catechumens, classFilter]);

  const enrolledCount = filtered.filter(
    (c: any) => c.enrollments && c.enrollments.length > 0,
  ).length;
  const noClassCount = filtered.filter(
    (c: any) => !c.enrollments || c.enrollments.length === 0,
  ).length;

  const hasMore = Boolean(nextCursor);
  const loadMore = useCallback(() => {
    if (nextCursor && !isFetching) setCursor(nextCursor);
  }, [nextCursor, isFetching]);

  const hasFilters = !!(search || (classFilter && classFilter !== "all"));

  if (isLoading && items.length === 0) {
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
    <div className="space-y-5 sm:space-y-8">
      <AppPageHeader
        eyebrow={t("catechumens.eyebrow", { defaultValue: "Pessoas" })}
        title={tn("catechumens")}
        subtitle={t("catechumens.subtitle_registered", {
          count: catechumens.length || 0,
        })}
        primaryAction={
          canManageCatechumens
            ? { label: t("new"), href: "/app/catechumens/new" }
            : undefined
        }
        secondaryActions={[
          {
            label: view === "cards" ? t("view_table") : t("view_cards"),
            onClick: () => setView((v) => (v === "cards" ? "table" : "cards")),
            desktopOnly: true,
          },
          ...(canManageCatechumens
            ? [
                {
                  label: t("import"),
                  href: "/app/catechumens/import",
                },
              ]
            : []),
        ]}
      />

      <div className="flex snap-x gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-3 sm:gap-3 sm:overflow-visible">
        <CatechumenMetric
          className="min-w-[8.5rem] snap-start sm:min-w-0"
          label={t("catechumens.metrics_visible", { defaultValue: "Visíveis" })}
          value={filtered.length}
        />
        <CatechumenMetric
          className="min-w-[8.5rem] snap-start sm:min-w-0"
          label={t("catechumens.metrics_enrolled", {
            defaultValue: "Em turmas",
          })}
          value={enrolledCount}
        />
        <CatechumenMetric
          className="min-w-[8.5rem] snap-start sm:min-w-0"
          label={t("catechumens.metrics_no_class", {
            defaultValue: "Sem turma",
          })}
          value={noClassCount}
        />
      </div>

      <AppPanel density="compact">
        <div className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="min-w-0 flex-1">
              <SearchInput
                placeholder={t("catechumens.search_by_name")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select
              value={classFilter || "all"}
              onValueChange={(v) => setClassFilter(v)}
            >
              <SelectTrigger className="h-11 min-h-11 rounded-sm border-border/70 bg-surface-elevated sm:w-48">
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
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <p className="text-muted-foreground">
              {t("catechumens.count", { count: filtered.length })}
            </p>
            {hasFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 min-h-9 rounded-sm text-brand-ink"
                onClick={() => {
                  setSearch("");
                  setClassFilter("all");
                }}
              >
                {t("clear_filters")}
              </Button>
            )}
          </div>
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
            >
              <Button
                type="button"
                variant="outline"
                className="mt-4 h-11 rounded-sm bg-white"
                onClick={() => {
                  setSearch("");
                  setClassFilter("all");
                }}
              >
                {t("clear_filters")}
              </Button>
            </EmptyState>
          </SurfaceSection>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <SurfaceSection
              title={t("catechumens.first_registrations")}
              icon={CheckCircle2}
              tone="soft"
              className="p-6 lg:p-8"
            >
              <div className="space-y-6">
                <div className="space-y-2">
                  <AppDisplayTitle as="h2">
                    {t("no_catechumens")}
                  </AppDisplayTitle>
                  <div className="h-px w-10 bg-brand-gold" aria-hidden />
                  <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                    {t("catechumens.empty_desc")}
                  </p>
                </div>

                {canManageCatechumens && (
                  <div className="flex flex-wrap gap-3">
                    <Button className="h-11 min-h-11 rounded-sm px-5" asChild>
                      <Link to="/app/catechumens/new">
                        {t("create_catechumen")}
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-11 min-h-11 rounded-sm px-5"
                      asChild
                    >
                      <Link to="/app/catechumens/import">{t("import")}</Link>
                    </Button>
                  </div>
                )}
              </div>
            </SurfaceSection>

            <SurfaceSection
              className="hidden sm:block"
              title={t("catechumens.suggested_flow")}
              icon={School}
            >
              <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                <AppPanel className="px-4 py-3" padded={false}>
                  {t("catechumens.flow_1")}
                </AppPanel>
                <AppPanel className="px-4 py-3" padded={false}>
                  {t("catechumens.flow_2")}
                </AppPanel>
                <AppPanel className="px-4 py-3" padded={false}>
                  {t("catechumens.flow_3")}
                </AppPanel>
              </div>
            </SurfaceSection>
          </div>
        )
      ) : view === "table" ? (
        <section className="overflow-hidden rounded-sm border border-border/70 bg-white/90 ">
          <div className="space-y-1.5 border-b border-border/70 bg-muted/30 px-5 py-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {tn("catechumens")}
            </h3>
            <div className="h-px w-8 bg-brand-gold" aria-hidden />
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
                {filtered.map((c: any) => {
                  const fullName = `${c.firstName || ""} ${
                    c.lastName || ""
                  }`.trim();
                  return (
                    <tr
                      key={c.id}
                      className="relative border-b border-border/60 last:border-0 transition-colors hover:bg-muted/30"
                    >
                      <td className="p-4">
                        <Link
                          to={`/app/catechumens/${c.id}`}
                          aria-label={fullName}
                          className="flex min-h-11 items-center gap-3 rounded-sm hover:text-brand-ink after:absolute after:inset-0 after:z-0 focus-visible:relative focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          <div
                            className={`flex h-10 w-10 items-center justify-center overflow-hidden rounded-sm text-sm font-semibold ${
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
                              `${c.firstName?.[0] || ""}${
                                c.lastName?.[0] || ""
                              }`
                            )}
                          </div>
                          <div>
                            <p className="font-brand-display text-sm font-semibold tracking-tight text-brand-ink">
                              {fullName}
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
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c: any) => {
            const enrolled = c.enrollments?.length > 0;
            const nextAction = enrolled
              ? t("catechumens.view_profile")
              : t("catechumens.next_enroll");
            return (
              <Link
                key={c.id}
                to={`/app/catechumens/${c.id}`}
                className="group overflow-hidden rounded-sm border border-border/70 bg-surface-elevated p-3.5 transition-colors hover:border-brand-ink/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:p-5"
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-sm text-sm font-semibold ring-1 ring-border/70 ${
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
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-base font-semibold tracking-tight text-brand-ink group-hover:text-brand-ink-soft">
                        {c.firstName} {c.lastName}
                      </p>
                      <Badge
                        variant={enrolled ? "secondary" : "warning"}
                        className="shrink-0 text-overline"
                      >
                        {enrolled
                          ? t("catechumens.linked_classes", {
                              count: c.enrollments.length,
                            })
                          : t("catechumens.no_class")}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {getAge(c.birthDate)
                        ? t("catechumens.years_old", {
                            age: getAge(c.birthDate),
                          })
                        : ""}
                      {c.household?.name
                        ? `${getAge(c.birthDate) ? " · " : ""}${
                            c.household.name
                          }`
                        : ""}
                    </p>
                    <p className="mt-2 text-sm font-medium text-brand-ink">
                      {nextAction}
                    </p>
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-brand-ink" />
                </div>
              </Link>
            );
          })}
        </div>
      )}

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
