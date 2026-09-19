import { useRouter } from 'expo-router';
import React from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { useMutation } from '../../../src/hooks/useMutation';
import { asClassList } from '../../../src/screens/ClassesScreen';
import { InviteMemberScreen } from '../../../src/screens/TeamScreens';

export default function InviteRoute() {
  const { api, workspaceId } = useAuth();
  const router = useRouter();
  const team = useAsync(() => (workspaceId ? api.team(workspaceId) : Promise.resolve(null)), [workspaceId]);
  const communities = useAsync(() => api.communities(workspaceId || undefined), [workspaceId]);
  const classes = useAsync(() => api.classes(workspaceId || undefined), [workspaceId]);
  const invite = useMutation(
    (values: { email: string; role: string; communityId?: string; classId?: string; classAssignmentRole?: 'LEAD' | 'ASSISTANT' }) => api.inviteMember({ ...values, workspaceId: String(workspaceId) }),
    { successMessage: 'Convite enviado.', onSuccess: () => router.back() },
  );

  return (
    <InviteMemberScreen
      assignableRoles={team.data?.permissions?.assignableRoles ?? ['LEAD_CATECHIST', 'ASSISTANT_CATECHIST', 'GUARDIAN']}
      communities={Array.isArray(communities.data) ? communities.data : communities.data?.items ?? []}
      classes={asClassList(classes.data).map((item) => ({ id: item.id, name: item.name || 'Turma' }))}
      busy={invite.busy}
      error={invite.error}
      onSubmit={(values) => void invite.run(values)}
    />
  );
}
