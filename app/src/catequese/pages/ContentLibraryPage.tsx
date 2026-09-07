import { useState, useMemo, useCallback, useEffect } from "react";
import { Link, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import useDebounce from "../../client/hooks/useDebounce";
import { Button } from "../../client/components/ui/button";
import { QueryErrorState } from "../../client/components/QueryErrorState";
import { Badge } from "../../client/components/ui/badge";
import { FilterPills } from "../../client/components/FilterPills";
import { SearchInput } from "../../client/components/SearchInput";
import { EmptyState } from "../../client/components/EmptyState";
import { SkeletonCard } from "../../client/components/Skeletons";
import {
  Plus,
  Clock,
  User,
  Puzzle,
  LayoutGrid,
  List,
  ArrowUpDown,
  Feather,
  BookMarked,
  Search,
  Loader2,
  ArrowRight,
  CheckCircle2,
  FileText,
  FileUp,
} from "lucide-react";
import {
  useQuery,
  listContentItems,
  listDioceseSharedContent,
} from "wasp/client/operations";
import { useActiveParish } from "../../client/hooks/useActiveParish";
import { AI_FEATURES_ENABLED } from "../../shared/aiFeatures";
import { cn } from "../../client/utils";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import {
  AppDisplayTitle,
  AppPageHeader,
  AppPanel,
  AppMetric,
} from "../../client/components/brand/AppChrome";
import { ImportContentModal } from "../components/content/ImportContentModal";
import { OriginBadge } from "../components/OriginBadge";

const STATUS_KEYS = [
  "all",
  "DRAFT",
  "IN_REVIEW",
  "APPROVED",
  "PUBLISHED",
] as const;
const PAGE_SIZE = 50;

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
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {title}
        </p>
        <div className="h-px w-8 bg-brand-gold" aria-hidden />
      </div>
      {children}
    </AppPanel>
  );
}

function LibraryMetric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return <AppMetric label={label} value={value} />;
}

