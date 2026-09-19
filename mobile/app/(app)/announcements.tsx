import React, { useState } from 'react';
import { useAuth } from '../../src/auth/AuthContext';
import { useFeedback } from '../../src/components/Feedback';
import { useAsync } from '../../src/hooks/useAsync';
import { AnnouncementsScreen } from '../../src/screens/AnnouncementsScreen';

export default function AnnouncementsRoute() {
  const { api, workspaceId } = useAuth();
  const { notify } = useFeedback();
  const { data, loading, error, reload, refreshing } = useAsync(() => api.announcements(workspaceId || undefined), [workspaceId]);
  const [busyId, setBusyId] = useState<string | null>(null);

  return (
    <AnnouncementsScreen
      items={Array.isArray(data) ? data : data?.items ?? []}
      loading={loading}
      error={error}
      refreshing={refreshing}
      onRefresh={() => void reload()}
      busyId={busyId}
      onAcknowledge={async (id) => {
        setBusyId(id);
        try {
          await api.acknowledgeAnnouncement(id);
          notify('Aviso confirmado.', 'success');
          await reload();
        } catch (err) {
          notify(err instanceof Error ? err.message : 'Não foi possível confirmar.', 'error');
        } finally {
          setBusyId(null);
        }
      }}
    />
  );
}
