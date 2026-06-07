import { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Button } from '../../client/components/ui/button';
import { Badge } from '../../client/components/ui/badge';
import { PageHeader } from '../../client/components/PageHeader';
import { FilterPills } from '../../client/components/FilterPills';
import { SearchInput } from '../../client/components/SearchInput';
import { EmptyState } from '../../client/components/EmptyState';
import { SkeletonCard } from '../../client/components/Skeletons';
import { Plus, BookOpen, Clock, User, Puzzle, LayoutGrid, List, ArrowUpDown, Sparkles, BookMarked, Search } from 'lucide-react';
import { AppShell } from '../AppShell';
import { useQuery, listContentItems, listDioceseSharedContent } from 'wasp/client/operations';
import { useActiveParish } from '../../client/hooks/useActiveParish';

const STATUS_MAP: Record<string, { variant: 'default'|'secondary'|'outline'|'destructive'; label: string }> = {
  DRAFT: { variant: 'secondary', label: 'Rascunho' },
  IN_REVIEW: { variant: 'outline', label: 'Em revisão' },
  APPROVED: { variant: 'default', label: 'Aprovado' },
  PUBLISHED: { variant: 'default', label: 'Publicado' },
  ARCHIVED: { variant: 'destructive', label: 'Arquivado' },
};

const STATUS_FILTERS = ['Todos', 'Rascunho', 'Em revisão', 'Aprovado', 'Publicado'];
const STATUS_KEYS: Record<string, string> = { Todos: '', Rascunho: 'DRAFT', 'Em revisão': 'IN_REVIEW', Aprovado: 'APPROVED', Publicado: 'PUBLISHED' };

