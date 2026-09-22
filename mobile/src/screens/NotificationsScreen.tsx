import React from 'react';
import { Text, View } from 'react-native';
import { EmptyState, ListRow, LoadingState, Screen } from '../components/ui';
import { colors, spacing, typography } from '../theme';

function asNotifications(payload: any) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

export function NotificationsScreen({
  payload,
  loading,
  error,
  refreshing,
  onRead,
  onRefresh,
}: {
  payload: any;
  loading?: boolean;
  error?: string | null;
  refreshing?: boolean;
  onRead: (id: string) => void;
  onRefresh?: () => void;
}) {
  const items = asNotifications(payload);

  return (
    <Screen testID="notifications-screen" onRefresh={onRefresh} refreshing={refreshing}>
      {loading && items.length === 0 ? <LoadingState /> : null}
      {error ? <EmptyState title="Caixa indisponível" body={error} /> : null}
      {items.length === 0 && !loading && !error ? (
        <EmptyState title="Tudo em dia" body="Não há notificações por ler." />
      ) : (
        items.map((item: any) => {
          const unread = !item.readAt;
          return (
            <ListRow
              key={item.id}
              testID={`notification-${item.id}`}
              title={item.title || 'Aviso'}
              subtitle={item.body || item.message || undefined}
              onPress={unread ? () => onRead(item.id) : undefined}
              right={
                unread ? (
                  <View style={{ paddingHorizontal: spacing[2] }}>
                    <Text style={styles.unreadDot}>●</Text>
                  </View>
                ) : undefined
              }
            />
          );
        })
      )}
    </Screen>
  );
}

const styles = {
  unreadDot: {
    ...typography.labelSm,
    color: colors.accent[700],
  },
};
