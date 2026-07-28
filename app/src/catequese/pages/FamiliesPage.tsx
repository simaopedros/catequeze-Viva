import { useState, useMemo, useCallback, useEffect } from "react";
import {
  useQuery,
  listHouseholds,
  listCommunities,
} from "wasp/client/operations";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import {
  Heart,
  Users,
  Plus,
  Phone,
  MapPin,
  User,
  ChevronRight,
  Search,
  Loader2,
} from "lucide-react";
import { Button } from "../../client/components/ui/button";
import { SearchInput } from "../../client/components/SearchInput";
import {
  AppPageHeader,
  AppPanel,
} from "../../client/components/brand/AppChrome";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../client/components/ui/select";
import { EmptyState } from "../../client/components/EmptyState";
import { SkeletonCard } from "../../client/components/Skeletons";
import { useActiveParish } from "../../client/hooks/useActiveParish";
import { useUserContext } from "../../client/hooks/useUserContext";
import useDebounce from "../../client/hooks/useDebounce";
import { FamilyPortalInviteBanner } from "../components/FamilyPortalInviteBanner";

const PAGE_SIZE = 50;

export default function FamiliesPage() {
  const { t } = useTranslation("common");
  const { t: tn } = useTranslation("navigation");
  const { activeParishId } = useActiveParish();
  const { userRole } = useUserContext();
  const canCreateFamily = userRole !== "ASSISTANT_CATECHIST";
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [communityFilter, setCommunityFilter] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);

  const serverSearch =
    debouncedSearch.trim().length >= 2 ? debouncedSearch.trim() : undefined;

  useEffect(() => {
    setItems([]);
    setNextCursor(null);
    setCursor(null);
  }, [debouncedSearch, communityFilter, activeParishId]);

  const {
    data: pageData,
    isLoading,
    isFetching,
  } = useQuery(
    listHouseholds,
    {
      take: PAGE_SIZE,
      paginated: true,
      cursor: cursor || undefined,
      search: serverSearch,
      parishId: activeParishId || undefined,
      communityId: communityFilter || undefined,
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
      return [...prev, ...page.items.filter((p) => !seen.has(p.id))];
    });
    setNextCursor(page.nextCursor);
  }, [pageData, cursor]);

  const { data: communities = [] } = useQuery(
    listCommunities,
    activeParishId
      ? { parishId: activeParishId }
      : ({ parishId: undefined } as any),
    { enabled: Boolean(activeParishId) },
  );

  const filtered = items;
  const hasMore = Boolean(nextCursor);
  const loadMore = useCallback(() => {
    if (nextCursor && !isFetching) setCursor(nextCursor);
  }, [nextCursor, isFetching]);

  if (isLoading && items.length === 0) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-32 animate-pulse rounded bg-muted" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  const hasFilters = Boolean(search || communityFilter);

  return (
    <div className="space-y-6">
      <AppPageHeader
        eyebrow={t("families.eyebrow", { defaultValue: "Pastoral" })}
        title={tn("families")}
        subtitle={t("families.subtitle_registered", {
          count: filtered.length,
        })}
        primaryAction={
          canCreateFamily
            ? { label: t("new"), href: "/app/families/new" }
            : undefined
        }
      />
      <FamilyPortalInviteBanner />
      <AppPanel density="compact">
        <div className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="min-w-0 flex-1">
              <SearchInput
                placeholder={t("families.search_placeholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                containerClassName="max-w-none w-full"
              />
            </div>
            <Select
              value={communityFilter || "all"}
              onValueChange={(v) => setCommunityFilter(v === "all" ? "" : v)}
            >
              <SelectTrigger className="h-11 min-h-11 w-full rounded-sm sm:w-44">
                <SelectValue placeholder={t("families.all_communities")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("families.all_communities")}
                </SelectItem>
                {communities.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <p className="text-muted-foreground">
              {t("families.count", { count: filtered.length })}
            </p>
            {hasFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 min-h-9 rounded-sm text-brand-ink"
                onClick={() => {
                  setSearch("");
                  setCommunityFilter("");
                }}
              >
                {t("clear_filters")}
              </Button>
            )}
          </div>
        </div>
      </AppPanel>

      {filtered.length === 0 ? (
        search || communityFilter ? (
          <EmptyState
            compact
            icon={Search}
            title={t("families.not_found_search")}
            description={t("catechumens.adjust_filters")}
          >
            <Button
              type="button"
              variant="outline"
              className="mt-4 h-11 rounded-sm bg-surface-elevated"
              onClick={() => {
                setSearch("");
                setCommunityFilter("");
              }}
            >
              {t("clear_filters")}
            </Button>
          </EmptyState>
        ) : (
          <EmptyState
            icon={Heart}
            title={t("no_family")}
            description={t("families.empty_desc")}
          >
            {canCreateFamily && (
              <Button className="mt-4 h-11" asChild>
                <Link to="/app/families/new">{t("families.register")}</Link>
              </Button>
            )}
          </EmptyState>
        )
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((h: any) => (
            <Link
              key={h.id}
              to={`/app/families/${h.id}`}
              className="group min-h-11 rounded-sm border border-border/70 bg-surface-elevated p-4 transition-colors hover:border-brand-ink/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <h3 className="font-brand-display text-sm font-semibold tracking-tight text-brand-ink group-hover:text-brand-ink-soft">
                  {h.name}
                </h3>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-opacity group-hover:opacity-100 sm:opacity-0" />
              </div>
              {h.address ? (
                <p className="mb-1 flex items-center gap-1 text-overline text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {h.address}
                </p>
              ) : null}
              {h.phone ? (
                <p className="mb-2 flex items-center gap-1 text-overline text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  {h.phone}
                </p>
              ) : null}
              <div className="flex items-center gap-4 border-t border-border/60 pt-2 text-overline">
                <span className="font-brand-display flex items-center gap-1 font-semibold tracking-tight text-brand-ink">
                  <Users className="h-3 w-3" />
                  {t("families.catechumens_count", {
                    count: h._count?.catechumens || 0,
                  })}
                </span>
                {h.guardians?.length === 0 ? (
                  <span className="flex items-center gap-1 text-warning">
                    <User className="h-3 w-3" />
                    {t("families.no_guardians")}
                  </span>
                ) : (
                  <span className="font-brand-display flex items-center gap-1 font-semibold tracking-tight text-brand-ink">
                    <User className="h-3 w-3" />
                    {t("families.guardians_count", {
                      count: h.guardians?.length || 0,
                    })}
                  </span>
                )}
              </div>
              {h.catechumens?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {h.catechumens.slice(0, 3).map((c: any) => (
                    <span
                      key={c.id}
                      className="rounded-sm border border-border/70 bg-muted/30 px-2 py-0.5 text-overline"
                    >
                      {c.firstName}
                    </span>
                  ))}
                  {h.catechumens.length > 3 && (
                    <span className="text-overline text-muted-foreground">
                      +{h.catechumens.length - 3}
                    </span>
                  )}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadMore}
            disabled={isLoading}
          >
            {isFetching && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
            {t("load_more")}
          </Button>
        </div>
      )}
    </div>
  );
}
