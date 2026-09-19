import { useRouter } from 'expo-router';
import React from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { SacramentsScreen } from '../../../src/screens/SecondaryScreens';

export default function SacramentsRoute() {
  const { api, workspaceId } = useAuth();
  const router = useRouter();
  const { data, loading, error, reload, refreshing } = useAsync(() => api.sacramentalJourneys({ workspaceId: workspaceId || undefined, take: 100 }), [workspaceId]);
  return (
    <SacramentsScreen
      items={Array.isArray(data) ? data : data?.items ?? []}
      loading={loading}
      error={error}
      refreshing={refreshing}
      onRefresh={() => void reload()}
      onOpen={(id) => router.push(`/(app)/sacraments/${id}`)}
    />
  );
}
