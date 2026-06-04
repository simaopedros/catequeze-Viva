import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { useState } from 'react';
import { Button } from '../../client/components/ui/button';
import { Input } from '../../client/components/ui/input';
import { Label } from '../../client/components/ui/label';
import { ArrowLeft, Save } from 'lucide-react';
import { AppShell } from '../AppShell';
import { createClass } from 'wasp/client/operations';
import { handlePlanLimitError } from '../lib/planLimitToast';
import { toast } from '../../client/hooks/use-toast';

export default function CreateClassPage() {
  const { t } = useTranslation('classes');
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [maxCapacity, setMaxCapacity] = useState(30);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!name) { setError('O nome da turma é obrigatório.'); return; }
    setSaving(true);
    setError('');
    try {
      await createClass({ name, location, dayOfWeek, startTime, endTime, maxCapacity });
      toast({ title: 'Turma criada com sucesso!' });
      navigate('/app/classes');
    } catch (err: any) {
      if (handlePlanLimitError(err.message || err)) return;
      setError(err.message || 'Erro ao criar turma.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/app/classes"><ArrowLeft className="h-5 w-5" /></Link>    
          </Button>
          <div><h1 className="text-2xl font-bold tracking-tight">{t('create')}</h1></div>
        </div>

        {error && <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t('name')} *</Label>
            <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Turma de Crisma 2026" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">{t('location')}</Label>
            <Input id="location" value={location} onChange={e => setLocation(e.target.value)} placeholder="Ex: Salão Paroquial" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="day">Dia</Label>
              <select id="day" value={dayOfWeek} onChange={e => setDayOfWeek(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Dia</option>
                {['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'].map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="start">Início</Label>
              <Input id="start" type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end">Fim</Label>
              <Input id="end" type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="capacity">{t('max_capacity')}</Label>
            <Input id="capacity" type="number" min={1} max={100} value={maxCapacity} onChange={e => setMaxCapacity(Number(e.target.value))} />
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="button" onClick={handleSubmit} disabled={saving}>     
              <Save className="mr-2 h-4 w-4" />
              {saving ? t('loading', { ns: 'common' }) : t('create')}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link to="/app/classes">{t('cancel', { ns: 'common' })}</Link>
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
