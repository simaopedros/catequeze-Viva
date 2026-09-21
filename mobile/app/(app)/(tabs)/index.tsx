import { useRouter } from 'expo-router';
import React from 'react';
import { displayName, listWorkspaces, useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { HomeScreen } from '../../../src/screens/HomeScreen';

export default function HomeRoute() {
  const { api, user, bootstrap, workspaceId } = useAuth();
  const router = useRouter();
  const { data, loading, error, reload } = useAsync(() => api.dashboard(workspaceId || undefined), [workspaceId]);
  const workspace = listWorkspaces(bootstrap).find((item) => item.id === workspaceId)?.name;

  return (
    <HomeScreen
      name={displayName(user)}
      workspace={workspace}
      stats={data}
      loading={loading}
      error={error}
      onRefresh={reload}
      onOpenClasses={() => router.push('/(app)/(tabs)/classes')}
      onOpenCatechumens={() => router.push('/(app)/catechumens')}
      onOpenCalendar={() => router.push('/(app)/calendar')}
      onOpenAttendance={(id) => router.push(`/(app)/meeting/${id}/attendance`)}
      onOpenMeeting={(id) => router.push(`/(app)/meeting/${id}`)}
    />
  );
}
