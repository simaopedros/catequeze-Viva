import { useRouter } from 'expo-router';
import React from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { AnnouncementsScreen } from '../../../src/screens/ContentScreens';

export default function AnnouncementsRoute() {
  const { api, workspaceId } = useAuth();
  const router = useRouter();
  const { data, loading, error } = useAsync(() => api.announcements(workspaceId || undefined), [workspaceId]);

  return (
    <AnnouncementsScreen
      rows={data ?? []}
      loading={loading}
      error={error}
      onOpen={(id) => router.push(`/(app)/announcements/${id}`)}
    />
  );
}
