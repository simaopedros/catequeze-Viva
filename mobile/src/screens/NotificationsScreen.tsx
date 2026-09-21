import React from 'react';
import { Text } from 'react-native';
import { BrandButton, Card, EmptyState, ErrorState, LoadingState, Screen, ScreenTitle } from '../components/ui';
import { asList } from '../format';
import { colors, type } from '../theme';

export function NotificationsScreen({
  payload,
  loading,
  error,
  onRead,
  onReadAll,
}: {
  payload: any;
  loading?: boolean;
  error?: string | null;
  onRead: (id: string) => void;
  onReadAll?: () => void;
}) {
  const items = asList(payload);
  const unread = items.some((item) => !item.readAt);
  return (
    <Screen testID="notifications-screen">
      <ScreenTitle title="Notificações" />
      {unread && onReadAll ? (
        <BrandButton variant="ghost" label="Marcar todas como lidas" onPress={onReadAll} testID="read-all" />
      ) : null}
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState title="Caixa indisponível" body={error} /> : null}
      {items.length === 0 && !loading ? (
        <EmptyState title="Tudo em dia" body="Não há notificações por ler." />
      ) : (
        items.map((item: any) => (
          <Card key={item.id} style={{ opacity: item.readAt ? 0.65 : 1 }}>
            <Text style={{ color: colors.ink, fontFamily: type.bodyBold }}>{item.title || 'Aviso'}</Text>
            <Text style={{ color: colors.muted, marginTop: 4, fontFamily: type.body }}>{item.body || item.message || ''}</Text>
            {!item.readAt ? (
              <BrandButton variant="ghost" label="Marcar como lida" onPress={() => onRead(item.id)} />
            ) : (
              <Text style={{ color: colors.success, marginTop: 8, fontFamily: type.body }}>Lida</Text>
            )}
          </Card>
        ))
      )}
    </Screen>
  );
}
