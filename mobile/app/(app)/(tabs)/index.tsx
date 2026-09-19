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
      refreshing={refreshing}
      onRefresh={() => void reload()}
      unread={unreadCount(bootstrap)}
      onOpenCommunity={() => router.push('/(app)/(tabs)/community')}
      onOpenMessages={() => router.push('/(app)/(tabs)/messages')}
      onOpenClasses={() => router.push('/(app)/(tabs)/classes')}
      onOpenBible={() => router.push('/(app)/bible')}
      onOpenNotifications={() => router.push('/(app)/notifications')}
      onOpenMeeting={(id) => router.push(`/(app)/meeting/${id}`)}
    />
  );
}
