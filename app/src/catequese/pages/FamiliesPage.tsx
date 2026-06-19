import { useState, useMemo, useCallback } from 'react';
import { useQuery, listHouseholds, listCommunities } from 'wasp/client/operations';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Heart, Users, Plus, Phone, MapPin, User, ChevronRight, Search, Loader2 } from 'lucide-react';
import { Button } from '../../client/components/ui/button';
import { PageHeader } from '../../client/components/PageHeader';
import { SearchInput } from '../../client/components/SearchInput';
import { EmptyState } from '../../client/components/EmptyState';
import { SkeletonCard } from '../../client/components/Skeletons';
import { AppShell } from '../AppShell';
import { useActiveParish } from '../../client/hooks/useActiveParish';
import { useUserContext } from '../../client/hooks/useUserContext';

const PAGE_SIZE = 50;

export default function FamiliesPage() {
  const { t } = useTranslation('common');
  const { t: tn } = useTranslation('navigation');
  const { activeParishId } = useActiveParish();
  const { userRole } = useUserContext();
  const canCreateFamily = userRole !== 'ASSISTANT_CATECHIST';
  const [search, setSearch] = useState('');
  const [communityFilter, setCommunityFilter] = useState('');
  const [pages, setPages] = useState(1);

  const { data: households = [], isLoading } = useQuery(
    listHouseholds,
    { take: PAGE_SIZE * pages, search: search || undefined },
  );
  const { data: communities = [] } = useQuery(listCommunities, activeParishId ? { parishId: activeParishId } : { parishId: undefined } as any);

  const filtered = useMemo(() => {
    if (!households || households.length === 0) return [];
    let result = [...households];
    if (activeParishId) result = result.filter((h: any) => h.parishId === activeParishId);
    if (communityFilter) result = result.filter((h: any) => h.communityId === communityFilter);
    return result;
  }, [households, activeParishId, communityFilter]);

  const hasMore = households.length === PAGE_SIZE * pages;
  const loadMore = useCallback(() => setPages(p => p + 1), []);

  if (isLoading) {
    return (
      <AppShell>
        <div className="space-y-6">
          <div className="h-8 w-32 animate-pulse rounded bg-muted" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title={tn('families')}
          subtitle={t('families.subtitle_registered', { count: households?.length || 0 })}
        >
          <SearchInput
            placeholder={t('search')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            containerClassName="max-w-none w-40 flex-none"
          />
          <select
            value={communityFilter}
            onChange={e => setCommunityFilter(e.target.value)}
            className="flex h-9 rounded-md border border-input bg-background px-3 text-sm w-36"
          >
            <option value="">{t('families.all_communities')}</option>
            {communities.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {canCreateFamily && <Button asChild><Link to="/app/families/new"><Plus className="mr-1 h-4 w-4" />{t('new')}</Link></Button>}
        </PageHeader>

        {filtered.length === 0 ? (
          search || communityFilter ? (
            <EmptyState compact icon={Search} title={t('families.not_found_search')} description={t('catechumens.adjust_filters')} />
          ) : (
            <EmptyState
              icon={Heart}
              title={t('no_family')}
              description={t('families.empty_desc')}
            >
              {canCreateFamily && (
                <Button className="mt-4" asChild><Link to="/app/families/new">{t('families.register')}</Link></Button>
              )}
            </EmptyState>
          )
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((h: any) => (
              <Link key={h.id} to={`/app/families/${h.id}`} className="rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow group">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold group-hover:text-primary">{h.name}</h3>
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                {h.address && <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1"><MapPin className="h-3 w-3" />{h.address}</p>}
                {h.phone && <p className="text-xs text-muted-foreground flex items-center gap-1 mb-3"><Phone className="h-3 w-3" />{h.phone}</p>}
                <div className="flex items-center gap-4 pt-3 border-t text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{t('families.catechumens_count', { count: h._count?.catechumens || 0 })}</span>
                  <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" />{t('families.guardians_count', { count: h.guardians?.length || 0 })}</span>
                </div>
                {h.catechumens?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {h.catechumens.slice(0, 3).map((c: any) => <span key={c.id} className="text-overline bg-muted px-2 py-0.5 rounded-full">{c.firstName}</span>)}
                    {h.catechumens.length > 3 && <span className="text-overline text-muted-foreground">+{h.catechumens.length - 3}</span>}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground">{t('families.count', { count: filtered.length })}</p>
        {hasMore && (
          <div className="flex justify-center pt-2">
            <Button variant="outline" size="sm" onClick={loadMore} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
              {t('load_more')}
            </Button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
