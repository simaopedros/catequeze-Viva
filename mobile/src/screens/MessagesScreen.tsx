import React from 'react';
import { BrandButton, EmptyState, ErrorState, ListRow, LoadingState, Screen, ScreenTitle } from '../components/ui';
import { copy } from '../copy/ptBR';

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
  onCreate,
  onRefresh,
  refreshing,
}: {
  payload: any;
  loading?: boolean;
  error?: string | null;
  onOpen: (id: string) => void;
  onCreate?: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  const items = asConversations(payload);
  return (
    <Screen testID="messages-screen" onRefresh={onRefresh} refreshing={refreshing}>
      <ScreenTitle title={copy.messages.title} subtitle={copy.messages.subtitle} />
      {onCreate ? <BrandButton label={copy.messages.new} onPress={onCreate} /> : null}
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState title={copy.messages.errorTitle} body={error} /> : null}
      {items.length === 0 && !loading ? (
        <EmptyState title={copy.messages.emptyTitle} body={copy.messages.emptyBody} icon="chatbubble-ellipses-outline" />
      ) : (
        items.map((item: any) => (
          <ListRow
            key={item.id}
            testID={`conversation-${item.id}`}
            title={item.title || item.name || item.subject || copy.messages.fallback}
            meta={item.lastMessage?.content || item.preview || ' '}
            onPress={() => onOpen(item.id)}
          />
        ))
      )}
    </Screen>
  );
}
