import { Link, useNavigate } from 'react-router';
import { useState, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../client/components/ui/button';
import { ArrowLeft, Save, Plus, AlertTriangle, Camera } from 'lucide-react';
import { AppShell } from '../AppShell';
import { useQuery, listHouseholds, createCatechumen } from 'wasp/client/operations';
import { useActiveParish } from '../../client/hooks/useActiveParish';
import { toast } from '../../client/hooks/use-toast';
import { useUserContext } from '../../client/hooks/useUserContext';
import CreateHouseholdModal from '../components/CreateHouseholdModal';

function compressImage(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX = 200;
        let w = img.width, h = img.height;
        if (w > h && w > MAX) { h *= MAX / w; w = MAX; }
        else if (h > MAX) { w *= MAX / h; h = MAX; }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.5));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function CreateCatechumenPage() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const { activeParishId } = useActiveParish();
  const { userRole } = useUserContext();
  const { data: households = [], refetch: refetchHouseholds } = useQuery(listHouseholds);

  const canManage = ['SUPER_ADMIN', 'DIOCESE_ADMIN', 'PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR', 'LEAD_CATECHIST', 'ASSISTANT_CATECHIST', 'PERSONAL_OWNER'].includes(userRole);

  const filteredHouseholds = useMemo(() => {
    if (!activeParishId) return households;
    return households.filter((h: any) => h.parishId === activeParishId);
  }, [households, activeParishId]);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [email, setEmail] = useState('');
  const [photo, setPhoto] = useState('');
  const [householdId, setHouseholdId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showCreateHouseholdModal, setShowCreateHouseholdModal] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImage(file);
    setPhoto(compressed);
  };

  const handleSubmit = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      setError(t('catechumens.name_required_error'));
      return;
    }
    setSaving(true);
    setError('');
    try {
      const result = await createCatechumen({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        birthDate: birthDate || undefined,
        email: email.trim() || undefined,
        photoUrl: photo || undefined,
        householdId: householdId || undefined,
      });
      toast({ title: t('catechumens.created_success') });
      navigate(`/app/catechumens/${result.id}`);
    } catch (err: any) {
      setError(err.message || t('catechumens.create_error'));
    } finally {
      setSaving(false);
    }
  };

  if (!canManage) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <AlertTriangle className="h-12 w-12 text-destructive" />
          <h1 className="text-xl font-bold">{t('catechumens.access_restricted')}</h1>
          <p className="text-muted-foreground max-w-md">{t('catechumens.access_restricted_desc')}</p>
          <Button variant="outline" onClick={() => navigate('/app/catechumens')}>{t('back')}</Button>
        </div>
      </AppShell>
    );
  }

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
            <h1 className="text-2xl font-bold tracking-tight">{t('catechumens.new_title')}</h1>
          </div>
        </div>

        {error && <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

        <div className="flex flex-col items-center gap-3">
          <div className="relative w-24 h-24 rounded-full overflow-hidden bg-muted border-2 border-dashed cursor-pointer" onClick={() => fileRef.current?.click()}>
            {photo ? <img src={photo} alt={t('catechumens.photo_alt')} className="w-full h-full object-cover" /> : <div className="flex items-center justify-center h-full text-muted-foreground"><Camera className="h-8 w-8" /></div>}
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
          <span className="text-xs text-muted-foreground">{t('catechumens.add_photo')}</span>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>{t('first_name')} *</label>
              <input value={firstName} onChange={e => setFirstName(e.target.value)} className={inputClass} placeholder={t('catechumens.first_name_placeholder')} />
            </div>
            <div>
              <label className={labelClass}>{t('last_name')} *</label>
              <input value={lastName} onChange={e => setLastName(e.target.value)} className={inputClass} placeholder={t('catechumens.last_name_placeholder')} />
            </div>
          </div>

          <div>
            <label className={labelClass}>{t('catechumens.birth_date')}</label>
            <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>{t('email')}</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputClass} placeholder={t('email_placeholder')} />
          </div>

          <div>
            <label className={labelClass}>{t('catechumens.family')}</label>
            <select value={householdId} onChange={e => setHouseholdId(e.target.value)} className={inputClass}>
              <option value="">{t('catechumens.no_family')}</option>
              {filteredHouseholds.map((h: any) => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
            {filteredHouseholds.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {t('catechumens.no_families_registered')}{' '}
                <button
                  type="button"
                  onClick={() => setShowCreateHouseholdModal(true)}
                  className="text-primary underline"
                >
                  {t('families.create_family')}
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
                  {t('families.create_new_family')}
                </button>
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" onClick={handleSubmit} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? t('saving') : t('register')}
            </Button>
            <Button variant="outline" asChild>
              <Link to="/app/catechumens">{t('cancel')}</Link>
            </Button>
          </div>
        </div>
      </div>

      <CreateHouseholdModal
        isOpen={showCreateHouseholdModal}
        onClose={() => setShowCreateHouseholdModal(false)}
        onCreated={(newHouseholdId, _householdName) => {
          setHouseholdId(newHouseholdId);
          refetchHouseholds();
        }}
      />
    </AppShell>
  );
}
