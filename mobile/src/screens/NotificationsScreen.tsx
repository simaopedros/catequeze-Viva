import React from 'react';
import { Text } from 'react-native';
import { BrandButton, Card, EmptyState, LoadingState, Screen, ScreenTitle } from '../components/ui';
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
}: {
  payload: any;
  loading?: boolean;
  error?: string | null;
  onRead: (id: string) => void;
}) {
  const items = asNotifications(payload);
  return (
    <Screen testID="notifications-screen">
      <ScreenTitle title="Notificações" />
      {loading ? <LoadingState /> : null}
      {error ? <EmptyState title="Caixa indisponível" body={error} /> : null}
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
