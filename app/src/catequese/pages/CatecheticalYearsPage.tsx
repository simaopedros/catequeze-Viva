import { useState } from 'react';
import { CalendarDays, Plus, Edit, Trash2, Check } from 'lucide-react';
import { Button } from '../../client/components/ui/button';
import { Badge } from '../../client/components/ui/badge';
import { AppShell } from '../AppShell';
import { useQuery, listCatecheticalYears, createCatecheticalYear } from 'wasp/client/operations';
import { useActiveParish } from '../../client/hooks/useActiveParish';

interface CatecheticalYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  parishId: string;
  parish?: { name: string };
}

export default function CatecheticalYearsPage() {
  const { activeParishId } = useActiveParish();
  const { data: years = [], isLoading: loading } = useQuery(listCatecheticalYears);
  const [error, setError] = useState('');

  const filteredYears = activeParishId
    ? years.filter((y: any) => y.parishId === activeParishId)
    : years;
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleCreate = async () => {
    if (!name || !startDate || !endDate) return;
    setSaving(true);
    setError('');
    try {
      await createCatecheticalYear({ name, startDate, endDate });      
      setName(''); setStartDate(''); setEndDate('');
      setShowForm(false);
    } catch (e: any) {
      setError(e.message || 'Erro ao criar ano catequético.');
    }
    setSaving(false);
  };

  const isActive = (year: CatecheticalYear) => {
    const now = new Date();
    const end = new Date(year.endDate);
    return end >= now;
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Anos Catequéticos</h1>
            <p className="text-muted-foreground text-sm">Períodos, etapas e sacramentos.</p>
          </div>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="mr-1 h-4 w-4" />
            Novo ano
          </Button>
        </div>

        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        )}

        {/* Create form */}
        {showForm && (
          <div className="rounded-xl border bg-card p-6 space-y-4">
            <h3 className="font-semibold">Novo Ano Catequético</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="text-sm font-medium">Nome *</label>
                <input value={name} onChange={e => setName(e.target.value)}     
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                  placeholder="Ex: Catequese 2026" />
              </div>
              <div>
                <label className="text-sm font-medium">Início *</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Término *</label>        
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreate} disabled={saving || !name || !startDate || !endDate}>
                <Check className="mr-1 h-4 w-4" />
                {saving ? 'Criando...' : 'Criar'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            </div>
          </div>
        )}

        {/* List */}
        {filteredYears.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border bg-card p-12 text-center">
            <div className="mb-4 rounded-full bg-primary/10 p-3">
              <CalendarDays className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">Nenhum ano catequético</h3>   
            <p className="text-sm text-muted-foreground mb-4">
              Crie o primeiro ano catequético para organizar etapas e turmas.   
            </p>
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus className="mr-1 h-4 w-4" /> Criar ano catequético
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredYears.map((year: any) => (
              <div key={year.id} className="rounded-xl border bg-card p-5 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <CalendarDays className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">{year.name}</h3>    
                      {year.parish?.name && (
                        <p className="text-xs text-muted-foreground">{year.parish.name}</p>
                      )}
                    </div>
                  </div>
                  <Badge variant={isActive(year) ? 'default' : 'secondary'}>    
                    {isActive(year) ? 'Ativo' : 'Concluído'}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">       
                  <p>Início: {new Date(year.startDate).toLocaleDateString('pt-BR')}</p>
                  <p>Término: {new Date(year.endDate).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
