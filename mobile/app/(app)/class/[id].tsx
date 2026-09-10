import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { ClassDetailScreen } from '../../../src/screens/ClassDetailScreen';

export default function ClassRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api } = useAuth();
  const router = useRouter();
  const { data, loading, error } = useAsync(() => api.classDetails(String(id)), [id]);

  return (
    <ClassDetailScreen
      data={data}
      loading={loading}
      error={error}
      onOpenMeeting={(meetingId) => router.push(`/(app)/meeting/${meetingId}`)}
    />
  );
}
