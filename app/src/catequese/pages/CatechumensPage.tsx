import { useState, useMemo } from 'react';
import { useQuery, listCatechumens } from 'wasp/client/operations';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { GraduationCap, Plus, LayoutGrid, List, Upload, Calendar, Search } from 'lucide-react';
import { Button } from '../../client/components/ui/button';
import { Badge } from '../../client/components/ui/badge';
import { PageHeader } from '../../client/components/PageHeader';
import { SearchInput } from '../../client/components/SearchInput';
import { EmptyState } from '../../client/components/EmptyState';
import { SkeletonCard } from '../../client/components/Skeletons';
import { AppShell } from '../AppShell';
import { useActiveParish } from '../../client/hooks/useActiveParish';
import { useUserContext } from '../../client/hooks/useUserContext';
import { formatDateOnly, getAgeFromDate } from '../../i18n/format';

const AVATAR_COLORS = [
  'bg-primary/10 text-primary',
  'bg-success/10 text-success',
  'bg-warning/10 text-warning',
  'bg-secondary text-secondary-foreground',
  'bg-accent text-accent-foreground',
  'bg-muted text-muted-foreground',
];

function getAge(birthDate: string): number | null {
  return getAgeFromDate(birthDate);
}

export default function CatechumensPage() {
  const { t, i18n } = useTranslation('common');
  const { t: tn } = useTranslation('navigation');
  const { data: catechumens, isLoading } = useQuery(listCatechumens);
  const { activeParishId } = useActiveParish();
  const { userRole } = useUserContext();
  const canManageCatechumens = ['SUPER_ADMIN', 'DIOCESE_ADMIN', 'PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR', 'LEAD_CATECHIST', 'ASSISTANT_CATECHIST', 'PERSONAL_OWNER'].includes(userRole);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [view, setView] = useState<'cards' | 'table'>('cards');

  const classNames = useMemo(() => {
    if (!catechumens) return [];
    const names = new Set<string>();
    catechumens.forEach((c: any) => c.enrollments?.forEach((e: any) => names.add(e.class?.name)));
    return [...names].sort();
  }, [catechumens]);

  const filtered = useMemo(() => {
    if (!catechumens) return [];
    let result = [...catechumens];
    if (activeParishId) {
      result = result.filter((c: any) =>
        c.enrollments?.some((e: any) => e.class?.parishId === activeParishId) ||
        c.household?.parishId === activeParishId ||
        (!c.enrollments?.length && !c.household?.parishId)
      );
    }
    if (search) result = result.filter((c: any) => `${c.firstName} ${c.lastName}`.toLowerCase().includes(search.toLowerCase()));
    if (classFilter) result = result.filter((c: any) => c.enrollments?.some((e: any) => e.class?.name === classFilter));
    return result;
  }, [catechumens, search, classFilter, activeParishId]);

  const hasFilters = !!(search || classFilter);

  if (isLoading) {
    return (
      <AppShell>
        <div className="space-y-6">
          <div className="h-8 w-44 animate-pulse rounded bg-muted" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title={tn('catechumens')}
          subtitle={t('catechumens.subtitle_registered', { count: catechumens?.length || 0 })}
        >
          <Button size="sm" variant="outline" onClick={() => setView(v => v === 'cards' ? 'table' : 'cards')}>
            {view === 'cards' ? <List className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
          </Button>
          {canManageCatechumens && (
            <>
              <Button size="sm" variant="outline" asChild><Link to="/app/catechumens/import"><Upload className="mr-1 h-4 w-4" />{t('import')}</Link></Button>
              <Button size="sm" asChild><Link to="/app/catechumens/new"><Plus className="mr-1 h-4 w-4" />{t('new')}</Link></Button>
            </>
          )}
        </PageHeader>

        <div className="flex flex-col sm:flex-row gap-3">
          <SearchInput placeholder={t('catechumens.search_by_name')} value={search} onChange={e => setSearch(e.target.value)} />
          <select value={classFilter} onChange={e => setClassFilter(e.target.value)}
            className="flex h-9 w-44 rounded-md border border-input bg-background px-3 text-sm">
            <option value="">{t('catechumens.all_classes')}</option>
            {classNames.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>

        {filtered.length === 0 ? (
          hasFilters ? (
            <EmptyState compact icon={Search} title={t('no_results')} description={t('catechumens.adjust_filters')} />
          ) : (
            <EmptyState
              icon={GraduationCap}
              title={t('no_catechumens')}
              description={t('catechumens.empty_desc')}
            >
              {canManageCatechumens && (
                <Button className="mt-4" asChild><Link to="/app/catechumens/new">{t('create_catechumen')}</Link></Button>
              )}
            </EmptyState>
          )
        ) : view === 'table' ? (
          <div className="rounded-xl border bg-card overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b text-left text-xs text-muted-foreground uppercase"><th className="p-3 font-medium">{t('first_name')}</th><th className="p-3 font-medium hidden md:table-cell">{t('age')}</th><th className="p-3 font-medium hidden md:table-cell">{t('catechumens.table_family')}</th><th className="p-3 font-medium hidden lg:table-cell">{t('catechumens.table_classes')}</th></tr></thead>
              <tbody>{filtered.map((c: any) => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-3">
                    <Link to={`/app/catechumens/${c.id}`} className="flex items-center gap-3 hover:text-primary">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold overflow-hidden ${!c.photoUrl ? AVATAR_COLORS[Math.abs(c.firstName?.charCodeAt(0) || 0) % AVATAR_COLORS.length] : ''}`}>
                        {c.photoUrl ? <img src={c.photoUrl} className="w-full h-full object-cover" alt="" /> : `${c.firstName?.[0]}${c.lastName?.[0]}`}
                      </div>
                      <div><p className="font-medium text-sm">{c.firstName} {c.lastName}</p>{c.birthDate && <p className="text-[10px] text-muted-foreground"><Calendar className="inline h-3 w-3 mr-0.5" />{formatDateOnly(c.birthDate, i18n.language)}</p>}</div>
                    </Link>
                  </td>
                  <td className="p-3 hidden md:table-cell text-sm">{getAge(c.birthDate) ? t('catechumens.years_old', { age: getAge(c.birthDate) }) : '—'}</td>
                  <td className="p-3 hidden md:table-cell text-sm">{c.household?.name || '—'}</td>
                  <td className="p-3 hidden lg:table-cell text-sm">{c.enrollments?.map((e: any) => e.class.name).join(', ') || '—'}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((c: any) => (
              <Link key={c.id} to={`/app/catechumens/${c.id}`} className="rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-shadow hover:border-primary/30 group">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold overflow-hidden ${!c.photoUrl ? AVATAR_COLORS[Math.abs(c.firstName?.charCodeAt(0) || 0) % AVATAR_COLORS.length] : ''}`}>
                    {c.photoUrl ? <img src={c.photoUrl} className="w-full h-full object-cover" alt="" /> : `${c.firstName?.[0]}${c.lastName?.[0]}`}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate group-hover:text-primary">{c.firstName} {c.lastName}</p>
                    <p className="text-[11px] text-muted-foreground">{getAge(c.birthDate) ? t('catechumens.years_old', { age: getAge(c.birthDate) }) : ''}{c.birthDate && ` · ${formatDateOnly(c.birthDate, i18n.language, { day: '2-digit', month: '2-digit', year: '2-digit' })}`}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {c.enrollments?.map((e: any) => (
                    <Badge key={e.id} variant="secondary" className="text-[10px]">{e.class?.name}</Badge>
                  ))}
                  {(!c.enrollments || c.enrollments.length === 0) && <span className="text-[10px] text-muted-foreground">{t('catechumens.no_class')}</span>}
                </div>
                {c.household?.name && <p className="mt-2 text-[10px] text-muted-foreground">👨‍👩‍👧 {c.household.name}</p>}
              </Link>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground">{t('catechumens.count', { count: filtered.length })}</p>
      </div>
    </AppShell>
  );
}
