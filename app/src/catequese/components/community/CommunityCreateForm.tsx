import { useState } from 'react';
import { Button } from '../../../client/components/ui/button';
import { Textarea } from '../../../client/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { COMMUNITY_TYPE_OPTIONS } from '../../../shared/constants';
import PhoneMaskInput from '../../../client/components/PhoneMaskInput';
import AddressAutocomplete, { type AddressData } from '../../../client/components/AddressAutocomplete';

interface CommunityCreateFormProps {
  parishId: string;
  onCreate: (data: any) => Promise<void>;
  onCancel: () => void;
}

export function CommunityCreateForm({ parishId, onCreate, onCancel }: CommunityCreateFormProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState<AddressData>({
    zipCode: '',
    street: '',
    number: '',
    neighborhood: '',
    complement: '',
    city: '',
    state: '',
  });
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [coordinatorName, setCoordinatorName] = useState('');
  const [coordinatorPhone, setCoordinatorPhone] = useState('');
  const [creating, setCreating] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !parishId) return;
    setCreating(true);
    try {
      await onCreate({
        name: name.trim(),
        parishId,
        type: type || undefined,
        description: description.trim() || undefined,
        location: [address.street, address.number, address.neighborhood, address.city, address.state].filter(Boolean).join(', ') || undefined,
        street: address.street.trim() || undefined,
        number: address.number.trim() || undefined,
        neighborhood: address.neighborhood.trim() || undefined,
        zipCode: address.zipCode.trim() || undefined,
        complement: address.complement.trim() || undefined,
        city: address.city.trim() || undefined,
        state: address.state.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        coordinatorName: coordinatorName.trim() || undefined,
        coordinatorPhone: coordinatorPhone.trim() || undefined,
      });
    } finally {
      setCreating(false);
    }
  };

  const inputClass = "w-full h-9 rounded-md border border-input bg-background px-3 text-sm mt-1";

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4 animate-in fade-in slide-in-from-top-2">
      <h3 className="font-semibold text-sm">Nova Comunidade</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-muted-foreground">Nome *</label>
          <input value={name} onChange={e => setName(e.target.value)} className={inputClass} placeholder="Nome da comunidade" autoFocus />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Tipo</label>
          <select value={type} onChange={e => setType(e.target.value)} className={inputClass}>
            {COMMUNITY_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Telefone</label>
          <PhoneMaskInput value={phone} onChange={setPhone} className={inputClass} placeholder="(00) 00000-0000" />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-muted-foreground">Email</label>
          <input value={email} onChange={e => setEmail(e.target.value)} className={inputClass} placeholder="comunidade@email.com" />
        </div>
      </div>

      <div className="border-t pt-3">
        <p className="text-xs font-medium text-muted-foreground mb-2">Endereço</p>
        <AddressAutocomplete value={address} onChange={setAddress} />
      </div>

      <div className="border-t pt-3">
        <p className="text-xs font-medium text-muted-foreground mb-2">Coordenador / Responsável</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><input value={coordinatorName} onChange={e => setCoordinatorName(e.target.value)} className={inputClass} placeholder="Nome do responsável" /></div>
          <div><PhoneMaskInput value={coordinatorPhone} onChange={setCoordinatorPhone} className={inputClass} placeholder="Telefone do responsável" /></div>
        </div>
      </div>

      <div className="border-t pt-3">
        <label className="text-xs font-medium text-muted-foreground">Descrição / Observações</label>
        <Textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1" rows={2} placeholder="Informações adicionais sobre a comunidade..." />
      </div>

      <div className="flex gap-2">
        <Button size="sm" onClick={handleSubmit} disabled={creating || !name.trim()}>
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Criar Comunidade'}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancelar</Button>
      </div>
    </div>
  );
}
