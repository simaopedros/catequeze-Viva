import { useState, useMemo } from 'react';
import { useQuery, listCatechumens } from 'wasp/client/operations';
import { Link } from 'react-router';
import { GraduationCap, Plus, Search, LayoutGrid, List, Upload, Calendar } from 'lucide-react';
import { Button } from '../../client/components/ui/button';
import { Badge } from '../../client/components/ui/badge';
import { AppShell } from '../AppShell';
import { useActiveParish } from '../../client/hooks/useActiveParish';
import { useUserContext } from '../../client/hooks/useUserContext';

const AVATAR_COLORS = [
    'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 dark:border dark:border-blue-900/50',
    'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400 dark:border dark:border-green-900/50',
    'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 dark:border dark:border-amber-900/50',
    'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 dark:border dark:border-purple-900/50',
    'bg-pink-100 text-pink-700 dark:bg-pink-950/40 dark:text-pink-400 dark:border dark:border-pink-900/50',
    'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-400 dark:border dark:border-cyan-900/50'
  ];

function getAge(birthDate: string): number | null {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) age--;
  return age;
}

export default function CatechumensPage() {
  const { data: catechumens, isLoading } = useQuery(listCatechumens);
  const { activeParishId } = useActiveParish();
  const { userRole } = useUserContext();
  const canManageCatechumens = userRole !== 'ASSISTANT_CATECHIST';
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
      // Backend already filters by parish — only apply safe frontend filter for enrolled classes
      result = result.filter((c: any) =>
        c.enrollments?.some((e: any) => e.class?.parishId === activeParishId) ||
        c.household?.parishId === activeParishId ||
        (!c.enrollments?.length && !c.household?.parishId) // show unlinked catechumens
      );
    }
    if (search) result = result.filter((c: any) => `${c.firstName} ${c.lastName}`.toLowerCase().includes(search.toLowerCase()));
    if (classFilter) result = result.filter((c: any) => c.enrollments?.some((e: any) => e.class?.name === classFilter));
    return result;
  }, [catechumens, search, classFilter, activeParishId]);

  if (isLoading) {
    return (
      <AppShell>
        <div className="space-y-6 animate-pulse">
          <div className="h-8 w-44 bg-muted rounded" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[1,2,3,4,5,6].map(i => <div key={i} className="h-28 rounded-xl bg-muted" />)}</div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Catequizandos</h1>
            <p className="text-muted-foreground text-sm">{catechumens?.length || 0} catequizandos cadastrados</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setView(v => v === 'cards' ? 'table' : 'cards')}>
              {view === 'cards' ? <List className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
            </Button>
            {canManageCatechumens && (
              <>
                <Button size="sm" variant="outline" asChild><Link to="/app/catechumens/import"><Upload className="mr-1 h-4 w-4" />Importar</Link></Button>
                <Button size="sm" asChild><Link to="/app/catechumens/new"><Plus className="mr-1 h-4 w-4" />Novo</Link></Button>
              </>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input placeholder="Buscar por nome..." value={search} onChange={e => setSearch(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm" />
          </div>
          <select value={classFilter} onChange={e => setClassFilter(e.target.value)}
            className="flex h-9 w-44 rounded-md border border-input bg-background px-3 text-sm">
            <option value="">Todas as turmas</option>
            {classNames.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border bg-card p-12 text-center">
            <div className="mb-4 rounded-full bg-primary/10 p-4"><GraduationCap className="h-8 w-8 text-primary" /></div>
            <h3 className="text-lg font-semibold">{search || classFilter ? 'Nenhum resultado' : 'Nenhum catequizando'}</h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-md">{search || classFilter ? 'Tente ajustar os filtros.' : 'Cadastre catequizandos e vincule-os às turmas.'}</p>
            {!search && !classFilter && canManageCatechumens && <Button className="mt-4" asChild><Link to="/app/catechumens/new">Cadastrar catequizando</Link></Button>}
          </div>
        ) : view === 'table' ? (
          <div className="rounded-xl border bg-card overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b text-left text-xs text-muted-foreground uppercase"><th className="p-3 font-medium">Nome</th><th className="p-3 font-medium hidden md:table-cell">Idade</th><th className="p-3 font-medium hidden md:table-cell">Família</th><th className="p-3 font-medium hidden lg:table-cell">Turmas</th></tr></thead>
              <tbody>{filtered.map((c: any) => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-3">
                    <Link to={`/app/catechumens/${c.id}`} className="flex items-center gap-3 hover:text-primary">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold overflow-hidden ${!c.photoUrl ? AVATAR_COLORS[Math.abs(c.firstName?.charCodeAt(0) || 0) % AVATAR_COLORS.length] : ''}`}>
                        {c.photoUrl ? <img src={c.photoUrl} className="w-full h-full object-cover" /> : `${c.firstName?.[0]}${c.lastName?.[0]}`}
                      </div>
                      <div><p className="font-medium text-sm">{c.firstName} {c.lastName}</p>{c.birthDate && <p className="text-[10px] text-muted-foreground"><Calendar className="inline h-3 w-3 mr-0.5" />{new Date(c.birthDate).toLocaleDateString()}</p>}</div>
                    </Link>
                  </td>
                  <td className="p-3 hidden md:table-cell text-sm">{getAge(c.birthDate) ? `${getAge(c.birthDate)} anos` : '—'}</td>
                  <td className="p-3 hidden md:table-cell text-sm">{c.household?.name || '—'}</td>
                  <td className="p-3 hidden lg:table-cell text-sm">{c.enrollments?.map((e: any) => e.class.name).join(', ') || '—'}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((c: any, i: number) => (
              <Link key={c.id} to={`/app/catechumens/${c.id}`} className="rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-shadow hover:border-primary/30 group">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold overflow-hidden ${!c.photoUrl ? AVATAR_COLORS[Math.abs(c.firstName?.charCodeAt(0) || 0) % AVATAR_COLORS.length] : ''}`}>
                    {c.photoUrl ? <img src={c.photoUrl} className="w-full h-full object-cover" /> : `${c.firstName?.[0]}${c.lastName?.[0]}`}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate group-hover:text-primary">{c.firstName} {c.lastName}</p>
                    <p className="text-[11px] text-muted-foreground">{getAge(c.birthDate) ? `${getAge(c.birthDate)} anos` : ''}{c.birthDate && ` · ${new Date(c.birthDate).toLocaleDateString('pt-BR', {day:'2-digit',month:'2-digit',year:'2-digit'})}`}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {c.enrollments?.map((e: any) => (
                    <Badge key={e.id} variant="secondary" className="text-[10px]">{e.class?.name}</Badge>
                  ))}
                  {(!c.enrollments || c.enrollments.length === 0) && <span className="text-[10px] text-muted-foreground">Sem turma</span>}
                </div>
                {c.household?.name && <p className="mt-2 text-[10px] text-muted-foreground">👨‍👩‍👧 {c.household.name}</p>}
              </Link>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground">{filtered.length} catequizando(s)</p>
      </div>
    </AppShell>
  );
}
