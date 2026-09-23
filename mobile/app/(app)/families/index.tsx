import { useRouter } from 'expo-router';
import React from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { FamiliesScreen } from '../../../src/screens/PastoralDirectoryScreens';

export default function FamiliesRoute() {
  const { api } = useAuth();
  const router = useRouter();
  const { data, loading, error, reload } = useAsync(() => api.families(), []);

  const rows = Array.isArray(data) ? data : data?.items ?? [];

  return (
    <FamiliesScreen
      rows={rows}
      loading={loading}
      error={error}
      refreshing={loading}
      onRefresh={() => void reload()}
      onOpen={(id) => router.push(`/(app)/families/${id}`)}
    />
  );
}
