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
  const [sendError, setSendError] = useState<string | null>(null);

  return (
    <ThreadScreen
      data={data}
      loading={loading}
      error={error}
      busy={busy}
      sendError={sendError}
      onSend={async (content) => {
        setBusy(true);
        setSendError(null);
        try {
          await api.sendMessage(String(id), content);
          await reload();
        } catch (err) {
          setSendError(err instanceof Error ? err.message : 'Não foi possível enviar a mensagem.');
          throw err;
        } finally {
          setBusy(false);
        }
      }}
    />
  );
}
