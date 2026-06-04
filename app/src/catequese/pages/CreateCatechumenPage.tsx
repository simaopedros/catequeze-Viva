import { Link, useNavigate } from 'react-router';
import { useState, useMemo } from 'react';
import { Button } from '../../client/components/ui/button';
import { ArrowLeft, Save, UserPlus, Plus } from 'lucide-react';
import { AppShell } from '../AppShell';
import { useQuery, listHouseholds, createCatechumen } from 'wasp/client/operations';
import { useActiveParish } from '../../client/hooks/useActiveParish';
import { toast } from '../../client/hooks/use-toast';
import CreateHouseholdModal from '../components/CreateHouseholdModal';

export default function CreateCatechumenPage() {
  const navigate = useNavigate();
  const { activeParishId } = useActiveParish();
  const { data: households = [], refetch: refetchHouseholds } = useQuery(listHouseholds);

  const filteredHouseholds = useMemo(() => {
    if (!activeParishId) return households;
    return households.filter((h: any) => h.parishId === activeParishId);
  }, [households, activeParishId]);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [householdId, setHouseholdId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showCreateHouseholdModal, setShowCreateHouseholdModal] = useState(false);

  const handleSubmit = async () => {
    if (!firstName || !lastName) {
      setError('Nome e sobrenome são obrigatórios.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await createCatechumen({
        firstName,
        lastName,
        birthDate: birthDate || undefined,
        householdId: householdId || undefined,
      });
      toast({ title: 'Catequizando cadastrado com sucesso!' });
      navigate('/app/catechumens');
    } catch (err: any) {
      setError(err.message || 'Erro ao cadastrar catequizando.');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1";
  const labelClass = "text-sm font-medium";

  return (
    <AppShell>
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/app/catechumens"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Novo Catequizando</h1>
          </div>
        </div>

        {error && <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Nome *</label>
              <input value={firstName} onChange={e => setFirstName(e.target.value)} className={inputClass} placeholder="Ex: João" />
            </div>
            <div>
              <label className={labelClass}>Sobrenome *</label>
              <input value={lastName} onChange={e => setLastName(e.target.value)} className={inputClass} placeholder="Ex: Silva" />
            </div>
          </div>

          <div>
            <label className={labelClass}>Data de nascimento</label>
            <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>Família</label>
            <select value={householdId} onChange={e => setHouseholdId(e.target.value)} className={inputClass}>
              <option value="">Sem família</option>
              {filteredHouseholds.map((h: any) => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
            {filteredHouseholds.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Nenhuma família cadastrada.{' '}
                <button
                  type="button"
                  onClick={() => setShowCreateHouseholdModal(true)}
                  className="text-primary underline"
                >
                  Criar família
                </button>
              </p>
            )}
            {filteredHouseholds.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                <button
                  type="button"
                  onClick={() => setShowCreateHouseholdModal(true)}
                  className="text-primary underline inline-flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" />
                  Criar nova família
                </button>
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" onClick={handleSubmit} disabled={saving}>     
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Salvando...' : 'Cadastrar'}
            </Button>
            <Button variant="outline" asChild>
              <Link to="/app/catechumens">Cancelar</Link>
            </Button>
          </div>
        </div>
      </div>

      <CreateHouseholdModal
        isOpen={showCreateHouseholdModal}
        onClose={() => setShowCreateHouseholdModal(false)}
        onCreated={(householdId, _householdName) => {
          setHouseholdId(householdId);
          refetchHouseholds();
        }}
      />
    </AppShell>
  );
}
