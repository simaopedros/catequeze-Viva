import { useRouter } from 'expo-router';
import React from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { CatechumensListScreen } from '../../../src/screens/CatechumensListScreen';

export default function CatechumensRoute() {
  const { api, workspaceId } = useAuth();
  const router = useRouter();
  const { data, loading, error, reload, refreshing } = useAsync(() => api.catechumens(), [workspaceId]);

  return (
    <CatechumensListScreen
      payload={data}
      loading={loading}
      error={error}
      refreshing={refreshing}
      onRefresh={() => void reload()}
      onOpen={(id) => router.push(`/(app)/catechumen/${id}`)}
    />
  );
}
