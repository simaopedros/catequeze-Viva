import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from 'wasp/client/auth';
import { Button } from '../../client/components/ui/button';
import { Input } from '../../client/components/ui/input';
import { Badge } from '../../client/components/ui/badge';
import { User, Globe, Bell, Shield, Save, Key, Download, Church, CheckCircle, AlertCircle, GitMerge, RefreshCw } from 'lucide-react';
import { ROLE_LABELS } from '../../shared/constants';
import { AppShell } from '../AppShell';
import { PageHeader } from '../../client/components/PageHeader';
import { useUserContext } from '../../client/hooks/useUserContext';
import { updateUserProfile, requestDataExport, changePassword, useQuery, listParishes, executeParishMigration } from 'wasp/client/operations';
import PhoneMaskInput from '../../client/components/PhoneMaskInput';
import TwoFactorSetup from '../components/TwoFactorSetup';
import { changePasswordSchema, type ChangePasswordValues } from '../../client/validation/schemas';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../../client/components/ui/form';

export default function SettingsPage() {
  const { t } = useTranslation('settings');
  const { t: tc } = useTranslation('common');
  const { data: user } = useAuth();
  const { userRole, parishName: ctxParishName } = useUserContext();
  const [saving,setSaving]=useState(false); const [saved,setSaved]=useState(false);
  const [saveError,setSaveError]=useState('');
  // Export
  const [exporting,setExporting]=useState(false); const [exportMsg,setExportMsg]=useState('');
  // Migration
  const [migrating, setMigrating] = useState(false);
  const [migrationMsg, setMigrationMsg] = useState('');
  const [migrationError, setMigrationError] = useState(false);
  const [sourceParishId, setSourceParishId] = useState('');
  const { data: userParishes = [] } = useQuery(listParishes);

  // Profile form (manual since it uses PhoneMaskInput which doesn't support ref)
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(()=>{
    setFirstName(user?.firstName||''); setLastName(user?.lastName||''); setPhone(user?.phone||'');
  },[user]);

  // Password form with Zod
  const passwordForm = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '' },
  });

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

  const handleChangePassword = async(values: ChangePasswordValues)=>{
    try{
      await changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword });
      passwordForm.reset();
      passwordForm.setError('root', { message: t('password_changed') });
    }catch(e: any){
      passwordForm.setError('root', { message: e.message || t('password_change_error') });
    }
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
            <div className="space-y-1.5"><label htmlFor="firstName" className="text-sm font-medium">{t('first_name')}</label><Input id="firstName" value={firstName} onChange={e=>setFirstName(e.target.value)} placeholder={t('first_name_placeholder')}/></div>
            <div className="space-y-1.5"><label htmlFor="lastName" className="text-sm font-medium">{t('last_name')}</label><Input id="lastName" value={lastName} onChange={e=>setLastName(e.target.value)} placeholder={t('last_name_placeholder')}/></div>
          </div>
          <div className="space-y-1.5"><label htmlFor="phone" className="text-sm font-medium">{t('phone')}</label><PhoneMaskInput value={phone} onChange={setPhone} className="flex h-9 w-full" placeholder={t('phone_placeholder')}/></div>
          {saveError && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3"/>{saveError}</p>}
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSaveProfile} disabled={saving}><Save className="mr-1 h-3 w-3"/>{saving ? t('saving') : tc('save')}</Button>
            {saved&&<span className="text-xs text-success flex items-center gap-1 self-center"><CheckCircle className="h-3 w-3"/>{t('saved')}</span>}
          </div>
        </div>

        {/* Password */}
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <h3 className="font-semibold flex items-center gap-2"><Key className="h-4 w-4"/>{t('change_password')}</h3>
          {passwordForm.formState.errors.root && (
            <p className={`text-xs flex items-center gap-1 ${passwordForm.formState.errors.root.message === t('password_changed') ? 'text-success' : 'text-destructive'}`}>
              {passwordForm.formState.errors.root.message === t('password_changed') ? <CheckCircle className="h-3 w-3"/> : <AlertCircle className="h-3 w-3"/>}
              {passwordForm.formState.errors.root.message}
            </p>
          )}
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(handleChangePassword)} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  control={passwordForm.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('current_password')}</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder={t('current_password_placeholder')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={passwordForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('new_password')}</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder={t('new_password_placeholder')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Button type="submit" size="sm" disabled={passwordForm.formState.isSubmitting}>
                <Key className="mr-1 h-3 w-3"/>{passwordForm.formState.isSubmitting ? t('changing_password') : t('change_password_btn')}
              </Button>
            </form>
          </Form>
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
              <label htmlFor="source-parish" className="text-xs font-medium">{t('source_parish')}</label>
              <select
                id="source-parish"
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
