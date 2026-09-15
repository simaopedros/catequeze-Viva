import { useRouter } from 'expo-router';
import React from 'react';
import { useAuth, workspaceNavContext } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { canManagePastoral } from '../../../src/lib/roleAccess';
import { appRoutes } from '../../../src/navigation/routes';
import { MessagesScreen } from '../../../src/screens/MessagesScreen';

export default function MessagesTabRoute() {
  const { api, workspaceId, bootstrap } = useAuth();
  const router = useRouter();
  const { data, loading, error } = useAsync(() => api.conversations(workspaceId || undefined), [workspaceId]);
  const nav = workspaceNavContext(bootstrap, workspaceId);

  return (
    <MessagesScreen
      payload={data}
      loading={loading}
      error={error}
      canWrite={canManagePastoral(nav.role, nav.isAdmin)}
      onCreate={() => router.push(appRoutes.form('conversation'))}
      onOpen={(id) => router.push(`/(app)/messages/${id}`)}
    />
  );
}
