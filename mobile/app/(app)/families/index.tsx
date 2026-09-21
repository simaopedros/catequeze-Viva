import { useRouter } from 'expo-router';
import React from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { PeopleListScreen } from '../../../src/screens/PeopleScreens';

export default function FamiliesRoute() {
  const { api, workspaceId } = useAuth();
  const router = useRouter();
  const { data, loading, error } = useAsync(() => api.families(workspaceId || undefined), [workspaceId]);
  return (
    <PeopleListScreen
      testID="families-screen"
      title="Famílias"
      subtitle="Agregados deste espaço de trabalho."
      payload={data}
      loading={loading}
      error={error}
      onOpen={(id) => router.push(`/(app)/families/${id}`)}
    />
  );
}
