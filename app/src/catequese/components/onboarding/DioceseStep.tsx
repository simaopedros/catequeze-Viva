import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../client/components/ui/button';
import { ArrowRight, Building2, Check, CheckCircle2, Search, X } from 'lucide-react';
import { useQuery, searchDiocesesForOnboarding, createDiocese } from 'wasp/client/operations';
import { useWikidataDioceses } from '../../../client/hooks/useWikidataDioceses';
import { BRAZILIAN_STATES } from '../../../client/hooks/useIbgeCities';

export interface DioceseSelection {
  id?: string;
  name: string;
  state?: string;
  wikidataId?: string;
  isNew?: boolean;
}

interface DioceseStepProps {
  selected: DioceseSelection | null;
  onSelect: (d: DioceseSelection) => void;
  onSkip: () => void;
  onContinue: () => void;
}

export function DioceseStep({ selected, onSelect, onSkip, onContinue }: DioceseStepProps) {
  const { t } = useTranslation('onboarding');
  const { t: tc } = useTranslation('common');
  const [searchQuery, setSearchQuery] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const { data: dbDioceses = [], isLoading: loadingDb } = useQuery(
    searchDiocesesForOnboarding,
    { name: searchQuery, state: stateFilter }
  );

  const { dioceses: wikiDioceses, loading: loadingWiki } = useWikidataDioceses(
    stateFilter || undefined
  );

  const filteredWiki = searchQuery
    ? wikiDioceses.filter((d: any) => d.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : wikiDioceses;

  const dbNames = new Set(dbDioceses.map((d: any) => d.name.toLowerCase()));
  const uniqueWiki = filteredWiki.filter((d: any) => !dbNames.has(d.name.toLowerCase()));
  const loading = loadingDb || loadingWiki;
  const shouldShowResults = stateFilter.trim().length > 0 || searchQuery.trim().length >= 2;

  const duplicateDiocese = newName.trim().length >= 3
    ? dbDioceses.find((d: any) => d.name.toLowerCase().includes(newName.trim().toLowerCase()) || newName.trim().toLowerCase().includes(d.name.toLowerCase()))
    : null;

  const handleSelectExisting = (d: { id: string; name: string; state?: string | null; wikidataId?: string | null }) => {
    setError('');
    onSelect({ id: d.id, name: d.name, state: d.state || stateFilter || undefined, wikidataId: d.wikidataId || undefined });
  };

  const handleSelectWiki = (d: { wikidataId: string; name: string; state?: string }) => {
    setError('');
    onSelect({ name: d.name, state: d.state || stateFilter || undefined, wikidataId: d.wikidataId, isNew: false });
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    setError('');
    try {
      const diocese = await createDiocese({ name: newName.trim(), country: 'BR' });
      if (diocese?.id) {
        setShowCreate(false);
        setNewName('');
        onSelect({ id: diocese.id, name: diocese.name, state: stateFilter, isNew: true });
      } else {
        setError(t('diocese.create_error'));
      }
    } catch (e: any) {
      setError(e.message || t('diocese.create_error_generic'));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="rounded-xl border bg-card p-6 space-y-5">
      <div className="space-y-3 rounded-2xl border border-border/70 bg-slate-50/80 p-4">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          <span>{t('diocese.progress_title')}</span>
          <span>{t('diocese.progress_status')}</span>
        </div>
        <div className="h-2 rounded-full bg-slate-200">
          <div className="h-2 w-[42%] rounded-full bg-primary" />
        </div>
        <div className="flex items-start gap-2 text-sm text-slate-600">
          <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
          <span>{t('diocese.progress_copy')}</span>
        </div>
      </div>

      <div className="space-y-1">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Building2 className="h-5 w-5 text-primary" />{t('diocese.title')}
        </h2>
        <p className="text-sm text-muted-foreground">{t('diocese.subtitle')}</p>
      </div>

      <div>
        <label htmlFor="diocese-state-filter" className="text-sm font-medium">{t('diocese.state_label')}</label>
        <select
          id="diocese-state-filter"
          value={stateFilter}
          onChange={e => setStateFilter(e.target.value)}
          className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">{t('diocese.all_states')}</option>
          {BRAZILIAN_STATES.map(s => (
            <option key={s.uf} value={s.uf}>{s.uf} — {s.name}</option>
          ))}
        </select>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-10 text-sm"
          placeholder={t('diocese.search_placeholder')}
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>

      <div className="space-y-3 max-h-64 overflow-y-auto">
        {!shouldShowResults && (
          <div className="rounded-xl border border-dashed border-border/80 bg-white/70 p-4 text-center">
            <p className="text-sm font-medium text-slate-900">{t('diocese.start_hint_title')}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t('diocese.start_hint_body')}</p>
          </div>
        )}

        {shouldShowResults && uniqueWiki.length > 0 && (
          <div>
            <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">{t('diocese.wiki_section')}</p>
            {uniqueWiki.map((d: any) => (
              <button
                key={d.wikidataId}
                onClick={() => handleSelectWiki(d)}
                className={`mb-1 flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                  selected?.wikidataId === d.wikidataId ? 'border-primary bg-primary/10' : 'border-primary/20 hover:bg-muted/30'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <span className="font-medium">{d.name}</span>
                  {d.state && <span className="ml-1 text-xs text-muted-foreground">({d.state})</span>}
                </div>
                <span className="shrink-0 text-xs text-primary">WIKI</span>
                {selected?.wikidataId === d.wikidataId && <Check className="h-4 w-4 shrink-0 text-blue-500" />}
              </button>
            ))}
          </div>
        )}

        {shouldShowResults && dbDioceses.length > 0 && (
          <div>
            <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">{t('diocese.platform_section')}</p>
            {dbDioceses.map((d: any) => (
              <button
                key={d.id}
                onClick={() => handleSelectExisting(d)}
                className={`mb-1 flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                  selected?.id === d.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/30'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <span className="font-medium">{d.name}</span>
                  {d.state && <span className="ml-1 text-xs text-muted-foreground">({d.state})</span>}
                </div>
                {d._count?.parishes != null && (
                  <span className="text-xs text-muted-foreground">{t('diocese.parishes_count', { count: d._count.parishes })}</span>
                )}
                {selected?.id === d.id && <Check className="h-4 w-4 shrink-0 text-primary" />}
              </button>
            ))}
          </div>
        )}

        {shouldShowResults && !loading && dbDioceses.length === 0 && uniqueWiki.length === 0 && (
          <p className="py-2 text-center text-sm text-muted-foreground">
            {searchQuery ? t('diocese.empty_search') : t('diocese.empty_hint')}
          </p>
        )}
      </div>

      {!showCreate ? (
        <button
          onClick={() => { setShowCreate(true); setNewName(searchQuery); }}
          className="w-full rounded-lg border border-dashed px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
        >
          {t('diocese.create_link')}
        </button>
      ) : (
        <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
          <label className="text-sm font-medium">{t('diocese.new_name_label')}</label>
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
            placeholder={t('diocese.new_name_placeholder')}
          />
          {duplicateDiocese && (
            <div className="rounded-md border border-warning/30 bg-warning/10 p-2 text-xs text-warning">
              {t('diocese.duplicate_warning')} <strong>{duplicateDiocese.name}</strong>
              {duplicateDiocese.state && <> ({duplicateDiocese.state})</>}.
              <button
                onClick={() => {
                  handleSelectExisting(duplicateDiocese);
                  setShowCreate(false);
                  setNewName('');
                }}
                className="ml-2 font-medium underline hover:text-warning/80"
              >
                {t('diocese.use_this')}
              </button>
            </div>
          )}
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowCreate(false)}>{tc('cancel')}</Button>
            <Button size="sm" onClick={handleCreate} disabled={creating || !newName.trim()}>
              {creating ? t('diocese.creating') : t('diocese.create_btn')}
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" size="sm" onClick={onSkip} className="justify-start px-0 text-muted-foreground hover:text-foreground">
          {t('diocese.skip')}
        </Button>
        {selected ? (
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:items-end">
            <div className="flex items-center gap-2 text-sm text-primary">
              <Check className="h-4 w-4" />
              <span>{t('diocese.selection_ready', { name: selected.name })}</span>
            </div>
            <Button onClick={onContinue} className="w-full gap-2 sm:w-auto">
              {t('diocese.continue_with_selection')}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">{t('diocese.select_hint')}</span>
        )}
      </div>
    </div>
  );
}
