import React from 'react';
import { useAuth } from '../../src/auth/AuthContext';
import { useAsync } from '../../src/hooks/useAsync';
import { SupportScreen } from '../../src/screens/SecondaryScreens';

export default function SupportRoute() {
  const { api } = useAuth();
  const { data, loading, error, reload, refreshing } = useAsync(() => api.supportMessages(), []);
  return <SupportScreen items={Array.isArray(data) ? data : []} loading={loading} error={error} refreshing={refreshing} onRefresh={() => void reload()} />;
}
