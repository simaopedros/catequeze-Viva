import { useRouter } from 'expo-router';
import React from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { copy } from '../../../src/copy/ptBR';
import { displayPerson } from '../../../src/format';
import { useAsync } from '../../../src/hooks/useAsync';
import { CatalogListScreen } from '../../../src/screens/CatalogListScreen';

export default function NewConversationRoute() {
  const { api, workspaceId } = useAuth();
  const router = useRouter();
  const { data, loading, error, reload, refreshing } = useAsync(async () => {
    if (!workspaceId) return [];
    const payload = await api.team(workspaceId);
    return payload?.members || payload?.items || payload?.team || payload;
  }, [workspaceId]);

  return (
    <CatalogListScreen
      title={copy.messages.new}
      subtitle={copy.messages.pickMember}
      payload={data}
      loading={loading}
      error={error}
      onRefresh={() => void reload()}
      refreshing={refreshing}
      mapItem={(item: any) => ({
        id: String(item.userId || item.user?.id || item.id),
        title: displayPerson(item.user || item) || item.email,
        meta: item.role || item.email,
      })}
      onOpen={async (id) => {
        if (!workspaceId) return;
        const conversation = await api.createConversation({
          type: 'DIRECT',
          participantUserIds: [id],
          parishId: workspaceId,
        });
        router.replace(`/(app)/messages/${conversation.id || conversation.conversationId || id}`);
      }}
    />
  );
}
