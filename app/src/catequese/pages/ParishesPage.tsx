import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Church, Users, BookOpen, Building2, Plus, MapPin, BadgeCheck, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '../../client/components/ui/button';
import { Badge } from '../../client/components/ui/badge';
import { AppShell } from '../AppShell';
import { useQuery, listParishes, createParish } from 'wasp/client/operations';
import { useAuth } from 'wasp/client/auth';
import { handlePlanLimitError } from '../lib/planLimitToast';
import CityStateSelect from '../../client/components/CityStateSelect';

const PLAN_LABELS: Record<string, string> = {
  CATECHIST_FREE: 'Gratuito',
  CATECHIST_PRO: 'Catequista Pro',
  CATECHIST_AI: 'Catequista IA',
  PARISH: 'Paróquia',
  DIOCESE: 'Diocese',
};
const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'Ativa', color: 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400' },
  TRIAL: { label: 'Trial', color: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400' },
  PAST_DUE: { label: 'Em atraso', color: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400' },
  CANCELED: { label: 'Cancelada', color: 'bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400' },
};

export default function ParishesPage() {
  const navigate = useNavigate();
  const { data: parishes = [], isLoading: loading } = useQuery(listParishes);
  const { data: user } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newState, setNewState] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    setError('');
    try {
      await createParish({ name: newName.trim(), city: newCity.trim() || undefined, state: newState.trim() || undefined });
      setNewName('');
      setNewCity('');
      setNewState('');
      setShowCreate(false);
    } catch (e: any) {
      if (handlePlanLimitError(e.message || e)) return;
      setError(e.message || 'Erro ao criar paróquia.');
    }
    setCreating(false);
  };

  const planBadge = (billing: any) => {
    if (!billing) return null;
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <BadgeCheck className="h-3 w-3" />
        {PLAN_LABELS[billing.plan] || billing.plan}
      </span>
    );
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Paróquias</h1>
            <p className="text-muted-foreground text-sm">{parishes.length} paróquia{parishes.length !== 1 ? 's' : ''}</p>
          </div>
          <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
            <Plus className="mr-1 h-4 w-4" />Nova Paróquia
          </Button>
        </div>

        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        )}

        {showCreate && (
          <div className="rounded-xl border bg-card p-4 space-y-3 animate-in fade-in slide-in-from-top-2">
            <h3 className="font-medium text-sm">Nova Paróquia</h3>
            <div className="flex flex-wrap gap-3 items-end">
              <input value={newName} onChange={e => setNewName(e.target.value)} className="flex-1 min-w-[200px] h-9 rounded-md border border-input bg-background px-3 text-sm" placeholder="Nome da paróquia *" autoFocus />
              <div className="min-w-[280px]">
                <CityStateSelect city={newCity} state={newState} onCityChange={setNewCity} onStateChange={setNewState} />
              </div>
              <Button size="sm" onClick={handleCreate} disabled={creating || !newName.trim()}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Criar'}
              </Button>
            </div>
          </div>
        )}

        {parishes.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center rounded-xl border bg-card p-12 text-center">
            <div className="mb-4 rounded-full bg-primary/10 p-4"><Church className="h-10 w-10 text-primary" /></div>
            <h3 className="text-lg font-semibold">Nenhuma paróquia</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">Crie sua primeira paróquia para começar a gerir turmas, catequizandos e comunidades.</p>
            <Button className="mt-4" onClick={() => setShowCreate(true)}><Plus className="mr-1 h-4 w-4" />Criar Primeira Paróquia</Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {parishes.map((p: any) => {
              const billing = p.billing;
              const statusInfo = STATUS_LABELS[billing?.status] || { label: billing?.status || 'Desconhecido', color: 'bg-gray-100 text-gray-600' };
              const isActive = p.active !== false;
              return (
                <div key={p.id} onClick={() => navigate('/app/parishes/' + p.id)}
                  className="group rounded-xl border bg-card p-5 cursor-pointer transition-all hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate group-hover:text-primary transition-colors">{p.name}</h3>
                        {!isActive && <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-zinc-800 dark:text-zinc-400">Inativa</span>}
                      </div>
                      {(p.city || p.state) && <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin className="h-3 w-3" />{[p.city, p.state].filter(Boolean).join(', ')}</p>}
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all translate-x-1 group-hover:translate-x-0" />
                  </div>
                  <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /><strong>{p._count?.memberships || 0}</strong> membros</span>
                    <span className="flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5" /><strong>{p._count?.classes || 0}</strong> turmas</span>
                    <span className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" /><strong>{p._count?.communities || 0}</strong> comunidades</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 pt-3 border-t border-border/50">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); navigate('/app/parishes/' + p.id + '/members'); }}>Membros</Button>
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); navigate('/app/parishes/' + p.id); }}>Gerir</Button>
                    </div>
                    <div className="flex items-center gap-2">
                      {planBadge(billing)}
                      <span className={'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ' + statusInfo.color}>{statusInfo.label}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
