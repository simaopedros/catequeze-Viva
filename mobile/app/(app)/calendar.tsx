import { useRouter } from 'expo-router';
import React from 'react';
import { useAuth } from '../../src/auth/AuthContext';
import { useAsync } from '../../src/hooks/useAsync';
import { CalendarScreen } from '../../src/screens/ContentScreens';

export default function CalendarRoute() {
  const { api, workspaceId } = useAuth();
  const router = useRouter();
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
  const { data, loading, error } = useAsync(
    () => api.calendar(workspaceId || undefined, from, to),
    [workspaceId, from, to],
  );

  return (
    <CalendarScreen
      items={data?.items ?? []}
      loading={loading}
      error={error}
      onOpenMeeting={(id) => router.push(`/(app)/meeting/${id}`)}
    />
  );
}
