import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { useAuth, usePermissions } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { ClassesScreen } from '../../../src/screens/ClassesScreen';

export default function ClassesRoute() {
  const { api, workspaceId } = useAuth();
  const permissions = usePermissions();
  const router = useRouter();
  const { data, loading, error, reload, refreshing } = useAsync(
    () => api.classes(workspaceId || undefined),
    [workspaceId],
  );

  useFocusEffect(
    useCallback(() => {
      if (data) void reload();
    }, [reload]),
  );

  return (
    <ClassesScreen
      payload={data}
      loading={loading}
      error={error}
      refreshing={refreshing}
      onRefresh={() => void reload()}
      onOpen={(id) => router.push(`/(app)/class/${id}`)}
      onCreate={permissions.canManageClasses ? () => router.push('/(app)/class/new') : undefined}
    />
  );
}
