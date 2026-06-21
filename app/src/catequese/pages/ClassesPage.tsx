import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, listClasses } from 'wasp/client/operations';
import { Link } from 'react-router';
import { Plus, Users, BookOpen, ClipboardList, Edit3, LayoutGrid, List, Clock, Search, User } from 'lucide-react';
import { Button } from '../../client/components/ui/button';
import { Badge } from '../../client/components/ui/badge';
import { PageHeader } from '../../client/components/PageHeader';
import { FilterPills } from '../../client/components/FilterPills';
import { SearchInput } from '../../client/components/SearchInput';
import { EmptyState } from '../../client/components/EmptyState';
import { SkeletonCard } from '../../client/components/Skeletons';
import { useActiveWorkspace } from '../../client/hooks/useActiveWorkspace';
import { useUserContext } from '../../client/hooks/useUserContext';
import { getPlanLimits } from '../../shared/planLimits';
import { PlanLimitBanner } from '../components/PlanLimitBanner';
import { useClassFilters, useClassStatusMap } from '../../i18n/useLabels';
import { useLocale } from '../../i18n/useLocale';
import { formatDate } from '../../i18n/format';

export default function ClassesPage() {
  const { t } = useTranslation('classes');
  const { t: tc } = useTranslation('common');
  const classFilters = useClassFilters();
  const classStatusMap = useClassStatusMap();
  const { currentLocale } = useLocale();
  const { workspaceId, workspacePlan, isPersonal } = useActiveWorkspace();
  const { data: classes, isLoading } = useQuery(listClasses, { workspaceId } as any);
  const { userRole } = useUserContext();
  const canCreateClass = userRole !== 'ASSISTANT_CATECHIST';
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');

  const effectivePlan = workspacePlan || 'catechist_free';
  const limits = getPlanLimits(effectivePlan);
  const activeClassesCount = classes ? classes.filter((c: any) => c.status !== 'ARCHIVED').length : 0;
  const isClassLimitReached = limits.maxClasses !== null && activeClassesCount >= limits.maxClasses;

  const filtered = useMemo(() => {
    if (!classes) return [];
    let result = [...classes];
    if (filter) result = result.filter((c: any) => c.status === filter);
    if (search) result = result.filter((c: any) => c.name.toLowerCase().includes(search.toLowerCase()));
    return result;
  }, [classes, filter, search]);

  const filterOptions = useMemo(
    () => classFilters.map(f => ({
      value: f.status,
      label: f.status === '' && classes ? `${f.label} (${classes.length})` : f.label,
    })),
    [classFilters, classes],
  );

  const formatDay = (dayOfWeek: string | number | null | undefined) => {
    if (dayOfWeek === null || dayOfWeek === undefined || dayOfWeek === '') return '';
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
            {classFilters.map(f => <div key={f.status} className="h-8 w-20 animate-pulse rounded-full bg-muted" />)}
          </div>
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
          subtitle={t('subtitle')}
          count={classes ? t('active_count', { count: activeClassesCount }) : undefined}
          filters={
            <div className="flex flex-col sm:flex-row gap-3">
              <FilterPills options={filterOptions} value={filter} onChange={setFilter} />
              <SearchInput placeholder={t('search_placeholder')} value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          }
        >
          <Button size="sm" variant="outline" onClick={() => setView(v => v === 'grid' ? 'list' : 'grid')} aria-label={view === 'grid' ? t('view_list') : t('view_grid')}>
            {view === 'grid' ? <List className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
          </Button>
          {isClassLimitReached ? (
            <PlanLimitBanner type="class_limit" currentCount={activeClassesCount} userPlan={effectivePlan} isParishManaged={!isPersonal} compact />
          ) : canCreateClass ? (
            <Button asChild>
              <Link to="/app/classes/new"><Plus className="mr-2 h-4 w-4" />{t('new_class')}</Link>
            </Button>
          ) : null}
        </PageHeader>

        {filtered.length === 0 && !search ? (
          <EmptyState
            icon={BookOpen}
            title={t('no_classes')}
            description={t('no_classes_desc')}
          >
            <div className="mt-6 space-y-2 text-sm text-muted-foreground">
              <p><span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold mr-2">1</span>{t('empty_step1')}</p>
              <p><span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold mr-2">2</span>{t('empty_step2')}</p>
              <p><span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold mr-2">3</span>{t('empty_step3')}</p>
            </div>
            {isClassLimitReached ? (
              <PlanLimitBanner type="class_limit" currentCount={activeClassesCount} userPlan={effectivePlan} isParishManaged={!isPersonal} />
            ) : canCreateClass ? (
              <Button className="mt-6" asChild><Link to="/app/classes/new">{t('create')}</Link></Button>
            ) : null}
          </EmptyState>
        ) : filtered.length === 0 ? (
          <EmptyState compact icon={Search} title={t('no_filter_results')} description={t('no_filter_desc')} />
        ) : view === 'list' ? (
          <div className="rounded-xl border bg-card overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b text-left text-xs text-muted-foreground uppercase"><th className="p-3 font-medium">{t('table_class')}</th><th className="p-3 font-medium">{t('status')}</th><th className="p-3 font-medium hidden md:table-cell">{t('enrolled')}</th><th className="p-3 font-medium hidden md:table-cell">{t('table_schedule')}</th><th className="p-3 font-medium">{tc('actions')}</th></tr></thead>
              <tbody>
                {filtered.map((cls: any) => (
                  <tr key={cls.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-3"><Link to={`/app/classes/${cls.id}`} className="font-medium text-sm hover:text-primary">{cls.name}</Link></td>
                    <td className="p-3"><Badge variant={classStatusMap[cls.status as keyof typeof classStatusMap]?.variant || 'secondary'} className="text-overline">{classStatusMap[cls.status as keyof typeof classStatusMap]?.label || cls.status}</Badge></td>
                    <td className="p-3 hidden md:table-cell text-sm">{cls._count?.enrollments || 0}</td>
                    <td className="p-3 hidden md:table-cell text-sm text-muted-foreground">{formatDay(cls.dayOfWeek)}{cls.startTime && ` ${cls.startTime}`}</td>
                    <td className="p-3"><div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-7 text-xs" asChild><Link to={`/app/classes/${cls.id}`}><Edit3 className="h-3 w-3" /></Link></Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" asChild><Link to={`/app/classes/${cls.id}/attendance`}><ClipboardList className="h-3 w-3" /></Link></Button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((cls: any) => (
              <div key={cls.id} className="rounded-xl border bg-card p-4 shadow-elevation-sm hover:shadow-elevation-md transition-shadow group">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <Link to={`/app/classes/${cls.id}`} className="font-semibold text-sm hover:text-primary truncate block">{cls.name}</Link>
                    {cls.stage && <p className="text-overline text-muted-foreground mt-0.5">{cls.stage.name}{cls.parish?.name && ` · ${cls.parish.name}`}</p>}
                  </div>
                  <Badge variant={classStatusMap[cls.status as keyof typeof classStatusMap]?.variant || 'secondary'} className="text-overline ml-2 shrink-0">{classStatusMap[cls.status as keyof typeof classStatusMap]?.label}</Badge>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-overline text-muted-foreground mb-2">
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" />{t('enrolled_count', { count: cls._count?.enrollments || 0 })}</span>
                  {cls.dayOfWeek != null && cls.dayOfWeek !== '' && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDay(cls.dayOfWeek)}{cls.startTime && ` ${cls.startTime}`}</span>}
                  {cls.leadCatechist && <span className="flex items-center gap-1"><User className="h-3 w-3" />{cls.leadCatechist.firstName}</span>}
                </div>

                {cls.meetings?.[0] && (
                  <div className={`rounded-md px-2 py-1 text-overline font-medium mb-2 ${isToday(cls.meetings[0].date) ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    {isToday(cls.meetings[0].date) ? `🔴 ${t('meeting_today')}` : t('next_meeting', { date: formatDate(cls.meetings[0].date, currentLocale, { day: '2-digit', month: '2-digit' }) })}
                  </div>
                )}

                <div className="flex gap-2 pt-2 border-t lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                  <Button size="sm" variant="outline" className="h-7 text-xs flex-1" asChild>
                    <Link to={`/app/classes/${cls.id}/attendance`}><ClipboardList className="mr-1 h-3 w-3" />{t('attendance')}</Link>
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs flex-1" asChild>
                    <Link to={`/app/classes/${cls.id}`}><Edit3 className="mr-1 h-3 w-3" />{t('details')}</Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground">{t('found_count', { count: filtered.length })}</p>
      </div>
  );
}
