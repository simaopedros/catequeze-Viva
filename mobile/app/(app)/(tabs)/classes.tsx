import { useRouter } from 'expo-router';
import React from 'react';
import { useAuth, workspaceNavContext } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { canManagePastoral } from '../../../src/lib/roleAccess';
import { appRoutes } from '../../../src/navigation/routes';
import { ClassesScreen } from '../../../src/screens/ClassesScreen';

export default function ClassesRoute() {
  const { api, workspaceId, bootstrap } = useAuth();
  const router = useRouter();
  const { data, loading, error } = useAsync(() => api.classes(workspaceId || undefined), [workspaceId]);
  const nav = workspaceNavContext(bootstrap, workspaceId);
  const canWrite = canManagePastoral(nav.role, nav.isAdmin);

  return (
    <ClassesScreen
      payload={data}
      loading={loading}
      error={error}
      canWrite={canWrite}
      onCreate={() => router.push(appRoutes.form('class'))}
      onOpen={(id) => router.push(`/(app)/class/${id}`)}
    />
  );
}
