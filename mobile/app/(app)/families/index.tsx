import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { useAuth, usePermissions } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { FamiliesListScreen } from '../../../src/screens/FamiliesListScreen';

export default function FamiliesRoute() {
  const { api, workspaceId } = useAuth();
  const permissions = usePermissions();
  const router = useRouter();
  const { data, loading, error, reload, refreshing } = useAsync(() => api.families({ workspaceId: workspaceId || undefined }), [workspaceId]);

  useFocusEffect(
    useCallback(() => {
      if (data) void reload();
    }, [reload]),
  );

  return (
    <FamiliesListScreen
      payload={data}
      loading={loading}
      error={error}
      refreshing={refreshing}
      onRefresh={() => void reload()}
      onOpen={(id) => router.push(`/(app)/family/${id}`)}
      onCreate={permissions.canManageFamilies ? () => router.push('/(app)/family/new') : undefined}
    />
  );
}
