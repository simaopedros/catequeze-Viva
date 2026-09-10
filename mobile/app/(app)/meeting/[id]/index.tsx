import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { useAuth } from '../../../../src/auth/AuthContext';
import { useAsync } from '../../../../src/hooks/useAsync';
import { MeetingScreen } from '../../../../src/screens/MeetingScreen';

export default function MeetingRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api } = useAuth();
  const router = useRouter();
  const { data, loading, error } = useAsync(() => api.meetingDetails(String(id)), [id]);

  return (
    <MeetingScreen
      data={data}
      loading={loading}
      error={error}
      onAttendance={() => router.push(`/(app)/meeting/${id}/attendance`)}
    />
  );
}
