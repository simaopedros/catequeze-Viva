import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Button } from '../../client/components/ui/button';
import { Textarea } from '../../client/components/ui/textarea';
import { Building2, Plus, Loader2, Check, X } from 'lucide-react';
import { useCommunityTypeOptions } from '../../i18n/useLabels';
import { AppShell } from '../AppShell';
import { useQuery, listCommunities, createCommunity, updateCommunity } from 'wasp/client/operations';
import { useActiveParish } from '../../client/hooks/useActiveParish';
import { CommunityCreateForm } from '../components/community/CommunityCreateForm';
import { CommunityCard } from '../components/community/CommunityCard';
import PhoneMaskInput from '../../client/components/PhoneMaskInput';

export default function CommunitiesPage() {
  const { t } = useTranslation('common');
  const { t: tp } = useTranslation('parishes');
  const { t: tn } = useTranslation('navigation');
  const communityTypeOptions = useCommunityTypeOptions();
  const navigate = useNavigate();
  const { activeParishId } = useActiveParish();
  const { data: communities = [], isLoading: loading } = useQuery(
    listCommunities,
    { parishId: activeParishId }
  );

  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const updateEditField = (field: string, value: string) => {
    setEditFields((prev: any) => ({ ...prev, [field]: value }));
  };

  const startEdit = (c: any) => {
    setEditFields({
      name: c.name || '', type: c.type || '', description: c.description || '',
      street: c.street || '', number: c.number || '', neighborhood: c.neighborhood || '',
      zipCode: c.zipCode || '', complement: c.complement || '', city: c.city || '',
      state: c.state || '', phone: c.phone || '', email: c.email || '',
      coordinatorName: c.coordinatorName || '', coordinatorPhone: c.coordinatorPhone || '',
    });
    setEditingId(c.id);
  };

  const cancelEdit = () => { setEditingId(null); setEditFields({}); };

  const handleUpdate = async () => {
    if (!editingId || !editFields.name?.trim()) return;
    setSaving(true);
    try {
      await updateCommunity({
        id: editingId, name: editFields.name.trim(), type: editFields.type || undefined,
        description: editFields.description?.trim() || undefined,
        location: [editFields.street, editFields.number, editFields.neighborhood, editFields.city, editFields.state].filter(Boolean).join(', ') || undefined,
        street: editFields.street?.trim() || undefined, number: editFields.number?.trim() || undefined,
        neighborhood: editFields.neighborhood?.trim() || undefined, zipCode: editFields.zipCode?.trim() || undefined,
        complement: editFields.complement?.trim() || undefined, city: editFields.city?.trim() || undefined,
        state: editFields.state?.trim() || undefined, phone: editFields.phone?.trim() || undefined,
        email: editFields.email?.trim() || undefined, coordinatorName: editFields.coordinatorName?.trim() || undefined,
        coordinatorPhone: editFields.coordinatorPhone?.trim() || undefined,
      });
      cancelEdit();
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const handleCreate = async (data: any) => {
    await createCommunity(data);
    setShowCreate(false);
  };

  const inputClass = "w-full h-9 rounded-md border border-input bg-background px-3 text-sm mt-1";

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <button onClick={() => navigate('/app/parishes')} className="hover:text-foreground transition-colors">{tn('parishes')}</button>
          <span>/</span>
          <span className="text-foreground font-medium">{tn('communities')}</span>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{tn('communities')}</h1>
            <p className="text-muted-foreground text-sm">{tp('communities_page_subtitle')}</p>
          </div>
          <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
            <Plus className="mr-1 h-4 w-4" />{tp('new_community_btn')}
          </Button>
        </div>

        {showCreate && activeParishId && (
          <CommunityCreateForm
            parishId={activeParishId}
            onCreate={handleCreate}
            onCancel={() => setShowCreate(false)}
          />
        )}

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : communities.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border bg-card p-12 text-center">
            <div className="mb-4 rounded-full bg-primary/10 p-3"><Building2 className="h-8 w-8 text-primary" /></div>
            <h3 className="text-lg font-semibold">{tp('no_community')}</h3>
            <p className="text-sm text-muted-foreground">{activeParishId ? tp('no_communities_desc') : tp('select_parish_hint')}</p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {communities.map((c: any) => (
              <CommunityCard
                key={c.id}
                community={c}
                onEdit={startEdit}
                isEditing={editingId === c.id}
                editForm={
                  <div className="rounded-lg border bg-card p-4 space-y-3">
                    <h3 className="font-semibold text-sm">{tp('edit_community')}</h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="sm:col-span-2"><label className="text-xs font-medium text-muted-foreground">{tp('name')} *</label><input value={editFields.name} onChange={e => updateEditField('name', e.target.value)} className={inputClass} autoFocus /></div>
                      <div><label className="text-xs font-medium text-muted-foreground">{tp('type')}</label><select value={editFields.type} onChange={e => updateEditField('type', e.target.value)} className={inputClass}>{communityTypeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
                      <div><label className="text-xs font-medium text-muted-foreground">{t('phone')}</label><PhoneMaskInput value={editFields.phone} onChange={v => updateEditField('phone', v)} className={inputClass} /></div>
                      <div className="sm:col-span-2"><label className="text-xs font-medium text-muted-foreground">{tp('email')}</label><input value={editFields.email} onChange={e => updateEditField('email', e.target.value)} className={inputClass} /></div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="sm:col-span-2"><label className="text-xs font-medium text-muted-foreground">{tp('street')}</label><input value={editFields.street} onChange={e => updateEditField('street', e.target.value)} className={inputClass} /></div>
                      <div><label className="text-xs font-medium text-muted-foreground">{tp('number')}</label><input value={editFields.number} onChange={e => updateEditField('number', e.target.value)} className={inputClass} /></div>
                      <div><label className="text-xs font-medium text-muted-foreground">{tp('neighborhood')}</label><input value={editFields.neighborhood} onChange={e => updateEditField('neighborhood', e.target.value)} className={inputClass} /></div>
                      <div><label className="text-xs font-medium text-muted-foreground">{tp('city')}</label><input value={editFields.city} onChange={e => updateEditField('city', e.target.value)} className={inputClass} /></div>
                      <div><label className="text-xs font-medium text-muted-foreground">{tp('state_abbr')}</label><input value={editFields.state} onChange={e => updateEditField('state', e.target.value)} className={inputClass} maxLength={2} /></div>
                      <div><label className="text-xs font-medium text-muted-foreground">{tp('coordinator')}</label><input value={editFields.coordinatorName} onChange={e => updateEditField('coordinatorName', e.target.value)} className={inputClass} /></div>
                      <div className="sm:col-span-2"><label className="text-xs font-medium text-muted-foreground">{tp('coordinator_phone')}</label><PhoneMaskInput value={editFields.coordinatorPhone} onChange={v => updateEditField('coordinatorPhone', v)} className={inputClass} /></div>
                    </div>
                    <div><label className="text-xs font-medium text-muted-foreground">{tp('description')}</label><Textarea value={editFields.description} onChange={e => updateEditField('description', e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1" rows={2} /></div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleUpdate} disabled={saving || !editFields.name?.trim()}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="mr-1 h-4 w-4" />{tp('save')}</>}</Button>
                      <Button size="sm" variant="ghost" onClick={cancelEdit}><X className="mr-1 h-4 w-4" />{tp('cancel')}</Button>
                    </div>
                  </div>
                }
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
