import { useState, useMemo } from 'react';
import { useQuery, listClasses } from 'wasp/client/operations';
import { useAuth } from 'wasp/client/auth';
import { Link } from 'react-router';
import { Plus, Users, BookOpen, ClipboardList, Edit3, LayoutGrid, List, Clock, Search } from 'lucide-react';
import { CLASS_STATUS_MAP, CLASS_FILTERS, CLASS_FILTER_STATUS } from '../../shared/constants';
import { Button } from '../../client/components/ui/button';
import { Badge } from '../../client/components/ui/badge';
import { PageHeader } from '../../client/components/PageHeader';
import { FilterPills } from '../../client/components/FilterPills';
import { SearchInput } from '../../client/components/SearchInput';
import { EmptyState } from '../../client/components/EmptyState';
import { SkeletonCard } from '../../client/components/Skeletons';
import { AppShell } from '../AppShell';
import { useActiveWorkspace } from '../../client/hooks/useActiveWorkspace';
import { useUserContext } from '../../client/hooks/useUserContext';
import { getPlanLimits, getEffectiveBillingPlan, isBillingActive } from '../../shared/planLimits';
import { PlanLimitBanner } from '../components/PlanLimitBanner';

export default function ClassesPage() {
  const { workspaceId, workspacePlan, isPersonal } = useActiveWorkspace();
  const { data: classes, isLoading } = useQuery(listClasses, { workspaceId } as any);
  const { data: user } = useAuth();
  const { userRole } = useUserContext();
  const canCreateClass = userRole !== 'ASSISTANT_CATECHIST';
  const [filter, setFilter] = useState('Todas');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');

  // For personal workspace, billing is derived from user subscription
  const effectivePlan = workspacePlan || 'catechist_free';
  const limits = getPlanLimits(effectivePlan);
  const isClassLimitReached = limits.maxClasses !== null && classes && classes.length >= limits.maxClasses;

  const filtered = useMemo(() => {
    if (!classes) return [];
    let result = [...classes]; // Already filtered by workspaceId on server
    const status = CLASS_FILTER_STATUS[filter];
    if (status) result = result.filter((c: any) => c.status === status);
    if (search) result = result.filter((c: any) => c.name.toLowerCase().includes(search.toLowerCase()));
    return result;
  }, [classes, filter, search]);

  const filterOptions = useMemo(
    () => CLASS_FILTERS.map(f => ({
      value: f,
      label: f === 'Todas' && classes ? `${f} (${classes.length})` : f,
    })),
    [classes],
  );

  const isToday = (dateStr: string) => {
    const d = new Date(dateStr);
    const t = new Date();
    return d.toDateString() === t.toDateString();
  };

  if (isLoading) {
    return (
      <AppShell>
        <div className="space-y-6">
          <div className="h-8 w-40 animate-pulse rounded bg-muted" />
          <div className="flex gap-2">
            {CLASS_FILTERS.map(f => <div key={f} className="h-8 w-20 animate-pulse rounded-full bg-muted" />)}
          </div>
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
          title="Turmas"
          subtitle="Gerencie turmas, catequistas e catequizandos."
        >
          <Button size="sm" variant="outline" onClick={() => setView(v => v === 'grid' ? 'list' : 'grid')} aria-label={view === 'grid' ? 'Ver como lista' : 'Ver como grelha'}>
            {view === 'grid' ? <List className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
          </Button>
          {isClassLimitReached ? (
            <PlanLimitBanner type="class_limit" currentCount={classes!.length} userPlan={effectivePlan} isParishManaged={!isPersonal} className="min-w-[280px]" />
          ) : canCreateClass ? (
            <Button asChild>
              <Link to="/app/classes/new"><Plus className="mr-2 h-4 w-4" />Nova turma</Link>
            </Button>
          ) : null}
        </PageHeader>

        <div className="flex flex-col sm:flex-row gap-3">
          <FilterPills options={filterOptions} value={filter} onChange={setFilter} />
          <SearchInput placeholder="Buscar turma..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {filtered.length === 0 && !search ? (
          <EmptyState
            icon={BookOpen}
            title="Nenhuma turma criada ainda"
            description="Comece criando a primeira turma do ano catequético."
          >
            <div className="mt-6 space-y-2 text-sm text-muted-foreground">
              <p><span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold mr-2">1</span>Crie uma turma</p>
              <p><span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold mr-2">2</span>Cadastre catequizandos</p>
              <p><span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold mr-2">3</span>Matricule-os na turma</p>
            </div>
            {isClassLimitReached ? (
              <PlanLimitBanner type="class_limit" currentCount={classes!.length} userPlan={effectivePlan} isParishManaged={!isPersonal} />
            ) : canCreateClass ? (
              <Button className="mt-6" asChild><Link to="/app/classes/new">Criar turma</Link></Button>
            ) : null}
          </EmptyState>
        ) : filtered.length === 0 ? (
          <EmptyState compact icon={Search} title="Nenhuma turma encontrada com esse filtro." description="Tente outro termo ou limpe os filtros." />
        ) : view === 'list' ? (
          <div className="rounded-xl border bg-card overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b text-left text-xs text-muted-foreground uppercase"><th className="p-3 font-medium">Turma</th><th className="p-3 font-medium">Status</th><th className="p-3 font-medium hidden md:table-cell">Inscritos</th><th className="p-3 font-medium hidden md:table-cell">Horário</th><th className="p-3 font-medium">Ações</th></tr></thead>
              <tbody>
                {filtered.map((cls: any) => (
                  <tr key={cls.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-3"><Link to={`/app/classes/${cls.id}`} className="font-medium text-sm hover:text-primary">{cls.name}</Link></td>
                    <td className="p-3"><Badge variant={CLASS_STATUS_MAP[cls.status]?.variant || 'secondary'} className="text-[10px]">{CLASS_STATUS_MAP[cls.status]?.label || cls.status}</Badge></td>
                    <td className="p-3 hidden md:table-cell text-sm">{cls._count?.enrollments || 0}</td>
                    <td className="p-3 hidden md:table-cell text-sm text-muted-foreground">{cls.dayOfWeek}{cls.startTime && ` ${cls.startTime}`}</td>
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
              <div key={cls.id} className="rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow group">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <Link to={`/app/classes/${cls.id}`} className="font-semibold hover:text-primary truncate block">{cls.name}</Link>
                    <p className="text-xs text-muted-foreground mt-0.5">{cls.parish?.name}{cls.stage && ` · ${cls.stage.name}`}</p>
                  </div>
                  <Badge variant={CLASS_STATUS_MAP[cls.status]?.variant || 'secondary'} className="text-[10px] ml-2">{CLASS_STATUS_MAP[cls.status]?.label}</Badge>
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                  <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{cls._count?.enrollments || 0} inscritos</span>
                  {cls.dayOfWeek && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{cls.dayOfWeek} {cls.startTime}</span>}
                </div>

                {cls.meetings?.[0] && (
                  <div className={`rounded-lg px-2 py-1 text-[10px] font-medium mb-3 ${isToday(cls.meetings[0].date) ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    {isToday(cls.meetings[0].date) ? '🔴 Encontro hoje' : `Próx: ${new Date(cls.meetings[0].date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`}
                  </div>
                )}

                <div className="flex gap-2 pt-2 border-t lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                  <Button size="sm" variant="outline" className="h-8 text-xs flex-1" asChild>
                    <Link to={`/app/classes/${cls.id}/attendance`}><ClipboardList className="mr-1 h-3.5 w-3.5" />Presença</Link>
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 text-xs flex-1" asChild>
                    <Link to={`/app/classes/${cls.id}`}><Edit3 className="mr-1 h-3.5 w-3.5" />Detalhes</Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground">{filtered.length} turma(s) encontrada(s)</p>
      </div>
    </AppShell>
  );
}
