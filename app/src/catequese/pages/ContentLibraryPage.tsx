import { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Button } from '../../client/components/ui/button';
import { Badge } from '../../client/components/ui/badge';
import { Plus, BookOpen, Clock, Tag, Search, User, Puzzle, LayoutGrid, List, ArrowUpDown, Sparkles } from 'lucide-react';
import { AppShell } from '../AppShell';
import { useQuery, listContentItems } from 'wasp/client/operations';
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
  const { activeParishId } = useActiveParish();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Todos');
  const [view, setView] = useState<'grid'|'list'>('grid');
  const [sort, setSort] = useState<'recent'|'az'>('recent');
  const [onlyWithActivities, setOnlyWithActivities] = useState(
    searchParams.get('activities') === '1'
  );

  const filtered = useMemo(() => {
    let result = [...items];
    if (activeParishId) result = result.filter((i: any) => i.parishId === activeParishId);
    const status = STATUS_KEYS[filter];
    if (status) result = result.filter((i: any) => i.status === status);
    if (search) result = result.filter((i: any) => `${i.title} ${i.theme||''}`.toLowerCase().includes(search.toLowerCase()));
    if (onlyWithActivities) result = result.filter((i: any) => (i._count?.activities || 0) > 0);
    if (sort === 'az') result.sort((a: any, b: any) => a.title.localeCompare(b.title));
    return result;
  }, [items, filter, search, sort, activeParishId, onlyWithActivities]);

  const totalActivities = useMemo(
    () => items.reduce((sum: number, i: any) => sum + (i._count?.activities || 0), 0),
    [items],
  );

  if (loading) {
    return <AppShell><div className="space-y-6 animate-pulse"><div className="h-8 w-48 bg-muted rounded" /><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{[1,2,3].map(i=><div key={i} className="h-40 rounded-xl bg-muted"/>)}</div></div></AppShell>;
  }

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Biblioteca de Conteúdo</h1>
            <p className="text-muted-foreground text-sm">
              {items.length} roteiros · {totalActivities} atividades
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" asChild>
              <Link to="/app/ai-planner" className="gap-1"><Sparkles className="h-4 w-4"/>Gerar com IA</Link>
            </Button>
            <Button size="sm" variant="outline" onClick={() => setSort(s => s==='recent'?'az':'recent')}><ArrowUpDown className="h-4 w-4" /></Button>
            <Button size="sm" variant="outline" onClick={() => setView(v => v==='grid'?'list':'grid')}>{view==='grid'?<List className="h-4 w-4"/>:<LayoutGrid className="h-4 w-4"/>}</Button>
            <Button asChild><Link to="/app/content-library/new"><Plus className="mr-1 h-4 w-4"/>Novo</Link></Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex gap-1 flex-wrap">
            {/* Activity filter */}
            <button
              onClick={() => setOnlyWithActivities(false)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${!onlyWithActivities ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
            >
              Todos
            </button>
            <button
              onClick={() => setOnlyWithActivities(true)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1 ${onlyWithActivities ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
            >
              <Puzzle className="h-3 w-3" /> Com atividades
            </button>
            <span className="w-px h-6 bg-border self-center mx-1" />
            {/* Status filters */}
            {STATUS_FILTERS.map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${filter===f?'bg-primary text-primary-foreground':'bg-muted text-muted-foreground hover:bg-muted/80'}`}>{f}</button>
            ))}
          </div>
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
            <input placeholder="Buscar..." value={search} onChange={e=>setSearch(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm"/>
          </div>
        </div>

        {/* Empty */}
        {filtered.length===0?(
          <div className="flex flex-col items-center justify-center rounded-xl border bg-card p-12 text-center">
            <div className="mb-4 rounded-full bg-primary/10 p-4"><BookOpen className="h-8 w-8 text-primary"/></div>
            <h3 className="text-lg font-semibold">{search||filter!=='Todos'||onlyWithActivities?'Nenhum resultado':'Nenhum conteúdo'}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {onlyWithActivities ? 'Nenhum roteiro possui atividades ainda. Crie um roteiro e adicione atividades.' : ''}
            </p>
            <Button className="mt-4" asChild><Link to="/app/content-library/new">Criar conteúdo</Link></Button>
          </div>
        ):view==='list'?(
          <div className="rounded-xl border bg-card"><table className="w-full"><thead><tr className="border-b text-left text-xs text-muted-foreground uppercase"><th className="p-3">Título</th><th className="p-3 hidden md:table-cell">Status</th><th className="p-3 hidden md:table-cell">Atividades</th><th className="p-3 hidden lg:table-cell">Tempo</th></tr></thead><tbody>{filtered.map((i:any)=>(
            <tr key={i.id} className="border-b hover:bg-muted/30"><td className="p-3"><Link to={`/app/content-library/${i.id}`} className="font-medium text-sm hover:text-primary">{i.title}</Link><p className="text-[10px] text-muted-foreground">{i.theme}</p></td><td className="p-3 hidden md:table-cell"><Badge variant={STATUS_MAP[i.status]?.variant||'secondary'} className="text-[10px]">{STATUS_MAP[i.status]?.label}</Badge></td><td className="p-3 hidden md:table-cell text-sm">{i._count?.activities||0}</td><td className="p-3 hidden lg:table-cell text-sm">{i.estimatedTime?`${i.estimatedTime} min`:'—'}</td></tr>
          ))}</tbody></table></div>
        ):(
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((item:any)=>(
              <Link key={item.id} to={`/app/content-library/${item.id}`} className="rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow group">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-sm group-hover:text-primary flex-1 line-clamp-2">{item.title}</h3>
                  <Badge variant={STATUS_MAP[item.status]?.variant||'secondary'} className="text-[10px] ml-2 flex-shrink-0">{STATUS_MAP[item.status]?.label}</Badge>
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
