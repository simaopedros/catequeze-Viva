import { Link, useNavigate } from 'react-router';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../client/components/ui/button';
import { Input } from '../../client/components/ui/input';
import { Label } from '../../client/components/ui/label';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { AppShell } from '../AppShell';
import { createHousehold } from 'wasp/client/operations';
import PhoneMaskInput from '../../client/components/PhoneMaskInput';
import { useViaCep } from '../../client/hooks/useViaCep';

export default function CreateHouseholdPage() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [cep, setCep] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [cepAutoFilled, setCepAutoFilled] = useState(false);

  const { data: cepData, loading: cepLoading } = useViaCep(cep);

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

  useEffect(() => {
    setCepAutoFilled(false);
  }, [cep]);

  const handleSubmit = async () => {
    if (!name) {
      setError(t('families.name_required'));
      return;
    }
    setSaving(true);
    setError('');
    try {
      await createHousehold({
        name,
        address: address || undefined,
        phone: phone || undefined,
      });
      navigate('/app/families');
    } catch (err: any) {
      setError(err.message || t('families.create_error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/app/families"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t('families.create_title')}</h1>
          </div>
        </div>

        {error && <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t('families.name_label')}</Label>
            <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder={t('families.name_placeholder')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cep">{t('families.cep')}</Label>
            <div className="flex items-center gap-2">
              <Input
                id="cep"
                value={cep}
                onChange={e => setCep(e.target.value)}
                placeholder={t('cep_placeholder')}
                className="w-40"
              />
              {cepLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">{t('address')}</Label>
            <Input id="address" value={address} onChange={e => setAddress(e.target.value)} placeholder={t('families.address_placeholder')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">{t('phone')}</Label>
            <PhoneMaskInput value={phone} onChange={setPhone} placeholder={t('phone_placeholder')} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" onClick={handleSubmit} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? t('saving') : t('register')}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link to="/app/families">{t('cancel')}</Link>
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
