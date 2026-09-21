import { useRouter } from 'expo-router';
import React from 'react';
import { useAuth } from '../../src/auth/AuthContext';
import { useAsync } from '../../src/hooks/useAsync';
import { CalendarScreen } from '../../src/screens/CalendarScreen';

export default function CalendarRoute() {
  const { api, workspaceId } = useAuth();
  const router = useRouter();
  const { data, loading, error } = useAsync(() => api.calendar(workspaceId || undefined), [workspaceId]);
  return (
    <CalendarScreen
      events={data?.events ?? []}
      meetings={data?.meetings ?? []}
      loading={loading}
      error={error}
      onOpenMeeting={(id) => router.push(`/(app)/meeting/${id}`)}
    />
  );
}
