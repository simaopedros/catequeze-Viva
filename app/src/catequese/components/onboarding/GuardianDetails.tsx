import { useState } from 'react';
import { Button } from '../../../client/components/ui/button';
import { Heart, Check } from 'lucide-react';
import PhoneMaskInput from '../../../client/components/PhoneMaskInput';

interface GuardianDetailsProps {
  onComplete: (data: { householdName: string; phone?: string }) => void;
}

export function GuardianDetails({ onComplete }: GuardianDetailsProps) {
  const [householdName, setHouseholdName] = useState('');
  const [phone, setPhone] = useState('');

  return (
    <div className="rounded-xl border bg-card p-6 space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Heart className="h-5 w-5 text-primary" />Criar Família
      </h2>
      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium">Nome da família</label>
          <input value={householdName} onChange={e => setHouseholdName(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
            placeholder="Ex: Família Silva" />
        </div>
        <div>
          <label className="text-sm font-medium">Telefone</label>
          <PhoneMaskInput value={phone} onChange={setPhone}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
            placeholder="Ex: (11) 99999-0000" />
        </div>
      </div>
      <div className="flex justify-end">
        <Button onClick={() => onComplete({ householdName: householdName || 'Família', phone: phone || undefined })} disabled={!householdName.trim()}>
          <Check className="mr-2 h-4 w-4" />Concluir
        </Button>
      </div>
    </div>
  );
}
