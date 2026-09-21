import React from 'react';
import { Pressable, Text } from 'react-native';
import { Card, EmptyState, ErrorState, LoadingState, Screen, ScreenTitle } from '../components/ui';
import { asList } from '../format';
import { colors, type } from '../theme';

export function MessagesScreen({
  payload,
  loading,
  error,
  onOpen,
  onRefresh,
}: {
  payload: any;
  loading?: boolean;
  error?: string | null;
  onOpen: (id: string) => void;
  onRefresh?: () => void;
}) {
  const items = asList(payload);
  return (
    <Screen testID="messages-screen" refreshing={loading} onRefresh={onRefresh}>
      <ScreenTitle title="Mensagens" subtitle="Conversas da paróquia e das turmas." />
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState title="Mensagens indisponíveis" body={error} /> : null}
      {items.length === 0 && !loading ? (
        <EmptyState title="Caixa vazia" body="Quando alguém escrever, a conversa aparece aqui." />
      ) : (
        items.map((item: any) => (
          <Pressable key={item.id} onPress={() => onOpen(item.id)} testID={`conversation-${item.id}`}>
            <Card>
              <Text style={{ color: colors.ink, fontFamily: type.bodyBold }}>
                {item.title || item.name || item.subject || 'Conversa'}
              </Text>
              <Text style={{ color: colors.muted, marginTop: 4, fontFamily: type.body }} numberOfLines={2}>
                {item.lastMessage?.content || item.preview || item.lastMessage?.body || 'Sem prévia'}
              </Text>
            </Card>
          </Pressable>
        ))
      )}
    </Screen>
  );
}
