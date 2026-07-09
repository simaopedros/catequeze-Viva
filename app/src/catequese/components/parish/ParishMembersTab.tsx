import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../client/components/ui/button';
import { Badge } from '../../../client/components/ui/badge';
import { ConfirmDialog } from '../../../client/components/ConfirmDialog';
import { Users, UserPlus, Mail, Trash2 } from 'lucide-react';
import { useRoleLabels, useMembershipStatusLabels } from '../../../i18n/useLabels';

const INVITE_ROLE_KEYS = [
  'PARISH_COORDINATOR',
  'COMMUNITY_COORDINATOR',
  'LEAD_CATECHIST',
  'ASSISTANT_CATECHIST',
  'GUARDIAN',
  'CATECHUMEN',
  'CONTENT_REVIEWER',
  'PASTORAL_VIEWER',
] as const;

interface ParishMembersTabProps {
  members: any[];
  communities: any[];
  households: any[];
  onInvite: (email: string, role: string, communityId: string, householdId: string) => Promise<{ msg: string; isError: boolean }>;
  onRemove: (membershipId: string) => Promise<void>;
}

export function ParishMembersTab({ members, communities, households, onInvite, onRemove }: ParishMembersTabProps) {
  const { t } = useTranslation('common');
  const { t: tp } = useTranslation('parishes');
  const roleLabels = useRoleLabels();
  const statusLabels = useMembershipStatusLabels();
  const inviteRoles = useMemo(
    () => INVITE_ROLE_KEYS.map((value) => ({ value, label: roleLabels[value] })),
    [roleLabels],
  );
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('GUARDIAN');
  const [inviteCommunityId, setInviteCommunityId] = useState('');
  const [inviteHouseholdId, setInviteHouseholdId] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState('');
  const [inviteMsgIsError, setInviteMsgIsError] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);

  const handleInvite = async () => {
    if (!inviteEmail) return;
    setInviting(true);
    setInviteMsg('');
    setInviteMsgIsError(false);
    try {
      const result = await onInvite(inviteEmail, inviteRole, inviteCommunityId, inviteHouseholdId);
      setInviteMsg(result.msg || tp('invite_sent'));
      setInviteMsgIsError(result.isError);
      if (!result.isError) {
        setInviteEmail('');
        setInviteCommunityId('');
        setInviteHouseholdId('');
        setShowInvite(false);
      }
    } catch (e: any) {
      setInviteMsg(e.message || t('error_invite'));
      setInviteMsgIsError(true);
    }
    setInviting(false);
  };

  const handleRemove = async () => {
    if (!removeTarget) return;
    try {
      await onRemove(removeTarget);
    } catch (e: any) {
      // error handled by parent
    }
    setRemoveTarget(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{tp('members_count_short', { count: members.length })}</p>
        <Button size="sm" onClick={() => setShowInvite(!showInvite)}><UserPlus className="mr-1 h-4 w-4" />{tp('invite')}</Button>
      </div>

      {showInvite && (
        <div className="rounded-sm border border-border/70 bg-white p-4 space-y-3">
          <h3 className="font-medium text-sm">{tp('invite_member')}</h3>
          <div className="flex flex-wrap gap-3">
            <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} className="flex-1 min-w-[200px] h-9 rounded-sm border border-input bg-background px-3 text-sm" placeholder={t('families.email_placeholder')} type="email" />
            <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} className="h-9 rounded-sm border border-input bg-background px-3 text-sm">
              {inviteRoles.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            <select value={inviteCommunityId} onChange={e => setInviteCommunityId(e.target.value)} className="h-9 rounded-sm border border-input bg-background px-3 text-sm">
              <option value="">{tp('all_parish')}</option>
              {communities.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {(inviteRole === 'GUARDIAN' || inviteRole === 'CATECHUMEN') && (
              <select value={inviteHouseholdId} onChange={e => setInviteHouseholdId(e.target.value)} className="h-9 rounded-sm border border-input bg-background px-3 text-sm min-w-[180px]">
                <option value="">{tp('no_family_later')}</option>
                {households.map((h: any) => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
            )}
            <Button size="sm" onClick={handleInvite} disabled={inviting || !inviteEmail}>
              <Mail className="mr-1 h-3 w-3" />{inviting ? '...' : tp('send')}
            </Button>
          </div>
          {inviteMsg && (
            <p className={'text-xs ' + (inviteMsgIsError ? 'text-destructive' : 'text-green-600')}>{inviteMsg}</p>
          )}
        </div>
      )}

      {members.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-sm border border-border/70 bg-white p-12 text-center">
          <div className="mb-4 rounded-sm border border-border/70 bg-muted/30 p-3"><Users className="h-8 w-8 text-foreground" /></div>
          <h3 className="text-lg font-semibold">{tp('no_members')}</h3>
          <p className="text-sm text-muted-foreground">{tp('no_members_desc')}</p>
        </div>
      ) : (
        <div className="rounded-sm border border-border/70 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium">{tp('name')}</th>
                <th className="text-left px-4 py-3 font-medium">{tp('email')}</th>
                <th className="text-left px-4 py-3 font-medium">{tp('communities')}</th>
                <th className="text-left px-4 py-3 font-medium">{tp('role')}</th>
                <th className="text-left px-4 py-3 font-medium">{tp('status')}</th>
                <th className="text-right px-4 py-3 font-medium">{tp('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m: any) => {
                const status = statusLabels[m.status as keyof typeof statusLabels] || statusLabels.INACTIVE;
                return (
                  <tr key={m.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">{m.user?.firstName || m.user?.email?.split('@')[0] || '\u2014'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{m.user?.email || '\u2014'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{m.community?.name || '\u2014'}</td>
                    <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{roleLabels[m.role as keyof typeof roleLabels] || m.role}</Badge></td>
                    <td className="px-4 py-3"><span className={'inline-flex items-center rounded-sm border border-border/70 px-2 py-0.5 text-xs font-medium ' + status.color}>{status.label}</span></td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setRemoveTarget(m.id)} className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="h-4 w-4" /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={(open) => { if (!open) setRemoveTarget(null); }}
        title={tp('member_remove_title')}
        description={t('remove_confirm')}
        confirmLabel={t('remove')}
        variant="destructive"
        onConfirm={handleRemove}
      />
    </div>
  );
}
