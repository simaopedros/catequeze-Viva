import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../client/components/ui/button';
import { ArrowRight, Check, CheckCircle2, Church, MapPin, Search } from 'lucide-react';
import { useQuery, searchParishesForOnboarding, createParish } from 'wasp/client/operations';
import { useOsmParishes, type OsmParish } from '../../../client/hooks/useOsmParishes';
import CityStateSelect from '../../../client/components/CityStateSelect';
import type { DioceseSelection } from './DioceseStep';

export interface ParishSelection {
  id?: string;
  name: string;
  city?: string;
  state?: string;
  osmId?: string | null;
  isNew?: boolean;
}

interface ParishStepProps {
  diocese: DioceseSelection | null;
  selected: ParishSelection | null;
  onSelect: (p: ParishSelection) => void;
  initialState?: string;
  onContinue: () => void;
}

export function ParishStep({ diocese, selected, onSelect, initialState, onContinue }: ParishStepProps) {
  const { t } = useTranslation('onboarding');
  const { t: tc } = useTranslation('common');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCity, setSearchCity] = useState('');
  const [searchState, setSearchState] = useState(initialState || '');
  const [selectedDbId, setSelectedDbId] = useState('');
  const [selectedOsm, setSelectedOsm] = useState<OsmParish | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const { data: dbParishes = [] } = useQuery(
    searchParishesForOnboarding,
    { name: searchQuery, city: searchCity, state: searchState }
  );
  const { parishes: osmParishes, loading: loadingOsm } = useOsmParishes(searchCity, searchState);

  const dbOsmIds = new Set(dbParishes.filter((p: any) => p.osmId).map((p: any) => p.osmId));
  const uniqueOsm = osmParishes.filter((o: any) => !dbOsmIds.has(o.osmId));
  const shouldShowResults = Boolean(searchCity || searchState || searchQuery.trim().length >= 2);

  const duplicateParish = newName.trim().length >= 3
    ? dbParishes.find((p: any) => p.name.toLowerCase().includes(newName.trim().toLowerCase()) || newName.trim().toLowerCase().includes(p.name.toLowerCase()))
    : null;

  const handleDbSelect = (p: any) => {
    setSelectedDbId(p.id);
    setSelectedOsm(null);
    onSelect({ id: p.id, name: p.name, city: p.city, state: p.state, osmId: p.osmId });
  };

  const handleOsmSelect = (op: OsmParish) => {
    setSelectedOsm(op);
    setSelectedDbId('');
    onSelect({ name: op.name, city: op.city, state: op.state, osmId: op.osmId });
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    setError('');
    try {
      const result = await createParish({
        name: newName.trim(),
        city: searchCity || undefined,
        state: searchState || undefined,
        dioceseId: diocese?.id,
      });
      if (result?.existingParishId) {
        onSelect({
          id: result.id,
          name: newName.trim(),
          city: searchCity,
          state: searchState,
          isNew: false,
        });
        return;
      }
      if (result?.id) {
        onSelect({
          id: result.id,
          name: newName.trim(),
          city: searchCity,
          state: searchState,
          isNew: true,
        });
      }
    } catch (e: any) {
      setError(e.message || t('parish.create_error'));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="rounded-xl border bg-card p-6 space-y-5">
      <div className="space-y-3 rounded-2xl border border-border/70 bg-slate-50/80 p-4">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          <span>{t('parish.progress_title')}</span>
          <span>{t('parish.progress_status')}</span>
        </div>
        <div className="h-2 rounded-full bg-slate-200">
          <div className="h-2 w-[70%] rounded-full bg-primary" />
        </div>
        <div className="flex items-start gap-2 text-sm text-slate-600">
          <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
          <span>{t('parish.progress_copy')}</span>
        </div>
      </div>

      <div className="space-y-1">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Church className="h-5 w-5 text-primary" />{t('parish.title')}
        </h2>
        <p className="text-sm text-muted-foreground">{t('parish.subtitle')}</p>
      </div>

      {diocese && (
        <div className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/[0.06] p-4 text-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">{t('parish.diocese_context_label')}</p>
            <p className="font-semibold text-slate-950">{diocese.name}{diocese.state ? ' (' + diocese.state + ')' : ''}</p>
          </div>
        </div>
      )}

      <div>
        <label className="text-sm font-medium">{t('parish.city_state')}</label>
        <div className="mt-1">
          <CityStateSelect
            city={searchCity}
            state={searchState}
            onCityChange={(c) => { setSearchCity(c); setSelectedDbId(''); setSelectedOsm(null); }}
            onStateChange={(s) => { setSearchState(s); setSelectedDbId(''); setSelectedOsm(null); }}
          />
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm"
          placeholder={t('parish.filter_placeholder')}
        />
      </div>

      <div className="space-y-3 max-h-64 overflow-y-auto">
        {!shouldShowResults && (
          <div className="rounded-xl border border-dashed border-border/80 bg-white/70 p-4 text-center">
            <p className="text-sm font-medium text-slate-900">{t('parish.start_hint_title')}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t('parish.start_hint_body')}</p>
          </div>
        )}

        {shouldShowResults && dbParishes.length > 0 && (
          <div>
            <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">{t('parish.platform_section')}</p>
            {dbParishes.map((p: any) => (
              <button
                key={p.id}
                onClick={() => handleDbSelect(p)}
                className={`mb-1 flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                  selectedDbId === p.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/30'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <span className="font-medium">{p.name}</span>
                  {p.city && <span className="ml-1 text-xs text-muted-foreground">{p.city}{p.state ? '/' + p.state : ''}</span>}
                </div>
                {selectedDbId === p.id && <Check className="h-4 w-4 shrink-0 text-primary" />}
              </button>
            ))}
          </div>
        )}

        {shouldShowResults && searchCity && uniqueOsm.length > 0 && (
          <div>
            <p className="mb-1 flex items-center gap-1 text-xs font-medium uppercase text-muted-foreground">
              <MapPin className="h-3 w-3" />{t('parish.osm_section')}
            </p>
            {uniqueOsm.map((op: any) => (
              <button
                key={op.osmId}
                onClick={() => handleOsmSelect(op)}
                className={`mb-1 flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                  selectedOsm?.osmId === op.osmId ? 'border-primary bg-primary/10' : 'border-primary/20 hover:bg-muted/30'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <span className="font-medium">{op.name}</span>
                  {op.address && <span className="ml-1 block text-xs text-muted-foreground">{op.address}</span>}
                </div>
                <span className="shrink-0 text-xs text-primary">OSM</span>
                {selectedOsm?.osmId === op.osmId && <Check className="h-4 w-4 shrink-0 text-blue-500" />}
              </button>
            ))}
          </div>
        )}

        {shouldShowResults && searchCity && loadingOsm && (
          <p className="text-xs text-muted-foreground">{t('parish.searching_map')}</p>
        )}
      </div>

      {!showCreate ? (
        <button
          onClick={() => { setShowCreate(true); setNewName(searchQuery); }}
          className="w-full rounded-lg border border-dashed px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
        >
          {t('parish.create_link')}
        </button>
      ) : (
        <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
          <label className="text-sm font-medium">{t('parish.new_name_label')}</label>
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
            placeholder={t('parish.new_name_placeholder')}
          />
          {duplicateParish && (
            <div className="rounded-md border border-warning/30 bg-warning/10 p-2 text-xs text-warning">
              {t('parish.duplicate_warning')} <strong>{duplicateParish.name}</strong>
              {duplicateParish.city && <> {t('parish.duplicate_in', { city: duplicateParish.city + (duplicateParish.state ? '/' + duplicateParish.state : '') })}</>}.
              <button
                onClick={() => {
                  handleDbSelect(duplicateParish);
                  setShowCreate(false);
                  setNewName('');
                }}
                className="ml-2 font-medium underline hover:text-amber-900 dark:hover:text-amber-300"
              >
                {t('parish.use_this')}
              </button>
            </div>
          )}
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowCreate(false)}>{tc('cancel')}</Button>
            <Button size="sm" onClick={handleCreate} disabled={creating || !newName.trim()}>
              {creating ? t('parish.creating') : t('parish.create_btn')}
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
        {selected ? (
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm text-primary">
              <Check className="h-4 w-4" />
              <span>{t('parish.selection_ready', { name: selected.name })}</span>
            </div>
            <Button onClick={onContinue} className="w-full gap-2 sm:w-auto">
              {t('parish.continue_with_selection')}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">{t('parish.select_hint')}</span>
        )}
      </div>
    </div>
  );
}
