import { useRouter } from 'expo-router';
import React from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { CatechumensScreen } from '../../../src/screens/PastoralDirectoryScreens';

export default function CatechumensRoute() {
  const { api } = useAuth();
  const router = useRouter();
  const { data, loading, error } = useAsync(() => api.catechumens(), []);

  const rows = Array.isArray(data) ? data : data?.items ?? [];

  return (
    <CatechumensScreen
      rows={rows}
      loading={loading}
      error={error}
      onOpen={(id) => router.push(`/(app)/catechumens/${id}`)}
    />
  );
}
