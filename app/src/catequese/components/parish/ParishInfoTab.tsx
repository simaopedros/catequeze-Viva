import { Button } from '../../../client/components/ui/button';
import CityStateSelect from '../../../client/components/CityStateSelect';

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

interface ParishInfoTabProps {
  parish: any;
  editing: boolean;
  editName: string;
  setEditName: (v: string) => void;
  editCity: string;
  setEditCity: (v: string) => void;
  editState: string;
  setEditState: (v: string) => void;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
  onStartEdit: () => void;
}

export function ParishInfoTab({
  parish, editing, editName, setEditName, editCity, setEditCity,
  editState, setEditState, saving, onSave, onCancel, onStartEdit,
}: ParishInfoTabProps) {
  const billing = parish?.billing;

  if (editing) {
    return (
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <h3 className="font-semibold">Editar Paróquia</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="text-xs font-medium text-muted-foreground">Nome</label><input value={editName} onChange={e => setEditName(e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm mt-1" /></div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">Cidade / Estado</label>
            <div className="mt-1">
              <CityStateSelect city={editCity} state={editState} onCityChange={setEditCity} onStateChange={setEditState} />
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={onSave} disabled={saving || !editName.trim()}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          <Button size="sm" variant="ghost" onClick={onCancel}>Cancelar</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Dados da Paróquia</h3>
        <Button variant="ghost" size="sm" onClick={onStartEdit}>Editar</Button>
      </div>
      <div className="grid gap-2 text-sm sm:grid-cols-2">
        <div><span className="text-muted-foreground">Nome:</span> {parish?.name}</div>
        <div><span className="text-muted-foreground">Cidade:</span> {parish?.city || '\u2014'}</div>
        <div><span className="text-muted-foreground">Estado:</span> {parish?.state || '\u2014'}</div>
        <div><span className="text-muted-foreground">Status:</span>{' '}<span className={'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ' + (parish?.active !== false ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400')}>{parish?.active !== false ? 'Ativa' : 'Inativa'}</span></div>
        {parish?.diocese && <div><span className="text-muted-foreground">Diocese:</span> {parish.diocese.name}</div>}
        <div className="flex items-center gap-1"><span className="text-muted-foreground">Locale:</span> {parish?.locale || 'pt-BR'}</div>
        <div className="flex items-center gap-1"><span className="text-muted-foreground">Timezone:</span> {parish?.timezone || 'America/Sao_Paulo'}</div>
      </div>
      <div className="flex gap-6 pt-2 text-sm">
        <div className="flex items-center gap-1.5"><strong>{parish?._count?.memberships || 0}</strong> membros</div>
        <div className="flex items-center gap-1.5"><strong>{parish?._count?.classes || 0}</strong> turmas</div>
        <div className="flex items-center gap-1.5"><strong>{parish?._count?.communities || 0}</strong> comunidades</div>
      </div>
      {billing && (
        <div className="flex items-center gap-2 pt-2 text-sm text-muted-foreground border-t">
          Plano: <strong>{PLAN_LABELS[billing.plan] || billing.plan}</strong>
          <span className={'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ' + (STATUS_LABELS[billing.status]?.color || 'bg-gray-100 text-gray-600')}>{STATUS_LABELS[billing.status]?.label || billing.status}</span>
        </div>
      )}
    </div>
  );
}
