import React from 'react';
import { Text } from 'react-native';
import { BrandButton, Card, EmptyState, ErrorText, LoadingState, Screen, ScreenTitle } from '../components/ui';
import { colors } from '../theme';

function asNotifications(payload: any) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

export function NotificationsScreen({
  payload,
  loading,
  error,
  onRead,
  onReadAll,
  actionError,
  busy,
  refreshing,
  onRefresh,
}: {
  payload: any;
  loading?: boolean;
  error?: string | null;
  onRead: (id: string) => void;
  onReadAll?: () => void;
  actionError?: string | null;
  busy?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  const items = asNotifications(payload);
  const hasUnread = items.some((item: any) => !item.readAt);
  return (
    <Screen testID="notifications-screen" refreshing={refreshing} onRefresh={onRefresh}>
      <ScreenTitle title="Notificações" />
      {loading ? <LoadingState /> : null}
      {error ? <EmptyState title="Caixa indisponível" body={error} /> : null}
      <ErrorText message={actionError} />
      {hasUnread && onReadAll ? (
        <BrandButton
          variant="ghost"
          testID="read-all"
          label={busy ? 'A marcar…' : 'Marcar todas como lidas'}
          disabled={busy}
          onPress={onReadAll}
        />
      ) : null}
      {items.length === 0 && !loading ? (
        <EmptyState title="Tudo em dia" body="Não há notificações por ler." />
      ) : (
        items.map((item: any) => (
          <Card key={item.id}>
            <Text style={{ color: colors.ink, fontWeight: '700' }}>{item.title || 'Aviso'}</Text>
            <Text style={{ color: colors.muted, marginTop: 4 }}>{item.body || item.message || ''}</Text>
            {!item.readAt ? (
              <BrandButton variant="ghost" label="Marcar como lida" onPress={() => onRead(item.id)} />
            ) : null}
          </Card>
        ))
      )}
    </Screen>
  );
}
