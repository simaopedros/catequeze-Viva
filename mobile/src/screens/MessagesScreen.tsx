import React from 'react';
import { ConversationRow } from '../components/pastoralUi';
import { EmptyState, LoadingState, Screen, ScreenTitle } from '../components/ui';

function asConversations(payload: any) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.conversations)) return payload.conversations;
  return [];
}

export function MessagesScreen({
  payload,
  loading,
  error,
  onOpen,
}: {
  payload: any;
  loading?: boolean;
  error?: string | null;
  onOpen: (id: string) => void;
}) {
  const items = asConversations(payload);
  return (
    <Screen testID="messages-screen">
      <ScreenTitle title="Mensagens" subtitle="Conversas da paróquia e das turmas." />
      {loading ? <LoadingState /> : null}
      {error ? <EmptyState title="Mensagens indisponíveis" body={error} /> : null}
      {items.length === 0 && !loading ? (
        <EmptyState title="Caixa vazia" body="Quando alguém escrever, a conversa aparece aqui." />
      ) : (
        items.map((item: any) => (
          <ConversationRow
            key={item.id}
            testID={`conversation-${item.id}`}
            title={item.title || item.name || item.subject || 'Conversa'}
            preview={item.lastMessage?.content || item.preview}
            time={item.lastMessageAt || item.updatedAt}
            unread={item.unreadCount}
            avatarName={item.title || item.name}
            onPress={() => onOpen(item.id)}
          />
        ))
      )}
    </Screen>
  );
}
