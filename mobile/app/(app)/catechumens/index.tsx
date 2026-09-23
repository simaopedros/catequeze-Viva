import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { paramId } from '../../../src/navigation/routeParams';
import { CatechumensScreen } from '../../../src/screens/CatechumensScreen';

export default function CatechumensRoute() {
  const params = useLocalSearchParams<{ classId?: string | string[]; className?: string | string[] }>();
  const classId = useMemo(() => paramId(params.classId), [params.classId]);
  const className = useMemo(() => {
    const raw = params.className;
    if (typeof raw === 'string') return raw;
    if (Array.isArray(raw)) return raw[0];
    return undefined;
  }, [params.className]);
  const { api, workspaceId } = useAuth();
  const router = useRouter();
  const { data, loading, error } = useAsync(() => api.catechumens(workspaceId || undefined), [workspaceId]);

  return (
    <CatechumensScreen
      payload={data}
      loading={loading}
      error={error}
      classId={classId}
      className={className}
      onOpen={(id) => router.push(`/(app)/catechumens/${id}`)}
    />
  );
}
