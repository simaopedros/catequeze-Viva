import { useRouter } from 'expo-router';
import React from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { ClassesScreen } from '../../../src/screens/ClassesScreen';

export default function ClassesRoute() {
  const { api, workspaceId } = useAuth();
  const router = useRouter();
  const { data, loading, error, reload, refreshing } = useAsync(() => api.classes(workspaceId || undefined), [workspaceId]);

  return (
    <ClassesScreen
      payload={data}
      loading={loading}
      error={error}
      onRefresh={() => void reload()}
      refreshing={refreshing}
      onOpen={(id) => router.push(`/(app)/class/${id}`)}
    />
  );
}
