import { useState, useEffect } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { Button } from '../../client/components/ui/button';
import { Input } from '../../client/components/ui/input';
import { Label } from '../../client/components/ui/label';
import { createHousehold } from 'wasp/client/operations';
import PhoneMaskInput from '../../client/components/PhoneMaskInput';
import { useViaCep } from '../../client/hooks/useViaCep';

interface CreateHouseholdModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (householdId: string, householdName: string) => void;
}

export default function CreateHouseholdModal({ isOpen, onClose, onCreated }: CreateHouseholdModalProps) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [cep, setCep] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [cepAutoFilled, setCepAutoFilled] = useState(false);

  const { data: cepData, loading: cepLoading } = useViaCep(cep);

  // Auto-populate address from ViaCEP
  useEffect(() => {
    if (cepData && !cepAutoFilled) {
      const parts = [
        cepData.street,
        cepData.neighborhood && `- ${cepData.neighborhood}`,
        cepData.city && `- ${cepData.city}/${cepData.state}`,
      ].filter(Boolean);
      setAddress(parts.join(' ') || address);
      setCepAutoFilled(true);
    }
  }, [cepData]);

  // Reset autoFilled when CEP changes
  useEffect(() => {
    setCepAutoFilled(false);
  }, [cep]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setName('');
      setAddress('');
      setCep('');
      setPhone('');
      setError('');
      setCepAutoFilled(false);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!name) {
      setError('O nome da família é obrigatório.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const household = await createHousehold({
        name,
        address: address || undefined,
        phone: phone || undefined,
      });
      onCreated(household.id, household.name);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao cadastrar família.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-card rounded-2xl shadow-2xl border overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Nova Família</h3>
          <button
            onClick={onClose}
            className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          )}

          <div className="space-y-2">
            <Label htmlFor="modal-name">Nome da família *</Label>
            <Input
              id="modal-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Família Silva"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="modal-cep">CEP</Label>
            <div className="flex items-center gap-2">
              <Input
                id="modal-cep"
                value={cep}
                onChange={e => setCep(e.target.value)}
                placeholder="00000-000"
                className="w-40"
              />
              {cepLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="modal-address">Endereço</Label>
            <Input
              id="modal-address"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="Ex: Rua das Flores, 123"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="modal-phone">Telefone</Label>
            <PhoneMaskInput
              value={phone}
              onChange={setPhone}
              placeholder="(11) 99999-9999"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Salvando...' : 'Cadastrar'}
          </Button>
        </div>
      </div>
    </div>
  );
}
