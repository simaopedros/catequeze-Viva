import { useState } from 'react';
import { Button } from '../../../client/components/ui/button';
import { Plus, MapPin, Pencil, Check, X, Building2 } from 'lucide-react';

interface ParishCommunitiesTabProps {
  communities: any[];
  onCreate: (name: string, type: string, location: string) => Promise<void>;
  onUpdate: (id: string, fields: any) => Promise<void>;
}

export function ParishCommunitiesTab({ communities, onCreate, onUpdate }: ParishCommunitiesTabProps) {
  const [newCommName, setNewCommName] = useState('');
  const [newCommLoc, setNewCommLoc] = useState('');
  const [newCommType, setNewCommType] = useState('');
  const [creatingComm, setCreatingComm] = useState(false);
  const [editingCommId, setEditingCommId] = useState<string | null>(null);
  const [editCommFields, setEditCommFields] = useState<any>({});
  const [savingComm, setSavingComm] = useState(false);

  const handleCreate = async () => {
    if (!newCommName.trim()) return;
    setCreatingComm(true);
    try {
      await onCreate(newCommName.trim(), newCommType, newCommLoc);
      setNewCommName('');
      setNewCommLoc('');
      setNewCommType('');
    } finally {
      setCreatingComm(false);
    }
  };

  const startEdit = (c: any) => {
    setEditCommFields({ name: c.name || '', type: c.type || '', location: c.location || '', phone: c.phone || '', email: c.email || '', coordinatorName: c.coordinatorName || '' });
    setEditingCommId(c.id);
  };

  const cancelEdit = () => {
    setEditingCommId(null);
    setEditCommFields({});
  };

  const handleUpdate = async () => {
    if (!editingCommId || !editCommFields.name?.trim()) return;
    setSavingComm(true);
    try {
      await onUpdate(editingCommId, editCommFields);
      cancelEdit();
    } finally {
      setSavingComm(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <div className="flex gap-3">
          <input placeholder="Nome da comunidade *" value={newCommName} onChange={e => setNewCommName(e.target.value)} className="flex h-9 flex-1 rounded-md border border-input bg-background px-3 py-1 text-sm" />
          <select value={newCommType} onChange={e => setNewCommType(e.target.value)} className="h-9 w-40 rounded-md border border-input bg-background px-3 text-sm">
            <option value="">Tipo</option>
            <option value="CHAPEL">Capela</option>
            <option value="URBAN_COMMUNITY">Com. Urbana</option>
            <option value="RURAL_COMMUNITY">Com. Rural</option>
            <option value="MISSION">Missão</option>
          </select>
          <input placeholder="Local / Endereço" value={newCommLoc} onChange={e => setNewCommLoc(e.target.value)} className="flex h-9 flex-1 rounded-md border border-input bg-background px-3 py-1 text-sm" />
          <Button size="sm" onClick={handleCreate} disabled={creatingComm || !newCommName.trim()}>
            <Plus className="mr-1 h-3 w-3" />Criar
          </Button>
        </div>
      </div>

      {communities.length === 0 ? (
        <div className="text-center text-muted-foreground py-12"><Building2 className="mx-auto h-8 w-8 mb-2" />Nenhuma comunidade cadastrada.</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {communities.map((c: any) => {
            if (editingCommId === c.id) {
              return (
                <div key={c.id} className="rounded-lg border bg-card p-4 space-y-2 md:col-span-2">
                  <h3 className="font-medium text-sm">Editar Comunidade</h3>
                  <div className="flex gap-3">
                    <input value={editCommFields.name} onChange={e => setEditCommFields((p: any) => ({...p, name: e.target.value}))} className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm" placeholder="Nome *" autoFocus />
                    <select value={editCommFields.type} onChange={e => setEditCommFields((p: any) => ({...p, type: e.target.value}))} className="h-9 w-36 rounded-md border border-input bg-background px-3 text-sm">
                      <option value="">Tipo</option>
                      <option value="CHAPEL">Capela</option>
                      <option value="URBAN_COMMUNITY">Urbana</option>
                      <option value="RURAL_COMMUNITY">Rural</option>
                      <option value="MISSION">Missão</option>
                    </select>
                    <input value={editCommFields.location} onChange={e => setEditCommFields((p: any) => ({...p, location: e.target.value}))} className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm" placeholder="Local" />
                  </div>
                  <div className="flex gap-3">
                    <input value={editCommFields.phone} onChange={e => setEditCommFields((p: any) => ({...p, phone: e.target.value}))} className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm" placeholder="Telefone" />
                    <input value={editCommFields.email} onChange={e => setEditCommFields((p: any) => ({...p, email: e.target.value}))} className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm" placeholder="Email" />
                    <input value={editCommFields.coordinatorName} onChange={e => setEditCommFields((p: any) => ({...p, coordinatorName: e.target.value}))} className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm" placeholder="Responsável" />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleUpdate} disabled={savingComm || !editCommFields.name?.trim()}>
                      {savingComm ? '...' : <><Check className="mr-1 h-3 w-3" />Salvar</>}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={cancelEdit}><X className="mr-1 h-3 w-3" />Cancelar</Button>
                  </div>
                </div>
              );
            }
            return (
              <div key={c.id} className="rounded-lg border p-4 hover:border-primary/30 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{c.name}</p>
                      {c.type && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{c.type === 'CHAPEL' ? 'Capela' : c.type === 'URBAN_COMMUNITY' ? 'Urbana' : c.type === 'RURAL_COMMUNITY' ? 'Rural' : c.type === 'MISSION' ? 'Missão' : c.type}</span>}
                    </div>
                    {c.location && <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin className="h-3 w-3" />{c.location}</p>}
                    <p className="text-xs text-muted-foreground mt-1">{c._count?.memberships || 0} membros</p>
                  </div>
                  <button onClick={() => startEdit(c)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Editar"><Pencil className="h-3.5 w-3.5" /></button>
                </div>
                {(c.coordinatorName || c.phone || c.email) && (
                  <div className="mt-2 pt-2 border-t flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {c.coordinatorName && <span>Resp.: {c.coordinatorName}</span>}
                    {c.phone && <span>{c.phone}</span>}
                    {c.email && <span>{c.email}</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
