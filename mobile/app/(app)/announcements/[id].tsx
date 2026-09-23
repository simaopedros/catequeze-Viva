import { useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { AnnouncementDetailScreen } from '../../../src/screens/ContentScreens';

export default function AnnouncementDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api, workspaceId } = useAuth();
  const [busy, setBusy] = useState(false);
  const { data, loading, error, reload } = useAsync(
    () => api.announcementDetails(String(id), workspaceId || undefined),
    [id, workspaceId],
  );

  return (
    <AnnouncementDetailScreen
      item={data}
      loading={loading}
      error={error}
      busy={busy}
      onAcknowledge={async () => {
        setBusy(true);
        try {
          await api.acknowledgeAnnouncement(String(id));
          await reload();
        } finally {
          setBusy(false);
        }
      }}
    />
  );
}
