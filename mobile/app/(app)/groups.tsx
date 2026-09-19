import React from 'react';
import { useAuth } from '../../src/auth/AuthContext';
import { useAsync } from '../../src/hooks/useAsync';
import { GroupsScreen } from '../../src/screens/SecondaryScreens';

export default function GroupsRoute() {
  const { api } = useAuth();
  const { data, loading, error, reload, refreshing } = useAsync(() => api.pastoralGroups(), []);
  return <GroupsScreen items={Array.isArray(data) ? data : data?.items ?? []} loading={loading} error={error} refreshing={refreshing} onRefresh={() => void reload()} />;
}
