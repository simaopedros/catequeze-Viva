import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../client/components/ui/button';
import { Building2, Check, X } from 'lucide-react';
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
}

export function DioceseStep({ selected, onSelect, onSkip }: DioceseStepProps) {
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
    <div className="rounded-xl border bg-card p-6 space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Building2 className="h-5 w-5 text-primary" />{t('diocese.title')}
      </h2>

      <div>
        <label className="text-sm font-medium">{t('diocese.state_label')}</label>
        <select
          value={stateFilter}
          onChange={e => setStateFilter(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
        >
          <option value="">{t('diocese.all_states')}</option>
          {BRAZILIAN_STATES.map(s => (
            <option key={s.uf} value={s.uf}>{s.uf} — {s.name}</option>
          ))}
        </select>
      </div>

      <div className="relative">
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm pl-9"
          placeholder={t('diocese.search_placeholder')}
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>

      <div className="space-y-3 max-h-64 overflow-y-auto">
        {uniqueWiki.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase mb-1">{t('diocese.wiki_section')}</p>
            {uniqueWiki.map((d: any) => (
              <button
                key={d.wikidataId}
                onClick={() => handleSelectWiki(d)}
                className={`w-full text-left rounded-lg border px-3 py-2 text-sm transition-colors flex items-center gap-2 mb-1 ${
                  selected?.wikidataId === d.wikidataId ? 'border-primary bg-primary/10' : 'hover:bg-muted/30 border-primary/20'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{d.name}</span>
                  {d.state && <span className="text-xs text-muted-foreground ml-1">({d.state})</span>}
                </div>
                <span className="text-xs text-primary shrink-0">WIKI</span>
                {selected?.wikidataId === d.wikidataId && <Check className="h-4 w-4 text-blue-500 shrink-0" />}
              </button>
            ))}
          </div>
        )}

        {dbDioceses.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase mb-1">{t('diocese.platform_section')}</p>
            {dbDioceses.map((d: any) => (
              <button
                key={d.id}
                onClick={() => handleSelectExisting(d)}
                className={`w-full text-left rounded-lg border px-3 py-2 text-sm transition-colors flex items-center gap-2 mb-1 ${
                  selected?.id === d.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/30'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{d.name}</span>
                  {d.state && <span className="text-xs text-muted-foreground ml-1">({d.state})</span>}
                </div>
                {d._count?.parishes != null && (
                  <span className="text-xs text-muted-foreground">{t('diocese.parishes_count', { count: d._count.parishes })}</span>
                )}
                {selected?.id === d.id && <Check className="h-4 w-4 text-primary shrink-0" />}
              </button>
            ))}
          </div>
        )}

        {!loading && dbDioceses.length === 0 && uniqueWiki.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-2">
            {searchQuery ? t('diocese.empty_search') : t('diocese.empty_hint')}
          </p>
        )}
      </div>

      {!showCreate ? (
        <button
          onClick={() => { setShowCreate(true); setNewName(searchQuery); }}
          className="w-full text-left rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
        >
          {t('diocese.create_link')}
        </button>
      ) : (
        <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
          <label className="text-sm font-medium">{t('diocese.new_name_label')}</label>
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
            placeholder={t('diocese.new_name_placeholder')}
          />
          {duplicateDiocese && (
            <div className="rounded-md bg-warning/10 border border-warning/30 p-2 text-xs text-warning">
              {t('diocese.duplicate_warning')} <strong>{duplicateDiocese.name}</strong>
              {duplicateDiocese.state && <> ({duplicateDiocese.state})</>}.
              <button
                onClick={() => {
                  handleSelectExisting(duplicateDiocese);
                  setShowCreate(false);
                  setNewName('');
                }}
                className="ml-2 underline font-medium hover:text-warning/80"
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

      <div className="flex justify-between pt-2 border-t">
        <Button variant="ghost" size="sm" onClick={onSkip}>{t('diocese.skip')}</Button>
        {selected ? (
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <Check className="h-4 w-4" /> {selected.name}
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">{t('diocese.select_hint')}</span>
        )}
      </div>
    </div>
  );
}
