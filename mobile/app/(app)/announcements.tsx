import React, { useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth, workspaceNavContext } from '../../src/auth/AuthContext';
import { useAsync } from '../../src/hooks/useAsync';
import { asItems } from '../../src/lib/payload';
import { canManagePastoral } from '../../src/lib/roleAccess';
import { appRoutes } from '../../src/navigation/routes';
import { AnnouncementsScreen } from '../../src/screens/AnnouncementsScreen';

export default function AnnouncementsRoute() {
  const { api, workspaceId, bootstrap } = useAuth();
  const router = useRouter();
  const nav = workspaceNavContext(bootstrap, workspaceId);
  const { data, loading, error, reload } = useAsync(
    () => api.announcements(workspaceId || undefined),
    [workspaceId],
  );
  const [busyId, setBusyId] = useState<string | null>(null);

  return (
    <AnnouncementsScreen
      items={asItems(data)}
      loading={loading}
      error={error}
      busyId={busyId}
      canWrite={canManagePastoral(nav.role, nav.isAdmin)}
      onCreate={() => router.push(appRoutes.form('announcement'))}
      onAck={async (id) => {
        try {
          setBusyId(id);
          await api.acknowledgeAnnouncement(id);
          await reload();
        } catch (err) {
          Alert.alert('Não foi possível confirmar', err instanceof Error ? err.message : '');
        } finally {
          setBusyId(null);
        }
      }}
    />
  );
}
