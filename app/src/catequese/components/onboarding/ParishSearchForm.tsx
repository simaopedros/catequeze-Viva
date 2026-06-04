import { useState } from 'react';
import { Search, ChevronRight, Check } from 'lucide-react';
import { Button } from '../../../client/components/ui/button';

interface ParishSearchFormProps {
  parishes: { id: string; name: string }[];
  loading?: boolean;
  onNext: (parishId: string, parishName: string) => void;
  defaultSearch?: string;
  defaultSelected?: string;
}

export function ParishSearchForm({
  parishes,
  loading: loadingList = false,
  onNext,
  defaultSearch = '',
  defaultSelected = '',
}: ParishSearchFormProps) {
  const [searchQuery, setSearchQuery] = useState(defaultSearch);
  const [selectedId, setSelectedId] = useState(defaultSelected);

  const filtered = parishes.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleNext = () => {
    if (!selectedId) return;
    const parish = parishes.find((p) => p.id === selectedId);
    onNext(selectedId, parish?.name || '');
  };

  return (
    <div className="rounded-xl border bg-card p-6 space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Search className="h-5 w-5 text-primary" />
        Juntar-se a uma Paróquia
      </h2>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm"
          placeholder="Buscar paróquia..."
        />
      </div>
      {loadingList ? (
        <div className="text-sm text-muted-foreground py-4 text-center">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-muted-foreground py-4 text-center">
          Nenhuma paróquia. Podes criar uma independente.
        </div>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedId(p.id)}
              className={`w-full text-left rounded-lg border px-4 py-3 text-sm transition-colors flex items-center gap-2 ${
                selectedId === p.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/30'
              }`}
            >
              <span className="flex-1">{p.name}</span>
              {selectedId === p.id && <Check className="h-4 w-4 text-primary" />}
            </button>
          ))}
        </div>
      )}
      <div className="flex justify-end">
        <Button onClick={handleNext} disabled={!selectedId}>
          Próximo <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
