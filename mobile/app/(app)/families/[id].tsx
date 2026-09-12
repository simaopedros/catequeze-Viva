import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { FamilyProfileScreen } from '../../../src/screens/PeopleProfileScreens';

export default function FamilyDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api, workspaceId } = useAuth();
  const router = useRouter();
  const { data, loading, error } = useAsync(
    () => api.familyDetails(String(id), workspaceId || undefined),
    [id, workspaceId],
  );

  return (
    <FamilyProfileScreen
      data={data}
      loading={loading}
      error={error}
      onOpenCatechumen={(catechumenId) => router.push(`/(app)/catechumens/${catechumenId}`)}
    />
  );
}
