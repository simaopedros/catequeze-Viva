import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, listClasses } from 'wasp/client/operations';
import { Link } from 'react-router';
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
} from 'lucide-react';
import { Button } from '../../client/components/ui/button';
import { Badge } from '../../client/components/ui/badge';
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
import { cn } from '../../client/utils';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

function SurfaceSection({
  title,
  icon: Icon,
  children,
  className,
  tone = 'default',
}: {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
  className?: string;
  tone?: 'default' | 'soft';
}) {
  return (
    <section
      className={cn(
        'rounded-3xl border p-5 shadow-sm shadow-slate-200/60',
        tone === 'soft'
          ? 'border-primary/15 bg-gradient-to-br from-white via-slate-50 to-primary/[0.04]'
          : 'border-border/70 bg-white/90',
        className
      )}
    >
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
        <Icon className="h-4 w-4" />
        <span>{title}</span>
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
    <div className="rounded-2xl border border-white/60 bg-white/85 px-4 py-3 shadow-sm shadow-slate-200/60 backdrop-blur">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-1.5 text-2xl font-bold tracking-tight text-slate-950">{value}</p>
    </div>
  );
}

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

  const activeCount = filtered.filter((c: any) => c.status === 'ACTIVE').length;
  const draftCount = filtered.filter((c: any) => c.status === 'DRAFT').length;
  const activeLabel = classStatusMap.ACTIVE?.label || 'Ativas';
  const draftLabel = classStatusMap.DRAFT?.label || 'Rascunho';

  const filterOptions = useMemo(
    () => classFilters.map((f) => ({
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
          {classFilters.map((f) => <div key={f.status} className="h-8 w-20 animate-pulse rounded-full bg-muted" />)}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[32px] border border-border/70 bg-[radial-gradient(circle_at_top_left,_rgba(17,60,107,0.10),_transparent_34%),linear-gradient(180deg,_rgba(255,255,255,1),_rgba(248,250,252,0.96))] p-6 shadow-sm shadow-slate-200/70 lg:p-8">
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr] xl:items-start">
          <div className="space-y-6">
            <div className="space-y-3">
              <Badge variant="outline" className="rounded-full border-primary/20 bg-white/80 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-primary">
                Gestao de turmas
              </Badge>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                    {t('title')}
                  </h1>
                  <span className="rounded-full bg-white/80 px-3 py-1 text-sm font-medium text-slate-500 ring-1 ring-slate-200/70">
                    {t('active_count', { count: activeClassesCount })}
                  </span>
                </div>
                <p className="max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
                  {t('subtitle')}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <ClassMetric label="Turmas visiveis" value={filtered.length} />
              <ClassMetric label={activeLabel} value={activeCount} />
              <ClassMetric label={draftLabel} value={draftCount} />
            </div>

            <div className="flex flex-wrap gap-3">
              {canCreateClass && !isClassLimitReached && (
                <Button asChild size="lg" className="h-11 rounded-xl px-5">
                  <Link to="/app/classes/new"><Plus className="mr-2 h-4 w-4" />{t('new_class')}</Link>
                </Button>
              )}
              <Button
                size="lg"
                variant="outline"
                className="h-11 rounded-xl px-5 bg-white/80"
                onClick={() => setView((v) => v === 'grid' ? 'list' : 'grid')}
                aria-label={view === 'grid' ? t('view_list') : t('view_grid')}
              >
                {view === 'grid' ? <List className="mr-2 h-4 w-4" /> : <LayoutGrid className="mr-2 h-4 w-4" />}
                {view === 'grid' ? t('view_list') : t('view_grid')}
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl border border-white/70 bg-white/80 p-4 shadow-sm shadow-slate-200/60 backdrop-blur">
              <div className="space-y-4">
                <FilterPills options={filterOptions} value={filter} onChange={setFilter} />
                <SearchInput placeholder={t('search_placeholder')} value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>

            {isClassLimitReached ? (
              <PlanLimitBanner type="class_limit" currentCount={activeClassesCount} userPlan={effectivePlan} isParishManaged={!isPersonal} compact />
            ) : (
              <div className="rounded-3xl border border-dashed border-border/80 bg-white/70 p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-slate-100 p-2.5 text-slate-500">
                    <Search className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900">Organize suas turmas</p>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600">
                      Filtre por status, pesquise por nome e acompanhe o andamento das turmas em um unico lugar.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {filtered.length === 0 && !search ? (
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <SurfaceSection title="Primeiras turmas" icon={CheckCircle2} tone="soft" className="p-6 lg:p-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight text-slate-950">{t('no_classes')}</h2>
                <p className="max-w-2xl text-base leading-relaxed text-slate-600">{t('no_classes_desc')}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-white/80 px-4 py-4 ring-1 ring-slate-200/70">
                  <p className="text-sm font-semibold text-slate-900">1. {t('empty_step1')}</p>
                </div>
                <div className="rounded-2xl bg-white/80 px-4 py-4 ring-1 ring-slate-200/70">
                  <p className="text-sm font-semibold text-slate-900">2. {t('empty_step2')}</p>
                </div>
                <div className="rounded-2xl bg-white/80 px-4 py-4 ring-1 ring-slate-200/70">
                  <p className="text-sm font-semibold text-slate-900">3. {t('empty_step3')}</p>
                </div>
              </div>

              {isClassLimitReached ? (
                <PlanLimitBanner type="class_limit" currentCount={activeClassesCount} userPlan={effectivePlan} isParishManaged={!isPersonal} />
              ) : canCreateClass ? (
                <div className="flex flex-wrap gap-3">
                  <Button className="h-11 rounded-xl px-5" asChild>
                    <Link to="/app/classes/new">{t('create')}</Link>
                  </Button>
                </div>
              ) : null}
            </div>
          </SurfaceSection>

          <SurfaceSection title="Estrutura sugerida" icon={BookOpen}>
            <div className="space-y-3 text-sm leading-relaxed text-slate-600">
              <div className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200/70">
                Defina etapa, horario e catequista principal para cada turma.
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200/70">
                Cadastre os catequizandos para acompanhar presenca, encontros e progresso.
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200/70">
                Use o Copiloto de Conteudo para preparar os encontros com mais consistencia.
              </div>
            </div>
          </SurfaceSection>
        </div>
      ) : filtered.length === 0 ? (
        <SurfaceSection title="Busca" icon={Search} tone="soft">
          <EmptyState compact icon={Search} title={t('no_filter_results')} description={t('no_filter_desc')} />
        </SurfaceSection>
      ) : view === 'list' ? (
        <section className="overflow-hidden rounded-3xl border border-border/70 bg-white/90 shadow-sm shadow-slate-200/60">
          <div className="border-b border-border/70 bg-slate-50/80 px-5 py-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">{t('table_class')}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-slate-50/50 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  <th className="p-4">{t('table_class')}</th>
                  <th className="p-4">{t('status')}</th>
                  <th className="p-4 hidden md:table-cell">{t('enrolled')}</th>
                  <th className="p-4 hidden md:table-cell">{t('table_schedule')}</th>
                  <th className="p-4">{tc('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((cls: any) => (
                  <tr key={cls.id} className="border-b border-border/60 last:border-0 hover:bg-slate-50/80 transition-colors">
                    <td className="p-4">
                      <Link to={`/app/classes/${cls.id}`} className="font-medium text-sm hover:text-primary">{cls.name}</Link>
                    </td>
                    <td className="p-4">
                      <Badge variant={classStatusMap[cls.status as keyof typeof classStatusMap]?.variant || 'secondary'} className="text-overline">
                        {classStatusMap[cls.status as keyof typeof classStatusMap]?.label || cls.status}
                      </Badge>
                    </td>
                    <td className="p-4 hidden md:table-cell text-sm">{cls._count?.enrollments || 0}</td>
                    <td className="p-4 hidden md:table-cell text-sm text-muted-foreground">{formatDay(cls.dayOfWeek)}{cls.startTime && ` ${cls.startTime}`}</td>
                    <td className="p-4">
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-8 text-xs" asChild>
                          <Link to={`/app/classes/${cls.id}`}><Edit3 className="h-3.5 w-3.5" /></Link>
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 text-xs" asChild>
                          <Link to={`/app/classes/${cls.id}/attendance`}><ClipboardList className="h-3.5 w-3.5" /></Link>
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
            <div key={cls.id} className="group overflow-hidden rounded-3xl border border-border/70 bg-white/90 p-5 shadow-sm shadow-slate-200/60 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-300/40">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <Link to={`/app/classes/${cls.id}`} className="block truncate text-lg font-semibold tracking-tight text-slate-950 hover:text-primary">
                      {cls.name}
                    </Link>
                    <Badge variant={classStatusMap[cls.status as keyof typeof classStatusMap]?.variant || 'secondary'} className="ml-2 shrink-0 text-overline">
                      {classStatusMap[cls.status as keyof typeof classStatusMap]?.label}
                    </Badge>
                  </div>
                  {cls.stage && (
                    <p className="mt-1 text-sm text-slate-500">
                      {cls.stage.name}{cls.parish?.name && ` · ${cls.parish.name}`}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200/70">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-slate-500">
                    <Users className="h-3.5 w-3.5" />
                    {t('enrolled')}
                  </div>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{cls._count?.enrollments || 0}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200/70">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-slate-500">
                    <Clock className="h-3.5 w-3.5" />
                    {t('table_schedule')}
                  </div>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {cls.dayOfWeek != null && cls.dayOfWeek !== '' ? `${formatDay(cls.dayOfWeek)}${cls.startTime ? ` ${cls.startTime}` : ''}` : 'Sem horario'}
                  </p>
                </div>
              </div>

              {cls.leadCatechist && (
                <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                  <User className="h-4 w-4 text-slate-400" />
                  <span>{cls.leadCatechist.firstName}</span>
                </div>
              )}

              {cls.meetings?.[0] && (
                <div className={cn(
                  'mt-4 rounded-2xl px-4 py-3 text-sm font-medium',
                  isToday(cls.meetings[0].date)
                    ? 'bg-primary/10 text-primary ring-1 ring-primary/15'
                    : 'bg-slate-50 text-slate-600 ring-1 ring-slate-200/70'
                )}>
                  {isToday(cls.meetings[0].date)
                    ? t('meeting_today')
                    : t('next_meeting', {
                        date: formatDate(cls.meetings[0].date, currentLocale, { day: '2-digit', month: '2-digit' }),
                      })}
                </div>
              )}

              <div className="mt-5 flex gap-2 border-t border-border/60 pt-4">
                <Button size="sm" variant="outline" className="h-9 flex-1 rounded-xl bg-white" asChild>
                  <Link to={`/app/classes/${cls.id}/attendance`}><ClipboardList className="mr-2 h-3.5 w-3.5" />{t('attendance')}</Link>
                </Button>
                <Button size="sm" variant="outline" className="h-9 flex-1 rounded-xl bg-white" asChild>
                  <Link to={`/app/classes/${cls.id}`}><Edit3 className="mr-2 h-3.5 w-3.5" />{t('details')}</Link>
                </Button>
                <Button size="sm" variant="ghost" className="h-9 w-9 rounded-xl px-0" asChild>
                  <Link to={`/app/classes/${cls.id}`} aria-label={t('details')}><ArrowRight className="h-4 w-4" /></Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-sm text-slate-500">{t('found_count', { count: filtered.length })}</p>
    </div>
  );
}

