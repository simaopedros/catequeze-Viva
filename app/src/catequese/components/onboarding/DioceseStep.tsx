import { useState } from 'react';
import { Button } from '../../../client/components/ui/button';
import { Building2, ChevronRight, Check, X } from 'lucide-react';
import { useQuery, searchDiocesesForOnboarding, createDiocese } from 'wasp/client/operations';
import { useWikidataDioceses } from '../../../client/hooks/useWikidataDioceses';
import { BRAZILIAN_STATES } from '../../../client/hooks/useIbgeCities';

export interface DioceseSelection {
  id?: string;
  name: string;
  state?: string;
  wikidataId?: string;
  isNew?: boolean; // true if user created it during onboarding
}

interface DioceseStepProps {
  selected: DioceseSelection | null;
  onSelect: (d: DioceseSelection) => void;
  onSkip: () => void;
}

export function DioceseStep({ selected, onSelect, onSkip }: DioceseStepProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  // DB search
  const { data: dbDioceses = [], isLoading: loadingDb } = useQuery(
    searchDiocesesForOnboarding,
    { name: searchQuery, state: stateFilter }
  );

  // Wikidata search
  const { dioceses: wikiDioceses, loading: loadingWiki } = useWikidataDioceses(
    stateFilter || undefined
  );

  // Filter wikidata results by name
  const filteredWiki = searchQuery
    ? wikiDioceses.filter((d: any) => d.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : wikiDioceses;

  // Remove wiki results that already exist in DB (by name)
  const dbNames = new Set(dbDioceses.map((d: any) => d.name.toLowerCase()));
  const uniqueWiki = filteredWiki.filter((d: any) => !dbNames.has(d.name.toLowerCase()));

  const loading = loadingDb || loadingWiki;

  // Real-time duplicate check as user types the new diocese name
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
        setError('Erro: diocese não foi criada.');
      }
    } catch (e: any) {
      setError(e.message || 'Erro ao criar diocese.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="rounded-xl border bg-card p-6 space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Building2 className="h-5 w-5 text-primary" />Em que diocese estás?
      </h2>

      {/* State filter */}
      <div>
        <label className="text-sm font-medium">Estado (UF)</label>
        <select
          value={stateFilter}
          onChange={e => setStateFilter(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
        >
          <option value="">Todos os estados</option>
          {BRAZILIAN_STATES.map(s => (
            <option key={s.uf} value={s.uf}>{s.uf} — {s.name}</option>
          ))}
        </select>
      </div>

      {/* Name search */}
      <div className="relative">
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm pl-9"
          placeholder="Buscar diocese..."
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Results */}
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {/* Wikidata results */}
        {uniqueWiki.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Wikidata · Dioceses oficiais</p>
            {uniqueWiki.map((d: any) => (
              <button
                key={d.wikidataId}
                onClick={() => handleSelectWiki(d)}
                className={`w-full text-left rounded-lg border px-3 py-2 text-sm transition-colors flex items-center gap-2 mb-1 ${
                  selected?.wikidataId === d.wikidataId ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' : 'hover:bg-muted/30 border-blue-200'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{d.name}</span>
                  {d.state && <span className="text-xs text-muted-foreground ml-1">({d.state})</span>}
                </div>
                <span className="text-xs text-blue-600 dark:text-blue-400 shrink-0">WIKI</span>
                {selected?.wikidataId === d.wikidataId && <Check className="h-4 w-4 text-blue-500 shrink-0" />}
              </button>
            ))}
          </div>
        )}

        {/* DB results */}
        {dbDioceses.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Na Plataforma</p>
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
                  <span className="text-xs text-muted-foreground">{d._count.parishes} paróquias</span>
                )}
                {selected?.id === d.id && <Check className="h-4 w-4 text-primary shrink-0" />}
              </button>
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && dbDioceses.length === 0 && uniqueWiki.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-2">
            {searchQuery ? 'Nenhuma diocese encontrada.' : 'Seleciona um estado ou busca pelo nome.'}
          </p>
        )}
      </div>

      {/* Create new */}
      {!showCreate ? (
        <button
          onClick={() => { setShowCreate(true); setNewName(searchQuery); }}
          className="w-full text-left rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
        >
          + Não encontrou? Criar nova diocese
        </button>
      ) : (
        <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
          <label className="text-sm font-medium">Nome da nova diocese</label>
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
            placeholder="Ex: Diocese de São José dos Campos"
          />
          {duplicateDiocese && (
            <div className="rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-2 text-xs text-amber-700 dark:text-amber-400">
              ⚠️ Já existe uma diocese semelhante: <strong>{duplicateDiocese.name}</strong>
              {duplicateDiocese.state && <> ({duplicateDiocese.state})</>}.
              <button
                onClick={() => {
                  handleSelectExisting(duplicateDiocese);
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
              {creating ? 'Criando...' : 'Criar diocese'}
            </Button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between pt-2 border-t">
        <Button variant="ghost" size="sm" onClick={onSkip}>Pular esta etapa →</Button>
        {selected ? (
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <Check className="h-4 w-4" /> {selected.name}
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">Seleciona uma diocese acima</span>
        )}
      </div>
    </div>
  );
}
