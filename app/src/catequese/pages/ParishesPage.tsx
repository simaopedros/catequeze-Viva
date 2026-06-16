import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Church, Users, BookOpen, Building2, Plus, MapPin, BadgeCheck, ArrowRight, Loader2, ShieldCheck, Search } from 'lucide-react';
import { Button } from '../../client/components/ui/button';
import { Input } from '../../client/components/ui/input';
import { AppShell } from '../AppShell';
import { PageHeader } from '../../client/components/PageHeader';
import { SearchInput } from '../../client/components/SearchInput';
import { EmptyState } from '../../client/components/EmptyState';
import { SkeletonCard } from '../../client/components/Skeletons';
import { useQuery, listParishes, createParish, getInstitutionalManageContext } from 'wasp/client/operations';
import { handlePlanLimitError } from '../lib/planLimitToast';
import CityStateSelect from '../../client/components/CityStateSelect';

const PLAN_KEYS: Record<string, string> = {
  CATECHIST_FREE: 'plan_free',
  CATECHIST_PRO: 'plan_catechist_pro',
  CATECHIST_AI: 'plan_catechist_ai',
  PARISH: 'plan_parish',
  DIOCESE: 'plan_diocese',
};

const STATUS_KEYS: Record<string, { key: string; color: string }> = {
  ACTIVE: { key: 'active', color: 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400' },
  TRIAL: { key: 'trial', color: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400' },
  PAST_DUE: { key: 'past_due', color: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400' },
  CANCELED: { key: 'canceled', color: 'bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400' },
};

export default function ParishesPage() {
  const { t: tp } = useTranslation('parishes');
  const navigate = useNavigate();
  const { data: parishes = [], isLoading: loading } = useQuery(listParishes);
  const { data: manageContext } = useQuery(getInstitutionalManageContext);
  const [searchParams] = useSearchParams();
  const [showCreate, setShowCreate] = useState(() => searchParams.get('new') === 'true');
  const [newName, setNewName] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newState, setNewState] = useState('');
  const [newDioceseId, setNewDioceseId] = useState(() => searchParams.get('dioceseId') || '');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const filterParishes = useMemo(() => {
    if (!search) return parishes;
    const q = search.toLowerCase();
    return parishes.filter((p: any) =>
      p.name?.toLowerCase().includes(q) ||
      p.city?.toLowerCase().includes(q) ||
      p.state?.toLowerCase().includes(q)
    );
  }, [parishes, search]);

  const hasFilters = !!search;

  const manageDioceses: { id: string; name: string; licensed: boolean }[] = manageContext?.dioceses ?? [];
  const canCreateUnderOwnerPlan: boolean = manageContext?.canCreateUnderOwnerPlan ?? false;
  const ownerPlan: string | null = manageContext?.ownerPlan ?? null;
  const selectedDiocese = manageDioceses.find((d) => d.id === newDioceseId);

  const planLabel = (plan: string) => {
    const key = PLAN_KEYS[plan];
    return key ? tp(key) : plan;
  };

  const statusLabel = (status: string) => {
    const info = STATUS_KEYS[status];
    return info ? tp(info.key) : status;
  };

  const coverageNote = (() => {
    if (selectedDiocese) {
      return selectedDiocese.licensed
        ? tp('coverage_licensed', { name: selectedDiocese.name })
        : tp('coverage_unlicensed', { name: selectedDiocese.name });
    }
    if (canCreateUnderOwnerPlan) {
      const planName = ownerPlan === 'diocese' ? tp('plan_diocese') : tp('plan_parish');
      return tp('coverage_owner', { plan: planName });
    }
    return tp('coverage_independent');
  })();

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    setError('');
    try {
      await createParish({
        name: newName.trim(),
        city: newCity.trim() || undefined,
        state: newState.trim() || undefined,
        dioceseId: newDioceseId || undefined,
      });
      setNewName('');
      setNewCity('');
      setNewState('');
      setNewDioceseId('');
      setShowCreate(false);
    } catch (e: any) {
      if (handlePlanLimitError(e.message || e)) return;
      setError(e.message || tp('create_error'));
    }
    setCreating(false);
  };

  const planBadge = (billing: any) => {
    if (!billing) return null;
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <BadgeCheck className="h-3 w-3" />
        {planLabel(billing.plan)}
      </span>
    );
  };

  if (loading) {
    return (
      <AppShell>
        <div className="space-y-6 p-4 md:p-6">
          <div className="h-8 w-48 bg-muted rounded animate-pulse" />
          <div className="grid gap-4 md:grid-cols-2">
            {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title={tp('parishes_title')}
          subtitle={tp('parish_count', { count: parishes.length })}
        >
          <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
            <Plus className="mr-1 h-4 w-4" />{tp('new_parish_btn')}
          </Button>
        </PageHeader>

        <div className="flex flex-col sm:flex-row gap-3">
          <SearchInput placeholder={tp('search_parishes')} value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        )}

        {showCreate && (
          <div className="rounded-xl border bg-card p-4 space-y-3 animate-in fade-in slide-in-from-top-2">
            <h3 className="font-medium text-sm">{tp('new_parish')}</h3>
            <div className="flex flex-wrap gap-3 items-end">
              <Input value={newName} onChange={e => setNewName(e.target.value)} className="flex-1 min-w-[200px] h-9" placeholder={`${tp('parish_name')} *`} autoFocus />
              <div className="min-w-[280px]">
                <CityStateSelect city={newCity} state={newState} onCityChange={setNewCity} onStateChange={setNewState} />
              </div>
              {manageDioceses.length > 0 && (
                <div className="flex flex-col gap-1 min-w-[200px]">
                  <label className="text-xs text-muted-foreground">{tp('diocese_license')}</label>
                  <select
                    value={newDioceseId}
                    onChange={e => setNewDioceseId(e.target.value)}
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">{tp('independent_option')}</option>
                    {manageDioceses.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name}{d.licensed ? ` ${tp('licensed_suffix')}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <Button size="sm" onClick={handleCreate} disabled={creating || !newName.trim()}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : tp('create')}
              </Button>
            </div>
            <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
              {coverageNote}
            </p>
          </div>
        )}

        {filterParishes.length === 0 ? (
          hasFilters ? (
            <EmptyState compact icon={Search} title={tp('no_results')} description={tp('no_parishes_found')} />
          ) : (
            <EmptyState
              icon={Church}
              title={tp('no_parishes')}
              description={tp('no_parishes_desc')}
            />
          )
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filterParishes.map((p: any) => {
              const billing = p.billing;
              const statusInfo = STATUS_KEYS[billing?.status] || { key: '', color: 'bg-gray-100 text-gray-600' };
              const isActive = p.active !== false;
              return (
                <div key={p.id} onClick={() => navigate('/app/parishes/' + p.id)}
                  className="group rounded-xl border bg-card p-5 cursor-pointer transition-all hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate group-hover:text-primary transition-colors">{p.name}</h3>
                        {!isActive && <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-overline font-medium text-gray-600 dark:bg-zinc-800 dark:text-zinc-400">{tp('inactive_label')}</span>}
                      </div>
                      {(p.city || p.state) && <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin className="h-3 w-3" />{[p.city, p.state].filter(Boolean).join(', ')}</p>}
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all translate-x-1 group-hover:translate-x-0" />
                  </div>
                  <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /><strong>{p._count?.memberships || 0}</strong> {tp('members')}</span>
                    <span className="flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5" /><strong>{p._count?.classes || 0}</strong> {tp('classes')}</span>
                    <span className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" /><strong>{p._count?.communities || 0}</strong> {tp('communities')}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 pt-3 border-t border-border/50">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); navigate('/app/parishes/' + p.id + '/members'); }}>{tp('members')}</Button>
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); navigate('/app/parishes/' + p.id); }}>{tp('manage')}</Button>
                    </div>
                    <div className="flex items-center gap-2">
                      {planBadge(billing)}
                      <span className={'inline-flex items-center rounded-full px-2 py-0.5 text-overline font-medium ' + statusInfo.color}>{statusInfo.key ? statusLabel(billing?.status) : (billing?.status || tp('unknown'))}</span>
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
