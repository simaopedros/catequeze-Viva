import { useState } from 'react';
import { Church, ChevronRight } from 'lucide-react';
import { Button } from '../../../client/components/ui/button';
import CityStateSelect from '../../../client/components/CityStateSelect';

interface ParishCreateFormProps {
  onNext: (data: { name: string; city: string; state: string }) => void;
  defaultName?: string;
  defaultCity?: string;
  defaultState?: string;
  loading?: boolean;
}

export function ParishCreateForm({
  onNext,
  defaultName = '',
  defaultCity = '',
  defaultState = '',
  loading = false,
}: ParishCreateFormProps) {
  const [name, setName] = useState(defaultName);
  const [city, setCity] = useState(defaultCity);
  const [state, setState] = useState(defaultState);

  const handleSubmit = () => {
    if (!name.trim()) return;
    onNext({ name: name.trim(), city, state });
  };

  return (
    <div className="rounded-xl border bg-card p-6 space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Church className="h-5 w-5 text-primary" />
        Criar Paróquia
      </h2>
      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium">Nome *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
            placeholder="Ex: Paróquia Santo Antônio"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Cidade / Estado</label>
          <div className="mt-1">
            <CityStateSelect city={city} state={state} onCityChange={setCity} onStateChange={setState} />
          </div>
        </div>
      </div>
      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={!name.trim() || loading}>
          {loading ? 'Criando...' : 'Criar e continuar'}
        </Button>
      </div>
    </div>
  );
}
