import { useRouter } from 'expo-router';
import React from 'react';
import { displayName, unreadCount, useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { HomeScreen } from '../../../src/screens/HomeScreen';

export default function HomeRoute() {
  const { api, user, bootstrap, workspaceId } = useAuth();
  const router = useRouter();
  const { data, loading, error, reload, refreshing } = useAsync(() => api.dashboard(workspaceId || undefined), [workspaceId]);

  return (
    <HomeScreen
      name={displayName(user)}
      stats={data}
      loading={loading}
      error={error}
      unread={unreadCount(bootstrap)}
      onRefresh={() => void reload()}
      refreshing={refreshing}
      onOpenCommunity={() => router.push('/(app)/(tabs)/community')}
      onOpenNotifications={() => router.push('/(app)/notifications')}
      onOpenClasses={() => router.push('/(app)/(tabs)/classes')}
      onOpenMeeting={(id) => router.push(`/(app)/meeting/${id}`)}
    />
  );
}
