import { useState } from 'react';
import { Button } from '../../client/components/ui/button';
import { Plus, Church, Edit, Save, X } from 'lucide-react';
import { AppShell } from '../AppShell';
import { useQuery, listDioceses, createDiocese, updateDiocese } from 'wasp/client/operations';

export default function AdminDiocesesPage() {
  const { data: dioceses = [], isLoading: loading } = useQuery(listDioceses);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [country, setCountry] = useState('BR');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleCreate = async () => {
    if (!name) return;
    setSaving(true);
    try {
      await createDiocese({ name, country });
      setName(''); setShowForm(false);
    } catch (e: any) {
      setError(e.message || 'Erro ao criar diocese.');
    }
    setSaving(false);
  };

  const handleUpdate = async (id: string) => {
    if (!editName) return;
    try {
      await updateDiocese({ id, name: editName });
      setEditingId(null);
    } catch (e: any) {
      setError(e.message || 'Erro ao atualizar.');
    }
  };

  if (loading) {
    return <AppShell><div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div></AppShell>;
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dioceses</h1>
            <p className="text-muted-foreground text-sm">Gestão de dioceses (Super Admin)</p>
          </div>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="mr-1 h-4 w-4" />Nova diocese
          </Button>
        </div>

        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        )}

        {showForm && (
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <div className="flex gap-3">
              <input value={name} onChange={e => setName(e.target.value)}       
                className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm"
                placeholder="Nome da diocese" />
              <select value={country} onChange={e => setCountry(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm">
                <option value="BR">Brasil</option>
                <option value="PT">Portugal</option>
                <option value="AO">Angola</option>
                <option value="MZ">Moçambique</option>
              </select>
              <Button size="sm" onClick={handleCreate} disabled={saving || !name}>
                <Save className="mr-1 h-3 w-3" />{saving ? '...' : 'Criar'}     
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            </div>
          </div>
        )}

        <div className="rounded-xl border bg-card overflow-hidden">
          {dioceses.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Church className="mx-auto h-8 w-8 mb-3 text-primary/50" />       
              <p>Nenhuma diocese cadastrada.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Nome</th>     
                  <th className="text-left px-4 py-3 font-medium">País</th>     
                  <th className="text-left px-4 py-3 font-medium">Paróquias</th>
                  <th className="text-right px-4 py-3 font-medium">Ações</th>   
                </tr>
              </thead>
              <tbody>
                {dioceses.map((d: any) => (
                  <tr key={d.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      {editingId === d.id ? (
                        <input value={editName} onChange={e => setEditName(e.target.value)}
                          className="h-8 rounded border border-input bg-background px-2 text-sm w-full" />
                      ) : d.name}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{d.country}</td>
                    <td className="px-4 py-3 text-muted-foreground">{d._count?.parishes || 0}</td>
                    <td className="px-4 py-3 text-right">
                      {editingId === d.id ? (
                        <div className="flex justify-end gap-1">
                          <button onClick={() => handleUpdate(d.id)} className="p-1 text-green-600 hover:bg-green-50 rounded">
                            <Save className="h-4 w-4" />
                          </button>
                          <button onClick={() => setEditingId(null)} className="p-1 text-muted-foreground hover:bg-muted rounded">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => { setEditingId(d.id); setEditName(d.name); }}
                          className="p-1 text-muted-foreground hover:text-foreground rounded">
                          <Edit className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppShell>
  );
}
