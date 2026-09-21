import { useRouter } from 'expo-router';
import React from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { JourneysScreen } from '../../../src/screens/JourneyScreen';

export default function JourneysRoute() {
  const { api, workspaceId } = useAuth();
  const router = useRouter();
  const { data, loading, error } = useAsync(() => api.journeys(workspaceId || undefined), [workspaceId]);
  return (
    <JourneysScreen
      payload={data}
      loading={loading}
      error={error}
      onOpen={(id) => router.push(`/(app)/journeys/${id}`)}
    />
  );
}
