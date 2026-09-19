import React from 'react';
import { useAuth } from '../../src/auth/AuthContext';
import { useAsync } from '../../src/hooks/useAsync';
import { FormationScreen } from '../../src/screens/SecondaryScreens';

export default function FormationRoute() {
  const { api, workspaceId } = useAuth();
  const { data, loading, error, reload, refreshing } = useAsync(() => api.formationTracks(workspaceId || undefined), [workspaceId]);
  return <FormationScreen items={Array.isArray(data) ? data : []} loading={loading} error={error} refreshing={refreshing} onRefresh={() => void reload()} />;
}
