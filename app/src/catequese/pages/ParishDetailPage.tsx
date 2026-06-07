import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { AppShell } from '../AppShell';
import { Button } from '../../client/components/ui/button';
import {
  Church, MapPin, Users, BookOpen, Building2, Settings,
  ArrowLeft, Loader2, AlertCircle, Trash2,
} from 'lucide-react';
import { useQuery, getParishById, listCommunities, listParishMembers, updateParish, deleteParish, createCommunity, updateCommunity, inviteUserToParish, removeMembership } from 'wasp/client/operations';
import { ParishInfoTab } from '../components/parish/ParishInfoTab';
import { ParishCommunitiesTab } from '../components/parish/ParishCommunitiesTab';
import { ParishMembersTab } from '../components/parish/ParishMembersTab';
import { ConfirmDialog } from '../../client/components/ConfirmDialog';
import { toast } from '../../client/hooks/use-toast';

type Tab = 'info' | 'communities' | 'members';

export default function ParishDetailPage() {
  const { id: parishId } = useParams<{ id: string }>();
  const pid = parishId ?? '';
  const navigate = useNavigate();

  const { data: parish, isLoading: loading } = useQuery(getParishById, { id: parishId! });
  const { data: communities = [] } = useQuery(listCommunities, { parishId: parishId! });
  const { data: members = [] } = useQuery(listParishMembers, { parishId: parishId! });
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('info');

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editState, setEditState] = useState('');
  const [saving, setSaving] = useState(false);

  // Delete (archive) state
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const startEditing = () => {
    if (!parish) return;
    setEditName(parish.name || '');
    setEditCity(parish.city || '');
    setEditState(parish.state || '');
    setEditing(true);
  };

  const handleSave = async () => {
    if (!editName.trim()) return;
    setSaving(true);
    setError('');
    try {
      await updateParish({ id: parishId!, name: editName, city: editCity || undefined, state: editState || undefined });
      setEditing(false);
      toast({ title: 'Paróquia atualizada.' });
    } catch (e: any) {
      setError(e.message || 'Erro ao salvar.');
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteParish({ id: pid, confirmation: 'DELETAR' });
      toast({ title: 'Paróquia removida.', description: 'Os dados foram arquivados e podem ser restaurados por um administrador.' });
      navigate('/app/parishes');
    } catch (e: any) {
      toast({ title: 'Erro ao remover', description: e.message || 'Tente novamente.', variant: 'destructive' });
      setDeleting(false);
      setShowDelete(false);
    }
  };

  const handleCreateCommunity = async (name: string, type: string, location: string) => {
    try {
      await createCommunity({ name, parishId: parishId || '', type: type || undefined, location: location || undefined });
      toast({ title: 'Comunidade criada.' });
    } catch (e: any) {
      toast({ title: 'Erro ao criar comunidade', description: e.message || 'Tente novamente.', variant: 'destructive' });
    }
  };

  const handleUpdateCommunity = async (id: string, fields: any) => {
    try {
      await updateCommunity({ id, ...fields });
      toast({ title: 'Comunidade atualizada.' });
    } catch (e: any) {
      toast({ title: 'Erro ao atualizar', description: e.message || 'Tente novamente.', variant: 'destructive' });
    }
  };

  const handleInvite = async (email: string, role: string, communityId: string) => {
    try {
      await inviteUserToParish({ email, parishId: pid, role, communityId: communityId || undefined });
      toast({ title: 'Convite enviado.' });
      return 'Convite enviado!';
    } catch (e: any) {
      toast({ title: 'Erro ao enviar convite', description: e.message || 'Tente novamente.', variant: 'destructive' });
      return 'Erro ao enviar convite.';
    }
  };

  const handleRemoveMember = async (membershipId: string) => {
    try {
      await removeMembership({ membershipId });
      toast({ title: 'Membro removido.' });
    } catch (e: any) {
      toast({ title: 'Erro ao remover membro', description: e.message || 'Tente novamente.', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </AppShell>
    );
  }

  if (!parish && !loading) {
    return (
      <AppShell>
        <div className="flex flex-col items-center py-20 gap-2">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <p className="text-destructive">{error || 'Paróquia não encontrada.'}</p>
          <Button variant="ghost" onClick={() => navigate('/app/parishes')}><ArrowLeft className="mr-1 h-4 w-4" />Voltar</Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <button onClick={() => navigate('/app/parishes')} className="hover:text-foreground transition-colors">Paróquias</button>
          <span>/</span>
          <span className="text-foreground font-medium truncate">{parish?.name}</span>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-3"><Church className="h-6 w-6 text-primary" /></div>
            <div>
              <h1 className="text-2xl font-bold">{parish?.name}</h1>
              {(parish?.city || parish?.state) && (
                <p className="text-muted-foreground text-sm flex items-center gap-1"><MapPin className="h-3 w-3" />{[parish.city, parish.state].filter(Boolean).join(', ')}</p>
              )}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/app/parishes')}><ArrowLeft className="mr-1 h-4 w-4" />Voltar</Button>
        </div>

        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive flex items-center gap-2"><AlertCircle className="h-4 w-4" />{error}</div>
        )}

        <div className="flex border-b gap-0">
          {([
            { id: 'info', label: 'Dados', icon: Settings },
            { id: 'communities', label: 'Comunidades', icon: Building2 },
            { id: 'members', label: 'Membros', icon: Users },
          ] as { id: Tab; label: string; icon: any }[]).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ' +
                (tab === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}
            >
              <t.icon className="h-4 w-4" />{t.label}
            </button>
          ))}
        </div>

        {tab === 'info' && (
          <>
            <ParishInfoTab
              parish={parish}
              editing={editing}
              editName={editName} setEditName={setEditName}
              editCity={editCity} setEditCity={setEditCity}
              editState={editState} setEditState={setEditState}
              saving={saving}
              onSave={handleSave}
              onCancel={() => setEditing(false)}
              onStartEdit={startEditing}
            />

            {parish?.type !== 'PERSONAL' && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <h3 className="font-semibold text-destructive">Zona de perigo</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Remover a paróquia a oculta da sua lista de espaços e do seletor de workspaces.
                  Os dados são arquivados (não apagados) e podem ser restaurados por um administrador.
                </p>
                <Button variant="destructive" size="sm" onClick={() => setShowDelete(true)}>
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  Remover paróquia
                </Button>
              </div>
            )}
          </>
        )}

        {tab === 'communities' && (
          <ParishCommunitiesTab
            communities={communities}
            onCreate={handleCreateCommunity}
            onUpdate={handleUpdateCommunity}
          />
        )}

        {tab === 'members' && (
          <ParishMembersTab
            members={members}
            communities={communities}
            onInvite={handleInvite}
            onRemove={handleRemoveMember}
          />
        )}
      </div>

      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="Remover paróquia"
        description={`Tem certeza que deseja remover "${parish?.name}"? Ela será arquivada e ocultada das listagens. Os dados são preservados e a ação pode ser revertida por um administrador.`}
        confirmLabel="Remover"
        variant="destructive"
        confirmPhrase="DELETAR"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </AppShell>
  );
}
