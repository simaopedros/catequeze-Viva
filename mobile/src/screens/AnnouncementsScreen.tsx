import React from 'react';
import { Text } from 'react-native';
import { BrandButton, Card, EmptyState, LoadingState, Screen, ScreenTitle } from '../components/ui';
import { colors } from '../theme';

export function AnnouncementsScreen({
  items,
  loading,
  error,
  onAck,
  busyId,
}: {
  items: any[];
  loading?: boolean;
  error?: string | null;
  onAck: (id: string) => void;
  busyId?: string | null;
}) {
  return (
    <Screen testID="announcements-screen">
      <ScreenTitle title="Comunicados" subtitle="Avisos da paróquia, diocese e comunidade." />
      {loading ? <LoadingState /> : null}
      {error ? <EmptyState title="Comunicados indisponíveis" body={error} /> : null}
      {!loading && items.length === 0 ? (
        <EmptyState title="Sem comunicados" body="Quando houver um aviso pastoral, aparece aqui." />
      ) : null}
      {items.map((item) => (
        <Card key={item.id}>
          <Text style={{ color: colors.ink, fontWeight: '700', fontSize: 17 }}>{item.title || 'Comunicado'}</Text>
          {item.body ? (
            <Text style={{ color: colors.muted, marginTop: 6 }} numberOfLines={8}>
              {item.body}
            </Text>
          ) : null}
          <Text style={{ color: colors.goldDark, marginTop: 8 }}>
            {item.acknowledged ? 'Já confirmou a leitura' : item.requireAck ? 'Pede confirmação' : ''}
          </Text>
          {item.requireAck && !item.acknowledged ? (
            <BrandButton
              label={busyId === item.id ? 'A confirmar…' : 'Confirmar leitura'}
              disabled={busyId === item.id}
              onPress={() => onAck(item.id)}
            />
          ) : null}
        </Card>
      ))}
    </Screen>
  );
}
