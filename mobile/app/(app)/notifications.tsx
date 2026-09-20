import React from 'react';
import { useAuth } from '../../src/auth/AuthContext';
import { useAsync } from '../../src/hooks/useAsync';
import { NotificationsScreen } from '../../src/screens/NotificationsScreen';

export default function NotificationsRoute() {
  const { api, refresh } = useAuth();
  const { data, loading, error, reload, refreshing } = useAsync(() => api.notifications(), []);

  return (
    <NotificationsScreen
      payload={data}
      loading={loading}
      error={error}
      onRefresh={() => void reload()}
      refreshing={refreshing}
      onRead={async (id) => {
        await api.markNotificationRead(id);
        await reload();
        await refresh();
      }}
      onReadAll={async () => {
        await api.markAllNotificationsRead();
        await reload();
        await refresh();
      }}
    />
  );
}
