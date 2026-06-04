import { useState, useMemo } from 'react';
import { useQuery, listHouseholds, listCommunities } from 'wasp/client/operations';
import { Link } from 'react-router';
import { Heart, Users, Plus, Search, Phone, MapPin, User, ChevronRight, Building2 } from 'lucide-react';
import { Button } from '../../client/components/ui/button';
import { AppShell } from '../AppShell';
import { useActiveParish } from '../../client/hooks/useActiveParish';

export default function FamiliesPage() {
  const { activeParishId } = useActiveParish();
  const { data: households, isLoading } = useQuery(listHouseholds);
  const { data: communities = [] } = useQuery(listCommunities, activeParishId ? { parishId: activeParishId } : { parishId: undefined } as any);
  const [search, setSearch] = useState('');
  const [communityFilter, setCommunityFilter] = useState('');

  const filtered = useMemo(() => {
    if (!households) return [];
    let result = [...households];
    if (activeParishId) result = result.filter((h: any) => h.parishId === activeParishId);
    if (communityFilter) result = result.filter((h: any) => h.communityId === communityFilter);
    if (!search) return result;
    return result.filter((h: any) => h.name?.toLowerCase().includes(search.toLowerCase()));
  }, [households, search, activeParishId, communityFilter]);

  if (isLoading) {
    return (
      <AppShell>
        <div className="space-y-6 animate-pulse">
          <div className="h-8 w-32 bg-muted rounded" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{[1,2,3].map(i => <div key={i} className="h-36 rounded-xl bg-muted" />)}</div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Famílias</h1>
            <p className="text-muted-foreground text-sm">{households?.length || 0} famílias cadastradas</p>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)}
                className="flex h-9 w-40 rounded-md border border-input bg-background pl-9 pr-3 text-sm" />
            </div>
            <select
              value={communityFilter}
              onChange={e => setCommunityFilter(e.target.value)}
              className="flex h-9 rounded-md border border-input bg-background px-3 text-sm w-36"
            >
              <option value="">Todas comunidades</option>
              {communities.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <Button asChild><Link to="/app/families/new"><Plus className="mr-1 h-4 w-4" />Nova</Link></Button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border bg-card p-12 text-center">
            <div className="mb-4 rounded-full bg-primary/10 p-4"><Heart className="h-8 w-8 text-primary" /></div>
            <h3 className="text-lg font-semibold">{search ? 'Nenhuma encontrada' : 'Nenhuma família'}</h3>
            <p className="mt-1 text-sm text-muted-foreground">Cadastre famílias para vincular catequizandos e responsáveis.</p>
            {!search && <Button className="mt-4" asChild><Link to="/app/families/new">Cadastrar família</Link></Button>}
          </div>
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
                  <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{h._count?.catechumens || 0} catequizandos</span>
                  <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" />{h.guardians?.length || 0} responsáveis</span>
                </div>
                {h.catechumens?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {h.catechumens.slice(0, 3).map((c: any) => <span key={c.id} className="text-[10px] bg-muted px-2 py-0.5 rounded-full">{c.firstName}</span>)}
                    {h.catechumens.length > 3 && <span className="text-[10px] text-muted-foreground">+{h.catechumens.length - 3}</span>}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground">{filtered.length} família(s)</p>
      </div>
    </AppShell>
  );
}
