import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { ConfirmDialog } from '../../../src/components/ui';
import { useAsync } from '../../../src/hooks/useAsync';
import { useMutation } from '../../../src/hooks/useMutation';
import { TeamScreen, type TeamMember } from '../../../src/screens/TeamScreens';

export default function TeamRoute() {
  const { api, workspaceId } = useAuth();
  const router = useRouter();
  const team = useAsync(() => (workspaceId ? api.team(workspaceId) : Promise.resolve(null)), [workspaceId]);
  const [pendingRemove, setPendingRemove] = useState<TeamMember | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      void team.reload();
    }, [team.reload]),
  );

  const changeRole = useMutation((input: { member: TeamMember; role: string }) => api.updateMemberRole(input.member.id, input.role), {
    successMessage: 'Papel atualizado.',
    onSuccess: () => void team.reload(),
  });
  const remove = useMutation((member: TeamMember) => api.removeMember(member.id), { successMessage: 'Membro removido.', onSuccess: () => void team.reload() });
  const resend = useMutation((invite: any) => api.resendInvite(invite.kind === 'pending' ? { pendingInvitationId: invite.id } : { membershipId: invite.id }), {
    successMessage: 'Convite reenviado.',
  });
  const cancel = useMutation((invite: any) => api.cancelInvite(invite.kind === 'pending' ? { pendingInvitationId: invite.id } : { membershipId: invite.id }), {
    successMessage: 'Convite cancelado.',
    onSuccess: () => void team.reload(),
  });
  const message = useMutation((member: TeamMember) => api.createConversation({ workspaceId: String(workspaceId), participantUserIds: [member.userId], type: 'DIRECT' }), {
    onSuccess: (conversation: any) => router.push(`/(app)/messages/${conversation.id}`),
  });

  return (
    <>
      <TeamScreen
        members={team.data?.members ?? []}
        invitations={team.data?.invitations ?? []}
        permissions={team.data?.permissions}
        loading={team.loading}
        error={team.error}
        refreshing={team.refreshing}
        onRefresh={() => void team.reload()}
        busyId={busyId}
        onInvite={() => router.push('/(app)/team/invite')}
        onMessage={(member) => void message.run(member)}
        onChangeRole={async (member, role) => {
          setBusyId(member.id);
          await changeRole.run({ member, role });
          setBusyId(null);
        }}
        onRemove={(member) => setPendingRemove(member)}
        onResendInvite={(invite) => void resend.run(invite)}
        onCancelInvite={(invite) => void cancel.run(invite)}
      />
      <ConfirmDialog
        visible={Boolean(pendingRemove)}
        title="Remover membro"
        body={pendingRemove ? `${pendingRemove.user.firstName ?? ''} ${pendingRemove.user.lastName ?? ''} deixa de ter acesso a esta paróquia.` : undefined}
        confirmLabel="Remover"
        destructive
        loading={remove.busy}
        onCancel={() => setPendingRemove(null)}
        onConfirm={async () => {
          if (pendingRemove) await remove.run(pendingRemove);
          setPendingRemove(null);
        }}
      />
    </>
  );
}
