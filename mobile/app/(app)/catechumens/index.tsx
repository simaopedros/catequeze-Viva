import { useRouter } from 'expo-router';
import React from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { CatechumensScreen } from '../../../src/screens/CatechumensScreen';

export default function CatechumensRoute() {
  const { api, workspaceId } = useAuth();
  const router = useRouter();
  const { data, loading, error } = useAsync(() => api.catechumens(workspaceId || undefined), [workspaceId]);

  return (
    <CatechumensScreen
      payload={data}
      loading={loading}
      error={error}
      onOpen={(id) => router.push(`/(app)/catechumens/${id}`)}
    />
  );
}
