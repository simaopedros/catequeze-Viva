import { useState } from 'react';
import { Button } from '../../../client/components/ui/button';
import { Church, ChevronRight, Check, Search, MapPin } from 'lucide-react';
import { useQuery, searchParishesForOnboarding, createParish, getOrCreateParishByOsmId } from 'wasp/client/operations';
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
  /** Pre-fill state from the diocese step, so user doesn't have to re-select */
  initialState?: string;
}

export function ParishStep({ diocese, selected, onSelect, initialState }: ParishStepProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCity, setSearchCity] = useState('');
  const [searchState, setSearchState] = useState(initialState || '');
  const [selectedDbId, setSelectedDbId] = useState('');
  const [selectedOsm, setSelectedOsm] = useState<OsmParish | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const { data: dbParishes = [], isLoading: loadingDb } = useQuery(
    searchParishesForOnboarding,
    { name: searchQuery, city: searchCity, state: searchState }
  );
  const { parishes: osmParishes, loading: loadingOsm } = useOsmParishes(searchCity, searchState);

  // Remove DB results already matched by OSM selection
  const dbOsmIds = new Set(dbParishes.filter((p: any) => p.osmId).map((p: any) => p.osmId));
  const uniqueOsm = osmParishes.filter((o: any) => !dbOsmIds.has(o.osmId));

  // Real-time duplicate check while typing new parish name
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
        // Parish already exists — membership was created/activated, use it
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
      setError(e.message || 'Erro ao criar paróquia.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="rounded-xl border bg-card p-6 space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Church className="h-5 w-5 text-primary" />Qual a tua paróquia?
      </h2>

      {diocese && (
        <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg px-3 py-2 flex items-center gap-2">
          <BuildingIcon className="h-4 w-4" />
          {diocese.name}
          {diocese.state && <> ({diocese.state})</>}
        </div>
      )}

      {/* City / State */}
      <div>
        <label className="text-sm font-medium">Cidade / Estado</label>
        <div className="mt-1">
          <CityStateSelect
            city={searchCity}
            state={searchState}
            onCityChange={(c) => { setSearchCity(c); setSelectedDbId(''); setSelectedOsm(null); }}
            onStateChange={(s) => { setSearchState(s); setSelectedDbId(''); setSelectedOsm(null); }}
          />
        </div>
      </div>

      {/* Name filter */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm"
          placeholder="Filtrar por nome..."
        />
      </div>

      {/* Results */}
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {/* DB results */}
        {dbParishes.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Na Plataforma</p>
            {dbParishes.map((p: any) => (
              <button
                key={p.id}
                onClick={() => handleDbSelect(p)}
                className={`w-full text-left rounded-lg border px-3 py-2 text-sm transition-colors flex items-center gap-2 mb-1 ${
                  selectedDbId === p.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/30'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{p.name}</span>
                  {p.city && <span className="text-xs text-muted-foreground ml-1">{p.city}{p.state ? `/${p.state}` : ''}</span>}
                </div>
                {selectedDbId === p.id && <Check className="h-4 w-4 text-primary shrink-0" />}
              </button>
            ))}
          </div>
        )}

        {/* OSM results */}
        {searchCity && uniqueOsm.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase mb-1 flex items-center gap-1">
              <MapPin className="h-3 w-3" />OpenStreetMap
            </p>
            {uniqueOsm.map((op: any) => (
              <button
                key={op.osmId}
                onClick={() => handleOsmSelect(op)}
                className={`w-full text-left rounded-lg border px-3 py-2 text-sm transition-colors flex items-center gap-2 mb-1 ${
                  selectedOsm?.osmId === op.osmId ? 'border-primary bg-primary/10' : 'hover:bg-muted/30 border-primary/20'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{op.name}</span>
                  {op.address && <span className="text-xs text-muted-foreground ml-1 block">{op.address}</span>}
                </div>
                <span className="text-xs text-primary shrink-0">OSM</span>
                {selectedOsm?.osmId === op.osmId && <Check className="h-4 w-4 text-blue-500 shrink-0" />}
              </button>
            ))}
          </div>
        )}

        {/* OSM loading */}
        {searchCity && loadingOsm && (
          <p className="text-xs text-muted-foreground">Procurando no mapa...</p>
        )}
      </div>

      {/* Create new */}
      {!showCreate ? (
        <button
          onClick={() => { setShowCreate(true); setNewName(searchQuery); }}
          className="w-full text-left rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
        >
          + Não encontrou? Criar nova paróquia
        </button>
      ) : (
        <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
          <label className="text-sm font-medium">Nome da nova paróquia</label>
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
            placeholder="Ex: Paróquia Santo Antônio"
          />
          {duplicateParish && (
            <div className="rounded-md bg-warning/10 border border-warning/30 p-2 text-xs text-warning">
              Já existe uma paróquia semelhante: <strong>{duplicateParish.name}</strong>
              {duplicateParish.city && <> em {duplicateParish.city}{duplicateParish.state ? `/${duplicateParish.state}` : ''}</>}.
              <button
                onClick={() => {
                  handleDbSelect(duplicateParish);
                  setShowCreate(false);
                  setNewName('');
                }}
                className="ml-2 underline font-medium hover:text-amber-900 dark:hover:text-amber-300"
              >
                Usar esta →
              </button>
            </div>
          )}
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleCreate} disabled={creating || !newName.trim()}>
              {creating ? 'Criando...' : 'Criar paróquia'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Inline icon to avoid importing a whole lucide icon */
function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01" /><path d="M16 6h.01" /><path d="M12 6h.01" />
      <path d="M12 10h.01" /><path d="M12 14h.01" /><path d="M16 10h.01" /><path d="M16 14h.01" />
      <path d="M8 10h.01" /><path d="M8 14h.01" />
    </svg>
  );
}
