import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useAuth, usePermissions } from '../../../src/auth/AuthContext';
import { useFeedback } from '../../../src/components/Feedback';
import { useAsync } from '../../../src/hooks/useAsync';
import { AnnouncementsScreen } from '../../../src/screens/AnnouncementsScreen';

export default function AnnouncementsRoute() {
  const { api, workspaceId } = useAuth();
  const permissions = usePermissions();
  const router = useRouter();
  const { notify } = useFeedback();
  const { data, loading, error, reload, refreshing } = useAsync(() => api.announcements(workspaceId || undefined), [workspaceId]);
  const [busyId, setBusyId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  return (
    <AnnouncementsScreen
      items={Array.isArray(data) ? data : data?.items ?? []}
      loading={loading}
      error={error}
      refreshing={refreshing}
      onRefresh={() => void reload()}
      busyId={busyId}
      onCreate={permissions.canManageTeam ? () => router.push('/(app)/announcements/new') : undefined}
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
