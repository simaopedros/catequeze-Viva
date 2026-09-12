import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { useAuth, workspaceNavContext } from '../../../../src/auth/AuthContext';
import { useAsync } from '../../../../src/hooks/useAsync';
import { canMarkAttendance } from '../../../../src/lib/roleAccess';
import { MeetingScreen } from '../../../../src/screens/MeetingScreen';

export default function MeetingRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api, bootstrap, workspaceId } = useAuth();
  const router = useRouter();
  const { data, loading, error } = useAsync(() => api.meetingDetails(String(id)), [id]);
  const nav = workspaceNavContext(bootstrap, workspaceId);

  return (
    <MeetingScreen
      data={data}
      loading={loading}
      error={error}
      canMarkAttendance={canMarkAttendance(nav.role, nav.isAdmin)}
      onAttendance={() => router.push(`/(app)/meeting/${id}/attendance`)}
    />
  );
}
