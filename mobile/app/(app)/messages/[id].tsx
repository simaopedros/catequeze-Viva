import { useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { ThreadScreen } from '../../../src/screens/ThreadScreen';

export default function ThreadRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api } = useAuth();
  const { data, loading, error, reload } = useAsync(() => api.conversation(String(id)), [id]);
  const [busy, setBusy] = useState(false);

  return (
    <ThreadScreen
      data={data}
      loading={loading}
      error={error}
      busy={busy}
      onSend={async (content) => {
        setBusy(true);
        try {
          await api.sendMessage(String(id), content);
          await reload();
        } finally {
          setBusy(false);
        }
      }}
    />
  );
}
