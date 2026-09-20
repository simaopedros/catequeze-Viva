import React, { useState } from 'react';
import { useAuth } from '../../src/auth/AuthContext';
import { useFeedback } from '../../src/components/Feedback';
import { useAsync } from '../../src/hooks/useAsync';
import { FormationScreen } from '../../src/screens/SecondaryScreens';

export default function FormationRoute() {
  const { api, workspaceId } = useAuth();
  const { notify } = useFeedback();
  const { data, loading, error, reload, refreshing } = useAsync(() => api.formationTracks(workspaceId || undefined), [workspaceId]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const run = async (trackId: string, action: () => Promise<unknown>, success: string) => {
    setBusyId(trackId);
    try {
      await action();
      notify(success, 'success');
      await reload();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Não foi possível concluir a inscrição.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <FormationScreen
      items={Array.isArray(data) ? data : []}
      loading={loading}
      error={error}
      refreshing={refreshing}
      onRefresh={() => void reload()}
      busyId={busyId}
      onEnroll={(trackId) => void run(trackId, () => api.enrollInFormationTrack(trackId, workspaceId || undefined), 'Inscrição confirmada.')}
      onUnenroll={(trackId) => void run(trackId, () => api.unenrollFromFormationTrack(trackId, workspaceId || undefined), 'Inscrição cancelada.')}
    />
  );
}
