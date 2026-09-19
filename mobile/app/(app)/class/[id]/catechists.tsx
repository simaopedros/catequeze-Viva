import { useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { useAuth } from '../../../../src/auth/AuthContext';
import { useFeedback } from '../../../../src/components/Feedback';
import { useAsync } from '../../../../src/hooks/useAsync';
import { ClassCatechistsScreen } from '../../../../src/screens/PickerScreens';

export default function ClassCatechistsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api, workspaceId } = useAuth();
  const { notify } = useFeedback();
  const detail = useAsync(() => api.classDetails(String(id)), [id]);
  const members = useAsync(() => (workspaceId ? api.catechists(workspaceId) : Promise.resolve([])), [workspaceId]);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function run(userId: string, action: () => Promise<unknown>, message: string) {
    setBusyUserId(userId);
    setActionError(null);
    try {
      await action();
      notify(message, 'success');
      await detail.reload();
    } catch (err) {
      const text = err instanceof Error ? err.message : 'Não foi possível concluir a ação.';
      setActionError(text);
      notify(text, 'error');
    } finally {
      setBusyUserId(null);
    }
  }

  const list = Array.isArray(members.data) ? members.data : members.data?.items ?? [];
  const catechistMembers = list.filter((member: any) => ['LEAD_CATECHIST', 'ASSISTANT_CATECHIST', 'PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR'].includes(member.role));

  return (
    <ClassCatechistsScreen
      className={detail.data?.name}
      members={catechistMembers}
      assigned={(detail.data?.catechists ?? []).map((entry: any) => ({ userId: entry.userId || entry.user?.id, role: entry.role }))}
      loading={members.loading || detail.loading}
      error={members.error}
      busyUserId={busyUserId}
      actionError={actionError}
      onAdd={(userId) => run(userId, () => api.addClassCatechist(String(id), userId), 'Catequista adicionado.')}
      onRemove={(userId) => run(userId, () => api.removeClassCatechist(String(id), userId), 'Catequista removido.')}
    />
  );
}
