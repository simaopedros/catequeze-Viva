import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from 'wasp/client/auth';
import { Button } from '../../client/components/ui/button';
import { Input } from '../../client/components/ui/input';
import { Label } from '../../client/components/ui/label';
import { Badge } from '../../client/components/ui/badge';
import { User, Globe, Bell, Shield, Save, Key, Download, Church, CheckCircle, AlertCircle, GitMerge, RefreshCw } from 'lucide-react';
import { ROLE_LABELS } from '../../shared/constants';
import { AppShell } from '../AppShell';
import { PageHeader } from '../../client/components/PageHeader';
import { useUserContext } from '../../client/hooks/useUserContext';
import { updateUserProfile, requestDataExport, changePassword, useQuery, listParishes, executeParishMigration } from 'wasp/client/operations';
import PhoneMaskInput from '../../client/components/PhoneMaskInput';
import TwoFactorSetup from '../components/TwoFactorSetup';

export default function SettingsPage() {
  const { t } = useTranslation('settings');
  const { t: tc } = useTranslation('common');
  const { data: user } = useAuth();
  const { userRole, parishName: ctxParishName } = useUserContext();
  const [firstName,setFirstName]=useState(''); const [lastName,setLastName]=useState('');
  const [phone,setPhone]=useState(''); const [saving,setSaving]=useState(false); const [saved,setSaved]=useState(false);
  const [saveError,setSaveError]=useState('');
  // Password
  const [currentPass,setCurrentPass]=useState(''); const [newPass,setNewPass]=useState('');
  const [changingPass,setChangingPass]=useState(false); const [passMsg,setPassMsg]=useState('');
  const [passError,setPassError]=useState(false);
  // Export
  const [exporting,setExporting]=useState(false); const [exportMsg,setExportMsg]=useState('');

  // Migration
  const [migrating, setMigrating] = useState(false);
  const [migrationMsg, setMigrationMsg] = useState('');
  const [migrationError, setMigrationError] = useState(false);
  const [sourceParishId, setSourceParishId] = useState('');
  const { data: userParishes = [] } = useQuery(listParishes);

  useEffect(()=>{
    setFirstName(user?.firstName||''); setLastName(user?.lastName||''); setPhone(user?.phone||'');
  },[user]);

  const handleSaveProfile = async()=>{
    setSaving(true); setSaved(false); setSaveError('');
    try{
      await updateUserProfile({ firstName, lastName, phone });
      setSaved(true);
      setTimeout(()=>setSaved(false),3000);
    }catch(e: any){
      setSaveError(e.message || t('save_profile_error'));
    }
    setSaving(false);
  };

  const handleChangePassword = async()=>{
    if(!currentPass||!newPass){setPassMsg(t('fill_all_fields'));setPassError(true);return;}
    if(newPass.length < 8){setPassMsg(t('password_min_length'));setPassError(true);return;}

    setChangingPass(true);setPassMsg('');setPassError(false);
    try{
      await changePassword({ currentPassword: currentPass, newPassword: newPass });
      setPassMsg(t('password_changed'));
      setPassError(false);
      setCurrentPass('');
      setNewPass('');
    }catch(e: any){
      setPassMsg(e.message || t('password_change_error'));
      setPassError(true);
    }
    setChangingPass(false);
  };

  const handleExportData = async() => {
    setExporting(true); setExportMsg('');
    try {
      const result = await requestDataExport({});
      setExportMsg(result.message || t('export_success'));
    } catch(e: any) {
      setExportMsg(t('export_error', { message: e.message || t('export_retry') }));
    }
    setExporting(false);
  };

  const handleMigration = async () => {
    if (!sourceParishId) return;
    // Find the user's primary parish (first coordinator parish)
    const coordinatorParish = userParishes.find((p: any) =>
      p._count?.memberships > 0
    );
    if (!coordinatorParish) {
      setMigrationMsg(t('not_coordinator'));
      setMigrationError(true);
      return;
    }
    if (sourceParishId === coordinatorParish.id) {
      setMigrationMsg(t('different_parishes'));
      setMigrationError(true);
      return;
    }

    setMigrating(true); setMigrationMsg(''); setMigrationError(false);
    try {
      const result = await executeParishMigration({
        sourceParishId,
        targetParishId: coordinatorParish.id,
      });
      setMigrationMsg(t('migration_success', { classes: result.migrated.classes, households: result.migrated.households, members: result.migrated.members }));
      setMigrationError(false);
      setSourceParishId('');
    } catch (e: any) {
      setMigrationMsg(e.message || t('migration_error'));
      setMigrationError(true);
    }
    setMigrating(false);
  };

  return(
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-6">
        <PageHeader title={t('title')} subtitle={`${user?.email || ''} ${userRole ? tc(`roles.${userRole}`) || userRole : ''}`} />

        {/* Parish info */}
        {ctxParishName&&(
          <div className="rounded-xl border bg-card p-4 flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary"><Church className="h-5 w-5"/></div>
            <div><p className="text-xs text-muted-foreground uppercase">{t('linked_parish')}</p><p className="font-medium">{ctxParishName}</p></div>
          </div>
        )}

        {/* Profile */}
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <h3 className="font-semibold flex items-center gap-2"><User className="h-4 w-4"/>{t('profile')}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label htmlFor="firstName">{t('first_name')}</Label><Input id="firstName" value={firstName} onChange={e=>setFirstName(e.target.value)} placeholder={t('first_name_placeholder')}/></div>
            <div className="space-y-1.5"><Label htmlFor="lastName">{t('last_name')}</Label><Input id="lastName" value={lastName} onChange={e=>setLastName(e.target.value)} placeholder={t('last_name_placeholder')}/></div>
          </div>
          <div className="space-y-1.5"><Label htmlFor="phone">{t('phone')}</Label><PhoneMaskInput value={phone} onChange={setPhone} className="flex h-9 w-full" placeholder={t('phone_placeholder')}/></div>
          {saveError && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3"/>{saveError}</p>}
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSaveProfile} disabled={saving}><Save className="mr-1 h-3 w-3"/>{saving ? t('saving') : tc('save')}</Button>
            {saved&&<span className="text-xs text-success flex items-center gap-1 self-center"><CheckCircle className="h-3 w-3"/>{t('saved')}</span>}
          </div>
        </div>

        {/* Password */}
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <h3 className="font-semibold flex items-center gap-2"><Key className="h-4 w-4"/>{t('change_password')}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label htmlFor="currentPass">{t('current_password')}</Label><Input id="currentPass" type="password" value={currentPass} onChange={e=>setCurrentPass(e.target.value)} placeholder={t('current_password_placeholder')}/></div>
            <div className="space-y-1.5"><Label htmlFor="newPass">{t('new_password')}</Label><Input id="newPass" type="password" value={newPass} onChange={e=>setNewPass(e.target.value)} placeholder={t('new_password_placeholder')}/></div>
          </div>
          {passMsg && <p className={`text-xs flex items-center gap-1 ${passError?'text-destructive':'text-success'}`}>{passError?<AlertCircle className="h-3 w-3"/>:<CheckCircle className="h-3 w-3"/>}{passMsg}</p>}
          <Button size="sm" onClick={handleChangePassword} disabled={changingPass || !currentPass || !newPass}><Key className="mr-1 h-3 w-3"/>{changingPass ? t('changing_password') : t('change_password_btn')}</Button>
        </div>

        {/* Two-Factor Authentication */}
        <TwoFactorSetup />

        {/* Data export */}
        <div className="rounded-xl border bg-card p-4">
          <h3 className="font-semibold text-sm flex items-center gap-2 mb-1"><Download className="h-4 w-4"/>{t('export_data')}</h3>
          <p className="text-xs text-muted-foreground mb-3">{t('export_desc')}</p>
          {exportMsg && <p className={`text-xs mb-3 ${exportMsg.includes('Erro') ? 'text-destructive' : 'text-success'}`}>{exportMsg}</p>}
          <Button size="sm" variant="outline" onClick={handleExportData} disabled={exporting}><Download className="mr-1 h-3 w-3"/>{exporting ? t('export_requesting') : t('export_request')}</Button>
        </div>

        {/* Migration — only for coordinators */}
        {userRole === 'PARISH_COORDINATOR' && (
          <div className="rounded-xl border bg-card p-6 space-y-4">
            <h3 className="font-semibold flex items-center gap-2"><GitMerge className="h-4 w-4"/>{t('migration')}</h3>
            <p className="text-xs text-muted-foreground">{t('migration_desc')}</p>
            <div>
              <label className="text-xs font-medium">{t('source_parish')}</label>
              <select
                value={sourceParishId}
                onChange={e => setSourceParishId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm mt-1"
              >
                <option value="">{t('select_parish')}</option>
                {userParishes
                  .filter((p: any) => p.active)
                  .map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name}{p.city ? ` — ${p.city}/${p.state}` : ''}</option>
                  ))}
              </select>
            </div>
            {migrationMsg && (
              <p className={`text-xs flex items-center gap-1 ${migrationError ? 'text-destructive' : 'text-success'}`}>
                {migrationError ? <AlertCircle className="h-3 w-3"/> : <CheckCircle className="h-3 w-3"/>}
                {migrationMsg}
              </p>
            )}
            <Button size="sm" variant="outline" onClick={handleMigration} disabled={migrating || !sourceParishId}>
              <RefreshCw className={`mr-1 h-3 w-3 ${migrating ? 'animate-spin' : ''}`}/>
              {migrating ? t('migrating') : t('migrate_data')}
            </Button>
          </div>
        )}

        {/* Privacy notice */}
        <div className="rounded-xl border bg-card p-4 flex items-center gap-3"> 
          <div className="rounded-lg bg-purple-50 dark:bg-purple-950/30 p-2 text-purple-600 dark:text-purple-400"><Shield className="h-5 w-5"/></div>
          <p className="text-xs text-muted-foreground">{t('privacy_notice')}</p>
        </div>
      </div>
    </AppShell>
  );
}
