import { useState, useMemo, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Button } from '../../client/components/ui/button';
import { Badge } from '../../client/components/ui/badge';
import { PageHeader } from '../../client/components/PageHeader';
import { FilterPills } from '../../client/components/FilterPills';
import { SearchInput } from '../../client/components/SearchInput';
import { EmptyState } from '../../client/components/EmptyState';
import { SkeletonCard } from '../../client/components/Skeletons';
import { Plus, BookOpen, Clock, User, Puzzle, LayoutGrid, List, ArrowUpDown, Sparkles, BookMarked, Search, Loader2 } from 'lucide-react';
import { useQuery, listContentItems, listDioceseSharedContent } from 'wasp/client/operations';
import { useActiveParish } from '../../client/hooks/useActiveParish';

const STATUS_KEYS = ['all', 'DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED'] as const;
const PAGE_SIZE = 50;

export default function ContentLibraryPage() {
  const { t } = useTranslation('content');
  const { t: tc } = useTranslation('common');
  const [pages, setPages] = useState(1);
  const { data: items = [], isLoading: loading } = useQuery(listContentItems, { take: PAGE_SIZE * pages });
  const { data: dioceseItems = [] } = useQuery(listDioceseSharedContent);
  const { activeParishId } = useActiveParish();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [view, setView] = useState<'grid'|'list'>('grid');
  const [sort, setSort] = useState<'recent'|'az'>('recent');
  const [showDiocese, setShowDiocese] = useState(false);
  const [onlyWithActivities, setOnlyWithActivities] = useState(
    searchParams.get('activities') === '1'
  );
  const [onlyAiGenerated, setOnlyAiGenerated] = useState(
    searchParams.get('filter') === 'ai'
  );

  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      DRAFT: t('status_draft'),
      IN_REVIEW: t('status_review'),
      APPROVED: t('status_approved'),
      PUBLISHED: t('status_published'),
      ARCHIVED: t('status_archived'),
    };
    return map[status] || status;
  };

  const statusVariant: Record<string, 'default'|'secondary'|'outline'|'destructive'> = {
    DRAFT: 'secondary',
    IN_REVIEW: 'outline',
    APPROVED: 'default',
    PUBLISHED: 'default',
    ARCHIVED: 'destructive',
  };

  const filtered = useMemo(() => {
    let result = [...items];
    if (showDiocese) {
      result = [...result, ...dioceseItems.map((d: any) => ({ ...d, isDioceseShared: true }))];
    }
    if (activeParishId) result = result.filter((i: any) => i.parishId === activeParishId || i.isDioceseShared);
    if (filter !== 'all') result = result.filter((i: any) => i.status === filter);
    if (search) result = result.filter((i: any) => `${i.title} ${i.theme||''}`.toLowerCase().includes(search.toLowerCase()));
    if (onlyWithActivities) result = result.filter((i: any) => (i._count?.activities || 0) > 0);
    if (onlyAiGenerated) result = result.filter((i: any) => i.isAiGenerated);
    if (sort === 'az') result.sort((a: any, b: any) => a.title.localeCompare(b.title));
    return result;
  }, [items, dioceseItems, filter, search, sort, activeParishId, onlyWithActivities, onlyAiGenerated, showDiocese]);

  const totalActivities = useMemo(
    () => items.reduce((sum: number, i: any) => sum + (i._count?.activities || 0), 0),
    [items],
  );

  const activityFilterOptions = [
    { value: 'all', label: tc('all') },
    { value: 'activities', label: <span className="flex items-center gap-1"><Puzzle className="h-3 w-3" /> {t('library.with_activities')}</span> },
    { value: 'ai', label: <span className="flex items-center gap-1"><Sparkles className="h-3 w-3" /> {t('library.ai_generated')}</span> },
  ];
  const statusFilterOptions = STATUS_KEYS.map(key => ({
    value: key,
    label: key === 'all' ? tc('all') : statusLabel(key),
  }));

  const hasFilters = !!(search || filter !== 'all' || onlyWithActivities || onlyAiGenerated);
  const hasMore = items.length === PAGE_SIZE * pages;
  const loadMore = useCallback(() => setPages(p => p + 1), []);

  if (loading) {
    return (
        <div className="space-y-6">
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
          </div>
        </div>
    );
  }

  return (
      <div className="space-y-6">
        <PageHeader
          title={t('title')}
          subtitle={t('library.subtitle', { scripts: items.length, activities: totalActivities })}
        >
          <Button size="sm" variant="outline" asChild>
            <Link to="/app/ai-hub?mode=create-meeting" className="gap-1"><Sparkles className="h-4 w-4"/>{t('library.generate_ai')}</Link>
          </Button>
          <Button size="sm" variant="outline" onClick={() => setSort(s => s==='recent'?'az':'recent')}><ArrowUpDown className="h-4 w-4" /></Button>
          <Button size="sm" variant="outline" onClick={() => setView(v => v==='grid'?'list':'grid')}>{view==='grid'?<List className="h-4 w-4"/>:<LayoutGrid className="h-4 w-4"/>}</Button>
          <Button size="sm" variant={showDiocese ? 'default' : 'outline'} onClick={() => setShowDiocese(d => !d)} className="gap-1"><BookMarked className="h-4 w-4" />{t('library.diocese')}</Button>
          <Button asChild><Link to="/app/content-library/new"><Plus className="mr-1 h-4 w-4"/>{tc('new')}</Link></Button>
        </PageHeader>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex gap-1 flex-wrap items-center">
            <FilterPills
              options={activityFilterOptions}
              value={onlyAiGenerated ? 'ai' : onlyWithActivities ? 'activities' : 'all'}
              onChange={v => {
                setOnlyWithActivities(v === 'activities');
                setOnlyAiGenerated(v === 'ai');
              }}
            />
            <span className="w-px h-6 bg-border self-center mx-1" />
            <FilterPills options={statusFilterOptions} value={filter} onChange={setFilter} />
          </div>
          <SearchInput placeholder={tc('search')} value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {filtered.length === 0 ? (
          hasFilters ? (
            <EmptyState
              compact
              icon={Search}
              title={t('library.empty_no_results')}
              description={onlyWithActivities ? t('library.empty_no_results_activities') : t('library.empty_adjust_filters')}
            />
          ) : (
            <EmptyState icon={BookOpen} title={t('library.empty_no_content')} description={t('library.empty_create_desc')}>
              <Button className="mt-4" asChild><Link to="/app/content-library/new">{t('create')}</Link></Button>
            </EmptyState>
          )
        ) : view === 'list' ? (
          <div className="rounded-xl border bg-card"><table className="w-full"><thead><tr className="border-b text-left text-xs text-muted-foreground uppercase"><th className="p-3">{t('library.table_title')}</th><th className="p-3 hidden md:table-cell">{t('library.table_status')}</th><th className="p-3 hidden md:table-cell">{t('library.table_activities')}</th><th className="p-3 hidden lg:table-cell">{t('library.table_time')}</th></tr></thead><tbody>{filtered.map((i:any)=>(
            <tr key={i.id} className="border-b hover:bg-muted/30"><td className="p-3"><Link to={`/app/content-library/${i.id}`} className="font-medium text-sm hover:text-primary">{i.title}</Link><p className="text-overline text-muted-foreground">{i.theme}</p></td><td className="p-3 hidden md:table-cell"><div className="flex items-center gap-1">{i.isAiGenerated && <Badge variant="outline" className="text-overline bg-yellow-50 border-yellow-200 text-yellow-700"><Sparkles className="h-2.5 w-2.5" />IA</Badge>}<Badge variant={statusVariant[i.status]||'secondary'} className="text-overline">{statusLabel(i.status)}</Badge></div></td><td className="p-3 hidden md:table-cell text-sm">{i._count?.activities||0}</td><td className="p-3 hidden lg:table-cell text-sm">{i.estimatedTime ? t('library.minutes', { count: i.estimatedTime }) : '—'}</td></tr>
          ))}</tbody></table></div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((item:any)=>(
              <Link key={item.id} to={`/app/content-library/${item.id}`} className="rounded-xl border bg-card p-5 shadow-elevation-sm hover:shadow-elevation-md transition-shadow group">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-sm group-hover:text-primary flex-1 line-clamp-2">{item.title}</h3>
                  <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                    {item.isDioceseShared && <Badge variant="outline" className="text-overline gap-0.5"><BookMarked className="h-2.5 w-2.5" />{t('library.diocese')}</Badge>}
                    {item.isAiGenerated && <Badge variant="outline" className="text-overline gap-0.5 bg-yellow-50 border-yellow-200 text-yellow-700"><Sparkles className="h-2.5 w-2.5" />IA</Badge>}
                    <Badge variant={statusVariant[item.status]||'secondary'} className="text-overline">{statusLabel(item.status)}</Badge>
                  </div>
                </div>
                {item.theme&&<p className="text-xs text-muted-foreground mb-2 line-clamp-1">{item.theme}</p>}
                <div className="flex items-center justify-between text-overline text-muted-foreground pt-3 border-t">
                  <span className="flex items-center gap-1"><User className="h-3 w-3"/>{item.createdBy?.firstName||'—'}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3"/>{item.estimatedTime ? t('library.minutes', { count: item.estimatedTime }) : '—'}</span>
                  <span className={`flex items-center gap-1 font-medium ${(item._count?.activities||0) > 0 ? 'text-primary' : ''}`}>
                    <Puzzle className="h-3 w-3"/>{(item._count?.activities||0)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
        {hasMore && (
          <div className="flex justify-center pt-2">
            <Button variant="outline" size="sm" onClick={loadMore} disabled={loading}>
              {loading && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
              {tc('load_more')}
            </Button>
          </div>
        )}
      </div>
  );
}
