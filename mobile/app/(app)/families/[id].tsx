import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { useAuth, workspaceNavContext } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { canManagePastoral } from '../../../src/lib/roleAccess';
import { appRoutes } from '../../../src/navigation/routes';
import { FamilyProfileScreen } from '../../../src/screens/PeopleProfileScreens';

export default function FamilyDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api, workspaceId, bootstrap } = useAuth();
  const router = useRouter();
  const { data, loading, error } = useAsync(
    () => api.familyDetails(String(id), workspaceId || undefined),
    [id, workspaceId],
  );
  const nav = workspaceNavContext(bootstrap, workspaceId);

  return (
    <FamilyProfileScreen
      data={data}
      loading={loading}
      error={error}
      canWrite={canManagePastoral(nav.role, nav.isAdmin)}
      onOpenCatechumen={(catechumenId) => router.push(`/(app)/catechumens/${catechumenId}`)}
      onEdit={() => router.push(appRoutes.form('household', { id: String(id), name: data?.name }))}
    />
  );
}
