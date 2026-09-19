import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { useAuth, usePermissions } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { CatechumensListScreen } from '../../../src/screens/CatechumensListScreen';

export default function CatechumensRoute() {
  const { api, workspaceId } = useAuth();
  const permissions = usePermissions();
  const router = useRouter();
  const { data, loading, error, reload, refreshing } = useAsync(() => api.catechumens({ workspaceId: workspaceId || undefined }), [workspaceId]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  return (
    <CatechumensListScreen
      payload={data}
      loading={loading}
      error={error}
      refreshing={refreshing}
      onRefresh={() => void reload()}
      onOpen={(id) => router.push(`/(app)/catechumen/${id}`)}
      onCreate={permissions.canOperate ? () => router.push('/(app)/catechumen/new') : undefined}
    />
  );
}
