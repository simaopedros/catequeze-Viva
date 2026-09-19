import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { NewConversationScreen } from '../../../src/screens/NewConversationScreen';

export default function NewConversationRoute() {
  const { api, workspaceId } = useAuth();
  const router = useRouter();
  const { data, loading, error } = useAsync(
    () => (workspaceId ? api.conversationContacts(workspaceId) : Promise.resolve([])),
    [workspaceId],
  );
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  return (
    <NewConversationScreen
      payload={data}
      loading={loading}
      error={error}
      busy={busy}
      actionError={actionError}
      onCreate={async (participantUserIds, title) => {
        if (!workspaceId) {
          setActionError('Selecione um espaço de trabalho antes de criar a conversa.');
          return;
        }
        setBusy(true);
        setActionError(null);
        try {
          const conversation = await api.createConversation({
            workspaceId,
            participantUserIds,
            type: participantUserIds.length > 1 ? 'GROUP' : 'DIRECT',
            title,
          });
          const id = conversation?.id;
          if (id) {
            router.replace(`/(app)/messages/${id}`);
          } else {
            router.replace('/(app)/(tabs)/messages');
          }
        } catch (err) {
          setActionError(err instanceof Error ? err.message : 'Não foi possível criar a conversa.');
        } finally {
          setBusy(false);
        }
      }}
    />
  );
}
