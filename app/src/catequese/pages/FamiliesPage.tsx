import { useState, useMemo, useCallback } from "react";
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

const PAGE_SIZE = 50;

export default function FamiliesPage() {
  const { t } = useTranslation("common");
  const { t: tn } = useTranslation("navigation");
  const { activeParishId } = useActiveParish();
  const { userRole } = useUserContext();
  const canCreateFamily = userRole !== "ASSISTANT_CATECHIST";
  const [search, setSearch] = useState("");
  const [communityFilter, setCommunityFilter] = useState("");
  const [pages, setPages] = useState(1);

  const { data: households = [], isLoading } = useQuery(listHouseholds, {
    take: PAGE_SIZE * pages,
    search: search || undefined,
  });
  const { data: communities = [] } = useQuery(
    listCommunities,
    activeParishId
      ? { parishId: activeParishId }
      : ({ parishId: undefined } as any),
  );

  const filtered = useMemo(() => {
    if (!households || households.length === 0) return [];
    let result = [...households];
    if (activeParishId)
      result = result.filter((h: any) => h.parishId === activeParishId);
    if (communityFilter)
      result = result.filter((h: any) => h.communityId === communityFilter);
    return result;
  }, [households, activeParishId, communityFilter]);

  const hasMore = households.length === PAGE_SIZE * pages;
  const loadMore = useCallback(() => setPages((p) => p + 1), []);

  if (isLoading) {
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

  return (
    <div className="space-y-6">
      <AppPageHeader
        eyebrow={t("families.eyebrow", { defaultValue: "Pastoral" })}
        title={tn("families")}
        subtitle={t("families.subtitle_registered", {
          count: households?.length || 0,
        })}
        actions={
          canCreateFamily ? (
            <Button asChild className="h-10 rounded-sm shadow-none">
              <Link to="/app/families/new">
                <Plus className="mr-1 h-4 w-4" />
                {t("new")}
              </Link>
            </Button>
          ) : undefined
        }
      />
      <AppPanel>
        <div className="flex flex-col gap-3 sm:flex-row">
          <SearchInput
            placeholder={t("families.search_placeholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            containerClassName="max-w-none w-full sm:w-56 flex-none"
          />
          <Select
            value={communityFilter || "all"}
            onValueChange={(v) => setCommunityFilter(v === "all" ? "" : v)}
          >
            <SelectTrigger className="h-10 w-full rounded-sm sm:w-44">
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
      </AppPanel>

      {filtered.length === 0 ? (
        search || communityFilter ? (
          <EmptyState
            compact
            icon={Search}
            title={t("families.not_found_search")}
            description={t("catechumens.adjust_filters")}
          />
        ) : (
          <EmptyState
            icon={Heart}
            title={t("no_family")}
            description={t("families.empty_desc")}
          >
            {canCreateFamily && (
              <Button className="mt-4" asChild>
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
              className="group rounded-sm border border-border/70 bg-white p-4 transition-colors hover:border-[#071A2D]/30"
            >
              <div className="flex items-start justify-between mb-2">
                <h3
                  className="text-sm font-semibold tracking-tight text-[#071A2D] group-hover:text-[#0a2540]"
                  style={{ fontFamily: "var(--font-brand-display)" }}
                >
                  {h.name}
                </h3>
                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </div>
              {h.address ? (
                <p className="text-overline text-muted-foreground flex items-center gap-1 mb-1">
                  <MapPin className="h-3 w-3" />
                  {h.address}
                </p>
              ) : (
                <p className="text-overline text-muted-foreground/60 flex items-center gap-1 mb-1">
                  <MapPin className="h-3 w-3" />
                  Sem endereço
                </p>
              )}
              {h.phone ? (
                <p className="text-overline text-muted-foreground flex items-center gap-1 mb-2">
                  <Phone className="h-3 w-3" />
                  {h.phone}
                </p>
              ) : (
                <p className="text-overline text-muted-foreground/60 flex items-center gap-1 mb-2">
                  <Phone className="h-3 w-3" />
                  Sem telefone
                </p>
              )}
              <div className="flex items-center gap-4 pt-2 border-t text-overline">
                <span className="flex items-center gap-1 text-muted-foreground">
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
                  <span className="flex items-center gap-1 text-muted-foreground">
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
      <p className="text-xs text-muted-foreground">
        {t("families.count", { count: filtered.length })}
      </p>
      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            size="sm"
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
