import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Button } from '../../client/components/ui/button';
import { Badge } from '../../client/components/ui/badge';
import { Users, UserPlus, Trash2, Mail, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { ROLE_LABELS, STATUS_LABELS } from '../../shared/constants';
import { ConfirmDialog } from '../../client/components/ConfirmDialog';
import { AppShell } from '../AppShell';
import { useQuery, listParishMembers, listCommunities, inviteUserToParish, removeMembership, updateMembershipRole } from 'wasp/client/operations';
import { useUserContext } from '../../client/hooks/useUserContext';

export default function ParishMembersPage() {
  const { id: parishId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin, userRole } = useUserContext();
  const canManageRoles = isAdmin || userRole === 'SUPER_ADMIN' || userRole === 'DIOCESE_ADMIN' || userRole === 'PARISH_COORDINATOR';
  const { data: members = [], isLoading: loading } = useQuery(listParishMembers, { parishId: parishId! });
  const { data: communities = [] } = useQuery(listCommunities, { parishId: parishId! });
  const [error, setError] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('GUARDIAN');
  const [inviteCommunityId, setInviteCommunityId] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState('');
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);

  const handleInvite = async () => {
    if (!inviteEmail) return;
    setInviting(true);
    setInviteMsg('');
    try {
      await inviteUserToParish({
        email: inviteEmail,
        parishId: parishId || '',
        role: inviteRole,
        communityId: inviteCommunityId || undefined,
      });
      setInviteMsg('Convite enviado!');
      setInviteEmail('');
      setInviteCommunityId('');
      setShowInvite(false);
    } catch (e: any) {
      setInviteMsg(e.message || 'Erro ao convidar.');
    }
    setInviting(false);
  };

  const handleRemove = async (membershipId: string) => {
    setRemoveTarget(membershipId);
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground"> 
          <button onClick={() => navigate('/app/parishes')} className="hover:text-foreground transition-colors">Paróquias</button>
          <span>/</span>
          <button onClick={() => navigate('/app/parishes/' + parishId)} className="hover:text-foreground transition-colors">Detalhes</button>
          <span>/</span>
          <span className="text-foreground font-medium">Membros</span>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Membros da Paróquia</h1>
            <p className="text-muted-foreground text-sm">{members.length} membros</p>
          </div>
          <Button size="sm" onClick={() => setShowInvite(!showInvite)}>
            <UserPlus className="mr-1 h-4 w-4" />Convidar
          </Button>
        </div>

        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />{error}
          </div>
        )}

        {showInvite && (
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <h3 className="font-medium text-sm">Convidar novo membro</h3>       
            <div className="flex flex-wrap gap-3">
              <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} className="flex-1 min-w-[200px] h-9 rounded-md border border-input bg-background px-3 text-sm" placeholder="email@exemplo.com" type="email" />
              <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
                <option value="PARISH_COORDINATOR">Coordenador</option>
                <option value="COMMUNITY_COORDINATOR">Coord. Comunidade</option>
                <option value="LEAD_CATECHIST">Catequista Resp.</option>        
                <option value="ASSISTANT_CATECHIST">Catequista Aux.</option>    
                <option value="GUARDIAN">Responsável</option>
                <option value="CONTENT_REVIEWER">Revisor</option>
                <option value="PASTORAL_VIEWER">Pastoral</option>
              </select>
              <select value={inviteCommunityId} onChange={e => setInviteCommunityId(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
                <option value="">Toda a paróquia</option>
                {communities.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <Button size="sm" onClick={handleInvite} disabled={inviting || !inviteEmail}>
                <Mail className="mr-1 h-3 w-3" />{inviting ? '...' : 'Enviar'}  
              </Button>
            </div>
            {inviteMsg && (
              <p className={'text-xs ' + (inviteMsg.includes('Erro') ? 'text-destructive' : 'text-green-600')}>
                {inviteMsg}
              </p>
            )}
          </div>
        )}

        {members.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border bg-card p-12 text-center">
            <div className="mb-4 rounded-full bg-primary/10 p-3"><Users className="h-8 w-8 text-primary" /></div>
            <h3 className="text-lg font-semibold">Nenhum membro</h3>
            <p className="text-sm text-muted-foreground">Convide coordenadores, catequistas e responsáveis.</p>
          </div>
        ) : (
          <div className="rounded-xl border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Nome</th>     
                  <th className="text-left px-4 py-3 font-medium">Email</th>    
                  <th className="text-left px-4 py-3 font-medium">Comunidade</th>
                  <th className="text-left px-4 py-3 font-medium">Função</th>   
                  <th className="text-left px-4 py-3 font-medium">Status</th>   
                  <th className="text-right px-4 py-3 font-medium">Ações</th>   
                </tr>
              </thead>
              <tbody>
                {members.map((m: any) => {
                  const status = STATUS_LABELS[m.status] || STATUS_LABELS.INACTIVE;
                  return (
                    <tr key={m.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3">{m.user?.firstName || m.user?.email?.split('@')[0] || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{m.user?.email || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{m.community?.name || '—'}</td>
                      <td className="px-4 py-3">
                        {canManageRoles ? (
                          <select
                            value={m.role}
                            onChange={async (e) => {
                              try { await updateMembershipRole({ membershipId: m.id, role: e.target.value }); }
                              catch (err: any) { setError(err.message || 'Erro ao atualizar.'); }
                            }}
                            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                          >
                            {Object.entries(ROLE_LABELS).map(([key, label]) => (
                              <option key={key} value={key}>{label}</option>
                            ))}
                          </select>
                        ) : (
                          <Badge variant="outline" className="text-xs">{ROLE_LABELS[m.role] || m.role}</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ' + status.color}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => handleRemove(m.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={(open) => { if (!open) setRemoveTarget(null); }}
        title="Remover membro"
        description="Tem certeza que deseja remover este membro da paróquia? Esta ação não pode ser desfeita."
        confirmLabel="Remover"
        variant="destructive"
        onConfirm={async () => {
          if (removeTarget) {
            try {
              await removeMembership({ membershipId: removeTarget });
            } catch (e: any) {
              setError(e.message || 'Erro ao remover membro.');
            }
            setRemoveTarget(null);
          }
        }}
      />
    </AppShell>
  );
}
