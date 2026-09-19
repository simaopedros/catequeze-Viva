import React from 'react';
import { View } from 'react-native';
import { Text } from 'react-native-paper';
import { Avatar, AvatarStack } from '../components/Avatar';
import { EmptyState, ListCard, ListRow, PrimaryFab, Screen, ScreenTitle, SkeletonList } from '../components/ui';
import { colors } from '../theme';
import { formatRelative, fullName } from '../utils/format';

function asConversations(payload: any) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.conversations)) return payload.conversations;
  return [];
}

export function conversationTitle(item: any, currentUserId?: string | null): string {
  if (item?.title || item?.name || item?.subject) return item.title || item.name || item.subject;
  const others = (item?.participants ?? []).filter((p: any) => (p.user?.id ?? p.userId) !== currentUserId);
  const names = others.map((p: any) => fullName(p.user, '')).filter(Boolean);
  if (names.length > 0) return names.slice(0, 3).join(', ') + (names.length > 3 ? ` +${names.length - 3}` : '');
  return item?.type === 'GROUP' ? 'Grupo' : 'Conversa';
}

export function MessagesScreen({
  payload,
  loading,
  error,
  onOpen,
  onNewConversation,
  refreshing,
  onRefresh,
  currentUserId,
}: {
  payload: any;
  loading?: boolean;
  error?: string | null;
  onOpen: (id: string) => void;
  onNewConversation?: () => void;
  refreshing?: boolean;
  onRefresh?: () => void;
  currentUserId?: string | null;
}) {
  const items = asConversations(payload);
  return (
    <Screen
      testID="messages-screen"
      safeTop
      safeBottom
      fabInset={Boolean(onNewConversation)}
      refreshing={refreshing}
      onRefresh={onRefresh}
      fab={onNewConversation ? <PrimaryFab icon="message-plus-outline" label="Nova conversa" onPress={onNewConversation} testID="new-conversation" /> : undefined}
    >
      <ScreenTitle title="Mensagens" subtitle="Conversas da paróquia e das turmas." />
      {loading && items.length === 0 ? <SkeletonList rows={4} /> : null}
      {error ? <EmptyState icon="cloud-off-outline" title="Mensagens indisponíveis" body={error} /> : null}
      {items.length === 0 && !loading && !error ? (
        <EmptyState
          icon="message-outline"
          title="Caixa vazia"
          body="Quando alguém escrever, a conversa aparece aqui."
          action={onNewConversation ? 'Começar conversa' : undefined}
          onAction={onNewConversation}
        />
      ) : null}
      {items.length > 0 ? (
        <ListCard>
          {items.map((item: any, index: number) => {
            const title = conversationTitle(item, currentUserId);
            const others = (item.participants ?? []).filter((p: any) => (p.user?.id ?? p.userId) !== currentUserId);
            const unread = item.unreadCount ?? item.unread ?? 0;
            const preview = item.lastMessage?.content || item.preview || 'Sem mensagens ainda';
            const when = formatRelative(item.lastMessage?.createdAt || item.updatedAt);
            return (
              <ListRow
                key={item.id}
                testID={`conversation-${item.id}`}
                left={
                  others.length > 1 ? (
                    <AvatarStack people={others.map((p: any) => ({ name: fullName(p.user), url: p.user?.avatarUrl }))} size={30} max={3} />
                  ) : (
                    <Avatar name={title} url={others[0]?.user?.avatarUrl} size={40} />
                  )
                }
                title={title}
                subtitle={preview}
                right={
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    {when ? (
                      <Text variant="labelSmall" style={{ color: colors.muted }}>
                        {when}
                      </Text>
                    ) : null}
                    {unread > 0 ? (
                      <View style={{ backgroundColor: colors.gold, borderRadius: 10, minWidth: 20, paddingHorizontal: 6, alignItems: 'center' }}>
                        <Text variant="labelSmall" style={{ color: colors.ink, fontWeight: '700' }}>
                          {unread}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                }
                chevron={false}
                onPress={() => onOpen(item.id)}
                last={index === items.length - 1}
              />
            );
          })}
        </ListCard>
      ) : null}
    </Screen>
  );
}
