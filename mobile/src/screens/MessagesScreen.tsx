import React from 'react';
import { Pressable, Text } from 'react-native';
import { Card, EmptyState, LoadingState, Screen, ScreenTitle } from '../components/ui';
import { colors } from '../theme';

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
          <Pressable key={item.id} onPress={() => onOpen(item.id)} testID={`conversation-${item.id}`}>
            <Card>
              <Text style={{ color: colors.ink, fontWeight: '700' }}>
                {item.title || item.name || item.subject || 'Conversa'}
              </Text>
              <Text style={{ color: colors.muted, marginTop: 4 }} numberOfLines={2}>
                {item.lastMessage?.content || item.preview || ' '}
              </Text>
            </Card>
          </Pressable>
        ))
      )}
    </Screen>
  );
}
