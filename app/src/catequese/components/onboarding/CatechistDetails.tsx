import { useState } from 'react';
import { Button } from '../../../client/components/ui/button';
import { GraduationCap, Check } from 'lucide-react';

const DAYS = [
  { value: '0', label: 'Domingo' },
  { value: '1', label: 'Segunda-feira' },
  { value: '2', label: 'Terça-feira' },
  { value: '3', label: 'Quarta-feira' },
  { value: '4', label: 'Quinta-feira' },
  { value: '5', label: 'Sexta-feira' },
  { value: '6', label: 'Sábado' },
];

interface CatechistDetailsProps {
  parishName: string;
  onComplete: (data: { className?: string; dayOfWeek?: string; startTime?: string; endTime?: string; location?: string }) => void;
}

export function CatechistDetails({ parishName, onComplete }: CatechistDetailsProps) {
  const [className, setClassName] = useState('');
  const [skipClass, setSkipClass] = useState(false);
  const [dayOfWeek, setDayOfWeek] = useState('6');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:30');
  const [location, setLocation] = useState(parishName || '');

  const handleFinish = () => {
    onComplete({
      className: skipClass ? undefined : className.trim() || undefined,
      dayOfWeek: skipClass ? undefined : dayOfWeek,
      startTime: skipClass ? undefined : startTime,
      endTime: skipClass ? undefined : endTime,
      location: skipClass ? undefined : location || undefined,
    });
  };

  return (
    <div className="rounded-xl border bg-card p-6 space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <GraduationCap className="h-5 w-5 text-primary" />A tua Turma
      </h2>

      <div>
        <label className="text-sm font-medium">Nome da turma</label>
        <input value={className} onChange={e => setClassName(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
          placeholder="Ex: Turma de Crisma 2026" disabled={skipClass} />
      </div>

      {!skipClass && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-sm font-medium">Dia da semana</label>
            <select value={dayOfWeek} onChange={e => setDayOfWeek(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1">
              {DAYS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Início</label>
            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium">Término</label>
            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1" />
          </div>
        </div>
      )}

      {!skipClass && (
        <div>
          <label className="text-sm font-medium">Local</label>
          <input value={location} onChange={e => setLocation(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
            placeholder={parishName} />
        </div>
      )}

      <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
        <input type="checkbox" checked={skipClass}
          onChange={e => { setSkipClass(e.target.checked); if (e.target.checked) setClassName(''); }} />
        Criar turma depois
      </label>

      <div className="flex justify-end">
        <Button onClick={handleFinish}>
          <Check className="mr-2 h-4 w-4" />Concluir
        </Button>
      </div>
    </div>
  );
}
