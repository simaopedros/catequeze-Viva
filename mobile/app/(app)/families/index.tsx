import { useRouter } from 'expo-router';
import React from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { FamiliesListScreen } from '../../../src/screens/FamiliesListScreen';

export default function FamiliesRoute() {
  const { api, workspaceId } = useAuth();
  const router = useRouter();
  const { data, loading, error, reload, refreshing } = useAsync(() => api.families({ workspaceId: workspaceId || undefined }), [workspaceId]);

  return (
    <FamiliesListScreen
      payload={data}
      loading={loading}
      error={error}
      refreshing={refreshing}
      onRefresh={() => void reload()}
      onOpen={(id) => router.push(`/(app)/family/${id}`)}
    />
  );
}
