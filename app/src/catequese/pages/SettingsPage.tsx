import { useState, useEffect } from 'react';
import { useAuth } from 'wasp/client/auth';
import { Button } from '../../client/components/ui/button';
import { Badge } from '../../client/components/ui/badge';
import { User, Globe, Bell, Shield, Save, Key, Download, Church, CheckCircle, AlertCircle, GitMerge, RefreshCw } from 'lucide-react';
import { ROLE_LABELS } from '../../shared/constants';
import { AppShell } from '../AppShell';
import { useUserContext } from '../../client/hooks/useUserContext';
import { updateUserProfile, requestDataExport, changePassword, useQuery, listParishes, executeParishMigration } from 'wasp/client/operations';
import PhoneMaskInput from '../../client/components/PhoneMaskInput';
import TwoFactorSetup from '../components/TwoFactorSetup';

export default function SettingsPage() {
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
      setSaveError(e.message || 'Erro ao salvar perfil.');
    }
    setSaving(false);
  };

  const handleChangePassword = async()=>{
    if(!currentPass||!newPass){setPassMsg('Preencha todos os campos.');setPassError(true);return;}
    if(newPass.length < 8){setPassMsg('A nova senha deve ter pelo menos 8 caracteres.');setPassError(true);return;}

    setChangingPass(true);setPassMsg('');setPassError(false);
    try{
      await changePassword({ currentPassword: currentPass, newPassword: newPass });
      setPassMsg('Senha alterada com sucesso!');
      setPassError(false);
      setCurrentPass('');
      setNewPass('');
    }catch(e: any){
      setPassMsg(e.message || 'Erro ao alterar senha.');
      setPassError(true);
    }
    setChangingPass(false);
  };

  const handleExportData = async() => {
    setExporting(true); setExportMsg('');
    try {
      const result = await requestDataExport({});
      setExportMsg(result.message || 'Solicitação enviada com sucesso!');
    } catch(e: any) {
      setExportMsg('Erro ao solicitar exportação: ' + (e.message || 'Tente novamente.'));
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
      setMigrationMsg('Você não é coordenador de nenhuma paróquia.');
      setMigrationError(true);
      return;
    }
    if (sourceParishId === coordinatorParish.id) {
      setMigrationMsg('As paróquias de origem e destino devem ser diferentes.');
      setMigrationError(true);
      return;
    }

    setMigrating(true); setMigrationMsg(''); setMigrationError(false);
    try {
      const result = await executeParishMigration({
        sourceParishId,
        targetParishId: coordinatorParish.id,
      });
      setMigrationMsg(`Migração concluída! ${result.migrated.classes} turmas, ${result.migrated.households} famílias, ${result.migrated.members} membros transferidos.`);
      setMigrationError(false);
      setSourceParishId('');
    } catch (e: any) {
      setMigrationMsg(e.message || 'Erro ao executar migração.');
      setMigrationError(true);
    }
    setMigrating(false);
  };

  return(
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-6">
        <div><h1 className="text-2xl font-bold">Configurações</h1><p className="text-muted-foreground text-sm">{user?.email} {userRole&&<Badge className="ml-2">{ROLE_LABELS[userRole]||userRole}</Badge>}</p></div>

        {/* Parish info */}
        {ctxParishName&&(
          <div className="rounded-xl border bg-card p-4 flex items-center gap-3">
            <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-2 text-blue-600 dark:text-blue-400"><Church className="h-5 w-5"/></div>
            <div><p className="text-xs text-muted-foreground uppercase">Paróquia vinculada</p><p className="font-medium">{ctxParishName}</p></div>
          </div>
        )}

        {/* Profile */}
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <h3 className="font-semibold flex items-center gap-2"><User className="h-4 w-4"/>Perfil</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="text-xs font-medium">Nome</label><input value={firstName} onChange={e=>setFirstName(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm mt-1" placeholder="Seu nome"/></div>
            <div><label className="text-xs font-medium">Sobrenome</label><input value={lastName} onChange={e=>setLastName(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm mt-1" placeholder="Seu sobrenome"/></div>
          </div>
          <div><label className="text-xs font-medium">Telefone</label><PhoneMaskInput value={phone} onChange={setPhone} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm mt-1" placeholder="(11) 99999-9999"/></div>
          {saveError && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3"/>{saveError}</p>}
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSaveProfile} disabled={saving}><Save className="mr-1 h-3 w-3"/>{saving?'Salvando...':'Salvar'}</Button>
            {saved&&<span className="text-xs text-green-600 flex items-center gap-1 self-center"><CheckCircle className="h-3 w-3"/>Salvo!</span>}
          </div>
        </div>

        {/* Password */}
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <h3 className="font-semibold flex items-center gap-2"><Key className="h-4 w-4"/>Trocar senha</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="text-xs font-medium">Senha atual</label><input type="password" value={currentPass} onChange={e=>setCurrentPass(e.target.value)} placeholder="Digite a senha atual" className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm mt-1"/></div>
            <div><label className="text-xs font-medium">Nova senha</label><input type="password" value={newPass} onChange={e=>setNewPass(e.target.value)} placeholder="Mínimo 8 caracteres" className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm mt-1"/></div>
          </div>
          {passMsg && <p className={`text-xs flex items-center gap-1 ${passError?'text-destructive':'text-green-600'}`}>{passError?<AlertCircle className="h-3 w-3"/>:<CheckCircle className="h-3 w-3"/>}{passMsg}</p>}
          <Button size="sm" onClick={handleChangePassword} disabled={changingPass || !currentPass || !newPass}><Key className="mr-1 h-3 w-3"/>{changingPass?'Alterando...':'Alterar senha'}</Button>
        </div>

        {/* Two-Factor Authentication */}
        <TwoFactorSetup />

        {/* Data export */}
        <div className="rounded-xl border bg-card p-4">
          <h3 className="font-semibold text-sm flex items-center gap-2 mb-1"><Download className="h-4 w-4"/>Exportar dados</h3>
          <p className="text-xs text-muted-foreground mb-3">Conforme a LGPD, você pode solicitar a exportação dos seus dados.</p>
          {exportMsg && <p className={`text-xs mb-3 ${exportMsg.includes('Erro') ? 'text-destructive' : 'text-green-600'}`}>{exportMsg}</p>}
          <Button size="sm" variant="outline" onClick={handleExportData} disabled={exporting}><Download className="mr-1 h-3 w-3"/>{exporting?'Solicitando...':'Solicitar exportação'}</Button>
        </div>

        {/* Migration — only for coordinators */}
        {userRole === 'PARISH_COORDINATOR' && (
          <div className="rounded-xl border bg-card p-6 space-y-4">
            <h3 className="font-semibold flex items-center gap-2"><GitMerge className="h-4 w-4"/>Migração de Paróquia</h3>
            <p className="text-xs text-muted-foreground">
              Se um catequista criou uma paróquia independente e deseja migrar os dados para esta paróquia oficial, selecione a paróquia de origem abaixo.
            </p>
            <div>
              <label className="text-xs font-medium">Paróquia de origem</label>
              <select
                value={sourceParishId}
                onChange={e => setSourceParishId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm mt-1"
              >
                <option value="">Selecione uma paróquia...</option>
                {userParishes
                  .filter((p: any) => p.active)
                  .map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name}{p.city ? ` — ${p.city}/${p.state}` : ''}</option>
                  ))}
              </select>
            </div>
            {migrationMsg && (
              <p className={`text-xs flex items-center gap-1 ${migrationError ? 'text-destructive' : 'text-green-600'}`}>
                {migrationError ? <AlertCircle className="h-3 w-3"/> : <CheckCircle className="h-3 w-3"/>}
                {migrationMsg}
              </p>
            )}
            <Button size="sm" variant="outline" onClick={handleMigration} disabled={migrating || !sourceParishId}>
              <RefreshCw className={`mr-1 h-3 w-3 ${migrating ? 'animate-spin' : ''}`}/>
              {migrating ? 'Migrando...' : 'Migrar dados'}
            </Button>
          </div>
        )}

        {/* Privacy notice */}
        <div className="rounded-xl border bg-card p-4 flex items-center gap-3"> 
          <div className="rounded-lg bg-purple-50 dark:bg-purple-950/30 p-2 text-purple-600 dark:text-purple-400"><Shield className="h-5 w-5"/></div>
          <p className="text-xs text-muted-foreground">Seus dados são protegidos conforme a LGPD. Nenhum dado é compartilhado sem consentimento.</p>
        </div>
      </div>
    </AppShell>
  );
}
