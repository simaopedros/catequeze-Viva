import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../client/components/ui/button';
import CityStateSelect from '../../../client/components/CityStateSelect';

const PLAN_KEYS: Record<string, string> = {
  CATECHIST_FREE: 'plan_free',
  SINGLE: 'plan_single',
  UNLIMITED: 'plan_unlimited',
};

const STATUS_KEYS: Record<string, { key: string; color: string }> = {
  ACTIVE: { key: 'active', color: 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400' },
  TRIAL: { key: 'trial', color: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400' },
  PAST_DUE: { key: 'past_due', color: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400' },
  CANCELED: { key: 'canceled', color: 'bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400' },
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
  const { t: tp } = useTranslation('parishes');
  const billing = parish?.billing;

  const planLabel = (plan: string) => {
    const key = PLAN_KEYS[plan];
    return key ? tp(key) : plan;
  };

  const statusInfo = useMemo(() => {
    if (!billing?.status) return null;
    return STATUS_KEYS[billing.status] || { key: billing.status, color: 'bg-gray-100 text-gray-600' };
  }, [billing?.status]);

  if (editing) {
    return (
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <h3 className="font-semibold">{tp('edit_parish_title')}</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="text-xs font-medium text-muted-foreground">{tp('name')}</label><input value={editName} onChange={e => setEditName(e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm mt-1" /></div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">{tp('city_state')}</label>
            <div className="mt-1">
              <CityStateSelect city={editCity} state={editState} onCityChange={setEditCity} onStateChange={setEditState} />
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={onSave} disabled={saving || !editName.trim()}>{saving ? tp('saving') : tp('save')}</Button>
          <Button size="sm" variant="ghost" onClick={onCancel}>{tp('cancel')}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{tp('parish_data')}</h3>
        <Button variant="ghost" size="sm" onClick={onStartEdit}>{tp('edit')}</Button>
      </div>
      <div className="grid gap-2 text-sm sm:grid-cols-2">
        <div><span className="text-muted-foreground">{tp('name')}:</span> {parish?.name}</div>
        <div><span className="text-muted-foreground">{tp('city')}:</span> {parish?.city || '\u2014'}</div>
        <div><span className="text-muted-foreground">{tp('state')}:</span> {parish?.state || '\u2014'}</div>
        <div><span className="text-muted-foreground">{tp('status')}:</span>{' '}<span className={'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ' + (parish?.active !== false ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400')}>{parish?.active !== false ? tp('active') : tp('inactive')}</span></div>
        {parish?.diocese && <div><span className="text-muted-foreground">{tp('diocese')}:</span> {parish.diocese.name}</div>}
        <div className="flex items-center gap-1"><span className="text-muted-foreground">{tp('locale_label')}:</span> {parish?.locale || 'pt-BR'}</div>
        <div className="flex items-center gap-1"><span className="text-muted-foreground">{tp('timezone_label')}:</span> {parish?.timezone || 'America/Sao_Paulo'}</div>
      </div>
      <div className="flex gap-6 pt-2 text-sm">
        <div className="flex items-center gap-1.5"><strong>{parish?._count?.memberships || 0}</strong> {tp('members')}</div>
        <div className="flex items-center gap-1.5"><strong>{parish?._count?.classes || 0}</strong> {tp('classes')}</div>
        <div className="flex items-center gap-1.5"><strong>{parish?._count?.communities || 0}</strong> {tp('communities')}</div>
      </div>
      {billing && (
        <div className="flex items-center gap-2 pt-2 text-sm text-muted-foreground border-t">
          {tp('plan_label')}: <strong>{planLabel(billing.plan)}</strong>
          {statusInfo && (
            <span className={'inline-flex items-center rounded-full px-2 py-0.5 text-overline font-medium ' + statusInfo.color}>{STATUS_KEYS[billing.status] ? tp(statusInfo.key) : billing.status}</span>
          )}
        </div>
      )}
    </div>
  );
}
