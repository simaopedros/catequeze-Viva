import { useRouter } from 'expo-router';
import React from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { JourneysScreen } from '../../../src/screens/ContentScreens';

export default function JourneysRoute() {
  const { api, workspaceId } = useAuth();
  const router = useRouter();
  const { data, loading, error } = useAsync(() => api.journeys(workspaceId || undefined), [workspaceId]);

  return (
    <JourneysScreen
      rows={data ?? []}
      loading={loading}
      error={error}
      onOpen={(journeyId) => router.push(`/(app)/journeys/${journeyId}`)}
    />
  );
}
