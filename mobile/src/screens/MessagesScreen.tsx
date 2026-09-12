import React from 'react';
import { Text } from 'react-native';
import { EmptyState, LoadingState, PersonRow, Screen, ScreenTitle } from '../components/ui';
import { formatTime } from '../lib/payload';

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
      <ScreenTitle title="Mensagens" subtitle="Toque numa conversa para abrir o fio." />
      {loading ? <LoadingState /> : null}
      {error ? <EmptyState title="Mensagens indisponíveis" body={error} /> : null}
      {items.length === 0 && !loading ? (
        <EmptyState title="Caixa vazia" body="Quando alguém escrever, a conversa aparece aqui." />
      ) : (
        items.map((item: any) => (
          <PersonRow
            key={item.id}
            testID={`conversation-${item.id}`}
            name={item.title || item.name || item.subject || 'Conversa'}
            hint={item.lastMessage?.content || item.preview || ' '}
            chip={
              item.unreadCount
                ? `${item.unreadCount} por ler`
                : formatTime(item.lastMessage?.createdAt || item.updatedAt)
            }
            photoUrl={item.avatarUrl || item.photoUrl}
            onPress={() => onOpen(item.id)}
          />
        ))
      )}
    </Screen>
  );
}
