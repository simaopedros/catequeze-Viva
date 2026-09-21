import { useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { asList } from '../../../src/format';
import { AnnouncementDetailScreen } from '../../../src/screens/AnnouncementsScreen';

export default function AnnouncementRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api, workspaceId } = useAuth();
  const { data, loading, error, reload } = useAsync(() => api.announcements(workspaceId || undefined), [workspaceId]);
  const [busy, setBusy] = useState(false);
  const item = asList(data).find((row) => row.id === id);

  return (
    <AnnouncementDetailScreen
      item={item}
      loading={loading}
      error={error}
      busy={busy}
      onAcknowledge={async () => {
        setBusy(true);
        try {
          await api.acknowledgeAnnouncement(String(id));
          await reload();
        } catch (err) {
          Alert.alert('Comunicado', err instanceof Error ? err.message : 'Não foi possível confirmar.');
        } finally {
          setBusy(false);
        }
      }}
    />
  );
}
