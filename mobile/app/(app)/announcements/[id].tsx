import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { asItems } from '../../../src/format';
import { useAsync } from '../../../src/hooks/useAsync';
import { AnnouncementDetailScreen } from '../../../src/screens/DetailScreens';

export default function AnnouncementDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api, workspaceId } = useAuth();
  const { data, reload } = useAsync(() => api.announcements(workspaceId || undefined), [workspaceId]);
  const item = asItems(data).find((row: any) => row.id === id);
  return (
    <AnnouncementDetailScreen
      item={item}
      onAck={async () => {
        await api.acknowledgeAnnouncement(String(id));
        await reload();
      }}
    />
  );
}
