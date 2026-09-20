import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useAuth } from '../../src/auth/AuthContext';
import { useAsync } from '../../src/hooks/useAsync';
import { resolveNotificationHref } from '../../src/navigation/deepLinks';
import { NotificationsScreen } from '../../src/screens/NotificationsScreen';

export default function NotificationsRoute() {
  const { api } = useAuth();
  const router = useRouter();
  const { data, loading, error, reload, refreshing } = useAsync(() => api.notifications(), []);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setActionError(null);
    try {
      await action();
      await reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'A ação falhou. Tente novamente.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <NotificationsScreen
      payload={data}
      loading={loading}
      error={error}
      busy={busy}
      actionError={actionError}
      refreshing={refreshing}
      onRefresh={() => void reload()}
      onRead={(id) => void run(() => api.markNotificationRead(id))}
      onReadAll={() => void run(() => api.markAllNotificationsRead())}
      onOpen={(item) => {
        const href = resolveNotificationHref(item);
        if (href) router.push(href as never);
      }}
    />
  );
}