export default function ContentLibraryPage() {
  const { t } = useTranslation("content");
  const { t: tc } = useTranslation("common");
  const { data: dioceseItems = [] } = useQuery(listDioceseSharedContent);
  const { activeParishId } = useActiveParish();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [filter, setFilter] = useState<string>("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [sort, setSort] = useState<"recent" | "az">("recent");
  const [showDiocese, setShowDiocese] = useState(false);
  const [onlyWithActivities, setOnlyWithActivities] = useState(
    searchParams.get("activities") === "1",
  );
  const [onlyAiGenerated, setOnlyAiGenerated] = useState(
    searchParams.get("filter") === "ai",
  );
  const [items, setItems] = useState<any[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const serverSearch =
    debouncedSearch.trim().length >= 2 ? debouncedSearch.trim() : undefined;

  useEffect(() => {
    setItems([]);
    setNextCursor(null);
    setCursor(null);
  }, [debouncedSearch, filter, activeParishId]);

  const {
    data: pageData,
    isLoading: loading,
    isFetching,
    error: listError,
    refetch: refetchList,
  } = useQuery(
    listContentItems,
    {
      take: PAGE_SIZE,
      paginated: true,
      cursor: cursor || undefined,
      search: serverSearch,
      status: filter !== "all" ? filter : undefined,
      workspaceId: activeParishId || undefined,
    } as any,
    { enabled: true },
  );

  useEffect(() => {
    if (!pageData || typeof pageData !== "object" || !("items" in pageData)) {
      return;
    }
    const page = pageData as { items: any[]; nextCursor: string | null };
    setItems((prev) => {
      if (!cursor) return page.items;
      const seen = new Set(prev.map((p) => p.id));
      return [...prev, ...page.items.filter((p) => !seen.has(p.id))];
    });
    setNextCursor(page.nextCursor);
  }, [pageData, cursor]);

  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      DRAFT: t("status_draft"),
      IN_REVIEW: t("status_review"),
      APPROVED: t("status_approved"),
      PUBLISHED: t("status_published"),
      ARCHIVED: t("status_archived"),
    };
    return map[status] || status;
  };

  const statusVariant: Record<
    string,
    "default" | "secondary" | "outline" | "destructive"
  > = {
    DRAFT: "secondary",
    IN_REVIEW: "outline",
    APPROVED: "default",
    PUBLISHED: "default",
    ARCHIVED: "destructive",
  };

  const filtered = useMemo(() => {
    let result = [...items];
    if (showDiocese) {
      result = [
        ...result,
        ...dioceseItems.map((d: any) => ({ ...d, isDioceseShared: true })),
      ];
    }
    if (activeParishId)
      result = result.filter(
        (i: any) =>
          i.parishId === activeParishId ||
          i.isDioceseShared ||
          i.inherited ||
          i.ownerType === "DIOCESE" ||
          Boolean(i.origin?.inherited),
      );
    if (filter !== "all")
      result = result.filter((i: any) => i.status === filter);
    if (search)
      result = result.filter((i: any) =>
        `${i.title} ${i.theme || ""}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      );
    if (onlyWithActivities)
      result = result.filter((i: any) => (i._count?.activities || 0) > 0);
    if (onlyAiGenerated) result = result.filter((i: any) => i.isAiGenerated);
    if (sort === "az")
      result.sort((a: any, b: any) => a.title.localeCompare(b.title));
    return result;
  }, [
    items,
    dioceseItems,
    filter,
    search,
    sort,
    activeParishId,
    onlyWithActivities,
    onlyAiGenerated,
    showDiocese,
  ]);

  const totalActivities = useMemo(
    () =>
      items.reduce(
        (sum: number, i: any) => sum + (i._count?.activities || 0),
        0,
      ),
    [items],
  );

  const totalScripts = filtered.length;
  const aiCount = filtered.filter((i: any) => i.isAiGenerated).length;

  const activityFilterOptions = [
    { value: "all", label: tc("all") },
    {
      value: "activities",
      label: (
        <span className="flex items-center gap-1">
          <Puzzle className="h-3 w-3" /> {t("library.with_activities")}
        </span>
      ),
    },
    {
      value: "ai",
      label: (
        <span className="flex items-center gap-1">
          <Feather className="h-3 w-3" /> {t("library.ai_generated")}
        </span>
      ),
    },
  ];

  const statusFilterOptions = STATUS_KEYS.map((key) => ({
    value: key,
    label: key === "all" ? tc("all") : statusLabel(key),
  }));

  const hasFilters = !!(
    search ||
    filter !== "all" ||
    onlyWithActivities ||
    onlyAiGenerated
  );
  const hasMore = Boolean(nextCursor);
  const loadMore = useCallback(() => {
    if (nextCursor && !isFetching) setCursor(nextCursor);
  }, [nextCursor, isFetching]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (listError && !pageData) {
    return <QueryErrorState error={listError} onRetry={refetchList} />;
  }

  return (
    <div className="space-y-8">
      <AppPageHeader
        eyebrow={t("library.eyebrow", { defaultValue: "Biblioteca" })}
        title={t("title")}
        subtitle={t("library.subtitle", {
          scripts: items.length,
          activities: totalActivities,
        })}
        actions={
          <>
            <Button asChild className="h-10 rounded-md">
              <Link to="/app/content-library/new">
                <Plus className="mr-2 h-4 w-4" />
                {t("library.create_manual", {
                  defaultValue: "Criar manualmente",
                })}
              </Link>
            </Button>
            <Button
              variant="outline"
              className="h-10 rounded-sm"
              onClick={() => setImportOpen(true)}
            >
              <FileUp className="mr-2 h-4 w-4" />
              {t("library.import")}
            </Button>
            {AI_FEATURES_ENABLED && (
              <Button variant="outline" className="h-10 rounded-sm" asChild>
                <Link to="/app/ai-hub?mode=create-meeting">
                  <Feather className="mr-2 h-4 w-4" />
                  {t("library.generate_ai")}
                </Link>
              </Button>
            )}
          </>
        }
      />

      <div
        className={
          AI_FEATURES_ENABLED
            ? "grid gap-3 sm:grid-cols-3"
            : "grid gap-3 sm:grid-cols-2"
        }
      >
        <LibraryMetric
          label={t("library.metric_visible", { defaultValue: "Conteúdos" })}
          value={totalScripts}
        />
        <LibraryMetric
          label={t("library.metric_activities", { defaultValue: "Atividades" })}
          value={totalActivities}
        />
        {AI_FEATURES_ENABLED && (
          <LibraryMetric
            label={t("library.metric_ai", {
              defaultValue: "Assistência editorial",
            })}
            value={aiCount}
          />
        )}
      </div>

      <AppPanel>
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {t("library.filter_type")}
            </p>
            <FilterPills
              options={activityFilterOptions}
              value={
                onlyAiGenerated
                  ? "ai"
                  : onlyWithActivities
                    ? "activities"
                    : "all"
              }
              onChange={(v) => {
                setOnlyWithActivities(v === "activities");
                setOnlyAiGenerated(v === "ai");
              }}
            />
          </div>
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {t("library.filter_status")}
            </p>
            <FilterPills
              options={statusFilterOptions}
              value={filter}
              onChange={setFilter}
            />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <SearchInput
              placeholder={t("library.search_placeholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="h-10 rounded-sm"
                onClick={() =>
                  setSort((s) => (s === "recent" ? "az" : "recent"))
                }
              >
                <ArrowUpDown className="mr-2 h-4 w-4" />
                {sort === "recent" ? "Recentes" : "A-Z"}
              </Button>
              <Button
                variant="outline"
                className="h-10 rounded-sm"
                onClick={() => setView((v) => (v === "grid" ? "list" : "grid"))}
              >
                {view === "grid" ? (
                  <List className="mr-2 h-4 w-4" />
                ) : (
                  <LayoutGrid className="mr-2 h-4 w-4" />
                )}
                {view === "grid" ? "Lista" : "Cards"}
              </Button>
              <Button
                variant={showDiocese ? "default" : "outline"}
                className="h-10 rounded-sm"
                onClick={() => setShowDiocese((d) => !d)}
              >
                <BookMarked className="mr-2 h-4 w-4" />
                {t("library.diocese")}
              </Button>
            </div>
          </div>
        </div>
      </AppPanel>

      {filtered.length === 0 ? (
        hasFilters ? (
          <SurfaceSection title="Busca" icon={Search} tone="soft">
            <EmptyState
              compact
              icon={Search}
              title={t("library.empty_no_results")}
              description={
                onlyWithActivities
                  ? t("library.empty_no_results_activities")
                  : t("library.empty_adjust_filters")
              }
            />
          </SurfaceSection>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <SurfaceSection
              title="Primeiros conteudos"
              icon={CheckCircle2}
              tone="soft"
              className="p-6 lg:p-8"
            >
              <div className="space-y-6">
                <div className="space-y-2">
                  <AppDisplayTitle as="h2">
                    {t("library.empty_no_content")}
                  </AppDisplayTitle>
                  <div
                    className="h-px w-16 bg-gradient-to-r from-brand-gold to-transparent"
                    aria-hidden
                  />
                  <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                    {t("library.empty_create_desc")}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button className="h-11 rounded-sm px-5" asChild>
                    <Link to="/app/content-library/new">{t("create")}</Link>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-11 rounded-sm px-5 bg-white"
                    onClick={() => setImportOpen(true)}
                  >
                    <FileUp className="mr-2 h-4 w-4" />
                    {t("library.import")}
                  </Button>
                  {AI_FEATURES_ENABLED && (
                    <Button
                      variant="outline"
                      className="h-11 rounded-sm px-5 bg-white"
                      asChild
                    >
                      <Link to="/app/ai-hub?mode=create-meeting">
                        {t("library.generate_ai", {
                          defaultValue: "Assistência editorial",
                        })}
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </SurfaceSection>

            <SurfaceSection title="Fluxo sugerido" icon={FileText}>
              <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                <div className="rounded-sm border border-border/70 bg-white px-4 py-3">
                  Crie roteiros base para organizar temas, tempo estimado e
                  publico.
                </div>
                <div className="rounded-sm border border-border/70 bg-white px-4 py-3">
                  Adicione atividades para transformar o conteudo em encontro
                  utilizavel.
                </div>
                {AI_FEATURES_ENABLED && (
                  <div className="rounded-sm border border-border/70 bg-white px-4 py-3">
                    Combine criação manual com assistência editorial quando
                    precisar acelerar a preparação.
                  </div>
                )}
              </div>
            </SurfaceSection>
          </div>
        )
      ) : view === "list" ? (
        <section className="overflow-hidden rounded-sm border border-border/70 bg-white ">
          <div className="border-b border-border/70 bg-muted/30 px-5 py-4">
            <div className="space-y-1.5">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {t("library.table_title")}
              </h3>
              <div className="h-px w-8 bg-brand-gold" aria-hidden />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/20 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  <th className="p-4">{t("library.table_title")}</th>
                  <th className="p-4 hidden md:table-cell">
                    {t("library.table_status")}
                  </th>
                  <th className="p-4 hidden md:table-cell">
                    {t("library.table_activities")}
                  </th>
                  <th className="p-4 hidden lg:table-cell">
                    {t("library.table_time")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((i: any) => (
                  <tr
                    key={i.id}
                    className="border-b border-border/60 last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="p-4">
                      <Link
                        to={`/app/content-library/${i.id}`}
                        className="text-sm font-semibold tracking-tight text-brand-ink hover:text-brand-ink-soft"
                      >
                        {i.title}
                      </Link>
                      <p className="text-overline text-muted-foreground">
                        {i.theme}
                      </p>
                    </td>
                    <td className="p-4 hidden md:table-cell">
                      <div className="flex items-center gap-1">
                        {i.isAiGenerated && (
                          <Badge
                            variant="outline"
                            className="border-brand-ink/20 bg-brand-ink/8 text-brand-ink text-overline"
                          >
                            <Feather className="h-2.5 w-2.5" />
                            {t("library.badge_editorial", {
                              defaultValue: "Editorial",
                            })}
                          </Badge>
                        )}
                        <Badge
                          variant={statusVariant[i.status] || "secondary"}
                          className="text-overline"
                        >
                          {statusLabel(i.status)}
                        </Badge>
                      </div>
                    </td>
                    <td className="p-4 hidden md:table-cell text-sm">
                      {i._count?.activities || 0}
                    </td>
                    <td className="p-4 hidden lg:table-cell text-sm">
                      {i.estimatedTime
                        ? t("library.minutes", { count: i.estimatedTime })
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item: any) => (
            <Link
              key={item.id}
              to={`/app/content-library/${item.id}`}
              className="group overflow-hidden rounded-sm border border-border/70 bg-white p-5 transition-colors hover:border-brand-ink/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="line-clamp-2 text-lg font-semibold tracking-tight text-brand-ink group-hover:text-brand-ink-soft">
                      {item.title}
                    </h3>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-brand-ink" />
                  </div>
                  {item.theme && (
                    <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                      {item.theme}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {(item.isDioceseShared ||
                  item.inherited ||
                  item.ownerType === "DIOCESE") && (
                  <OriginBadge
                    origin={item.origin}
                    ownerType={item.ownerType || "DIOCESE"}
                    inherited={item.inherited || item.isDioceseShared}
                    policy={item.inheritancePolicy}
                  />
                )}
                {item.isAiGenerated && (
                  <Badge
                    variant="outline"
                    className="gap-1 border-brand-ink/20 bg-brand-ink/8 text-brand-ink text-overline"
                  >
                    <Feather className="h-2.5 w-2.5" />
                    {t("library.badge_editorial", {
                      defaultValue: "Editorial",
                    })}
                  </Badge>
                )}
                <Badge
                  variant={statusVariant[item.status] || "secondary"}
                  className="text-overline"
                >
                  {statusLabel(item.status)}
                </Badge>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-sm border border-border/70 bg-white px-4 py-3">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    Duracao
                  </div>
                  <p className="mt-1 text-sm font-semibold tracking-tight text-brand-ink">
                    {item.estimatedTime
                      ? t("library.minutes", { count: item.estimatedTime })
                      : "—"}
                  </p>
                </div>
                <div className="rounded-sm border border-border/70 bg-white px-4 py-3">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    <Puzzle className="h-3.5 w-3.5" />
                    Atividades
                  </div>
                  <p className="mt-1 text-sm font-semibold tracking-tight text-brand-ink">
                    {item._count?.activities || 0}
                  </p>
                </div>
              </div>

              <div className="mt-4 border-t border-border/60 pt-4 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  {item.createdBy?.firstName || "—"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-sm bg-white"
            onClick={loadMore}
            disabled={isFetching}
          >
            {isFetching && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
            {tc("load_more")}
          </Button>
        </div>
      )}

      <ImportContentModal open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}
