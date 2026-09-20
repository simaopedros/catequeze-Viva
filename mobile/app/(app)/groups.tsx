import React, { useState } from 'react';
import { useAuth } from '../../src/auth/AuthContext';
import { useFeedback } from '../../src/components/Feedback';
import { useAsync } from '../../src/hooks/useAsync';
import { GroupsScreen } from '../../src/screens/SecondaryScreens';

export default function GroupsRoute() {
  const { api } = useAuth();
  const { notify } = useFeedback();
  const { data, loading, error, reload, refreshing } = useAsync(() => api.pastoralGroups(), []);
  const [busyId, setBusyId] = useState<string | null>(null);

  const run = async (groupId: string, action: () => Promise<unknown>, success: string) => {
    setBusyId(groupId);
    try {
      await action();
      notify(success, 'success');
      await reload();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Não foi possível atualizar o grupo.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <GroupsScreen
      items={Array.isArray(data) ? data : data?.items ?? []}
      loading={loading}
      error={error}
      refreshing={refreshing}
      onRefresh={() => void reload()}
      busyId={busyId}
      onJoin={(groupId) => void run(groupId, () => api.joinPastoralGroup(groupId), 'Pedido enviado.')}
      onLeave={(groupId) => void run(groupId, () => api.leavePastoralGroup(groupId), 'Saiu do grupo.')}
    />
  );
}