export default function ContentLibraryPage() {
  const { data: items = [], isLoading: loading } = useQuery(listContentItems);
  const { data: dioceseItems = [] } = useQuery(listDioceseSharedContent);
  const { activeParishId } = useActiveParish();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Todos');
  const [view, setView] = useState<'grid'|'list'>('grid');
  const [sort, setSort] = useState<'recent'|'az'>('recent');
  const [showDiocese, setShowDiocese] = useState(false);
  const [onlyWithActivities, setOnlyWithActivities] = useState(
    searchParams.get('activities') === '1'
  );

  const filtered = useMemo(() => {
    let result = [...items];
    if (showDiocese) {
      result = [...result, ...dioceseItems.map((d: any) => ({ ...d, isDioceseShared: true }))];
    }
    if (activeParishId) result = result.filter((i: any) => i.parishId === activeParishId || i.isDioceseShared);
    const status = STATUS_KEYS[filter];
    if (status) result = result.filter((i: any) => i.status === status);
    if (search) result = result.filter((i: any) => `${i.title} ${i.theme||''}`.toLowerCase().includes(search.toLowerCase()));
    if (onlyWithActivities) result = result.filter((i: any) => (i._count?.activities || 0) > 0);
    if (sort === 'az') result.sort((a: any, b: any) => a.title.localeCompare(b.title));
    return result;
  }, [items, dioceseItems, filter, search, sort, activeParishId, onlyWithActivities, showDiocese]);

  const totalActivities = useMemo(
    () => items.reduce((sum: number, i: any) => sum + (i._count?.activities || 0), 0),
    [items],
  );

  const activityFilterOptions = [
    { value: 'all', label: 'Todos' },
    { value: 'activities', label: <span className="flex items-center gap-1"><Puzzle className="h-3 w-3" /> Com atividades</span> },
  ];
  const statusFilterOptions = STATUS_FILTERS.map(f => ({ value: f, label: f }));

  const hasFilters = !!(search || filter !== 'Todos' || onlyWithActivities);

  if (loading) {
    return (
      <AppShell>
        <div className="space-y-6">
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
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
          title="Biblioteca de Conteúdo"
          subtitle={`${items.length} roteiros · ${totalActivities} atividades`}
        >
          <Button size="sm" variant="outline" asChild>
            <Link to="/app/ai-planner" className="gap-1"><Sparkles className="h-4 w-4"/>Gerar com IA</Link>
          </Button>
          <Button size="sm" variant="outline" onClick={() => setSort(s => s==='recent'?'az':'recent')}><ArrowUpDown className="h-4 w-4" /></Button>
          <Button size="sm" variant="outline" onClick={() => setView(v => v==='grid'?'list':'grid')}>{view==='grid'?<List className="h-4 w-4"/>:<LayoutGrid className="h-4 w-4"/>}</Button>
          <Button size="sm" variant={showDiocese ? 'default' : 'outline'} onClick={() => setShowDiocese(d => !d)} className="gap-1"><BookMarked className="h-4 w-4" />Diocese</Button>
          <Button asChild><Link to="/app/content-library/new"><Plus className="mr-1 h-4 w-4"/>Novo</Link></Button>
        </PageHeader>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex gap-1 flex-wrap items-center">
            <FilterPills
              options={activityFilterOptions}
              value={onlyWithActivities ? 'activities' : 'all'}
              onChange={v => setOnlyWithActivities(v === 'activities')}
            />
            <span className="w-px h-6 bg-border self-center mx-1" />
            <FilterPills options={statusFilterOptions} value={filter} onChange={setFilter} />
          </div>
          <SearchInput placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {filtered.length === 0 ? (
          hasFilters ? (
            <EmptyState
              compact
              icon={Search}
              title="Nenhum resultado"
              description={onlyWithActivities ? 'Nenhum roteiro possui atividades ainda. Crie um roteiro e adicione atividades.' : 'Tente ajustar os filtros.'}
            />
          ) : (
            <EmptyState icon={BookOpen} title="Nenhum conteúdo" description="Crie roteiros e atividades para suas turmas.">
              <Button className="mt-4" asChild><Link to="/app/content-library/new">Criar conteúdo</Link></Button>
            </EmptyState>
          )
        ) : view === 'list' ? (
          <div className="rounded-xl border bg-card"><table className="w-full"><thead><tr className="border-b text-left text-xs text-muted-foreground uppercase"><th className="p-3">Título</th><th className="p-3 hidden md:table-cell">Status</th><th className="p-3 hidden md:table-cell">Atividades</th><th className="p-3 hidden lg:table-cell">Tempo</th></tr></thead><tbody>{filtered.map((i:any)=>(
            <tr key={i.id} className="border-b hover:bg-muted/30"><td className="p-3"><Link to={`/app/content-library/${i.id}`} className="font-medium text-sm hover:text-primary">{i.title}</Link><p className="text-[10px] text-muted-foreground">{i.theme}</p></td><td className="p-3 hidden md:table-cell"><Badge variant={STATUS_MAP[i.status]?.variant||'secondary'} className="text-[10px]">{STATUS_MAP[i.status]?.label}</Badge></td><td className="p-3 hidden md:table-cell text-sm">{i._count?.activities||0}</td><td className="p-3 hidden lg:table-cell text-sm">{i.estimatedTime?`${i.estimatedTime} min`:'—'}</td></tr>
          ))}</tbody></table></div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((item:any)=>(
              <Link key={item.id} to={`/app/content-library/${item.id}`} className="rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow group">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-sm group-hover:text-primary flex-1 line-clamp-2">{item.title}</h3>
                  <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                    {item.isDioceseShared && <Badge variant="outline" className="text-[10px] gap-0.5"><BookMarked className="h-2.5 w-2.5" />Diocese</Badge>}
                    <Badge variant={STATUS_MAP[item.status]?.variant||'secondary'} className="text-[10px]">{STATUS_MAP[item.status]?.label}</Badge>
                  </div>
                </div>
                {item.theme&&<p className="text-xs text-muted-foreground mb-2 line-clamp-1">{item.theme}</p>}
                <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-3 border-t">
                  <span className="flex items-center gap-1"><User className="h-3 w-3"/>{item.createdBy?.firstName||'—'}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3"/>{item.estimatedTime?`${item.estimatedTime} min`:'—'}</span>
                  <span className={`flex items-center gap-1 font-medium ${(item._count?.activities||0) > 0 ? 'text-primary' : ''}`}>
                    <Puzzle className="h-3 w-3"/>{(item._count?.activities||0)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
