import React from 'react';
import { useAuth } from '../../src/auth/AuthContext';
import { useAsync } from '../../src/hooks/useAsync';
import { NotificationsScreen } from '../../src/screens/NotificationsScreen';

export default function NotificationsRoute() {
  const { api } = useAuth();
  const { data, loading, error, reload } = useAsync(() => api.notifications(), []);

  return (
    <NotificationsScreen
      payload={data}
      loading={loading}
      error={error}
      onRead={async (id) => {
        await api.markNotificationRead(id);
        await reload();
      }}
    />
  );
}
