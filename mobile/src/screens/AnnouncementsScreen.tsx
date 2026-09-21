import React from 'react';
import { Pressable, Text } from 'react-native';
import { BrandButton, Card, EmptyState, ErrorState, LoadingState, Screen, ScreenTitle } from '../components/ui';
import { asList } from '../format';
import { colors, type } from '../theme';

export function AnnouncementsScreen({
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
  const items = asList(payload).filter((item) => !item.status || item.status === 'PUBLISHED');
  return (
    <Screen testID="announcements-screen">
      <ScreenTitle title="Comunicados" subtitle="Avisos publicados para este espaço." />
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState title="Comunicados indisponíveis" body={error} /> : null}
      {items.length === 0 && !loading ? (
        <EmptyState title="Nenhum comunicado" body="Quando a coordenação publicar um aviso, ele aparece aqui." />
      ) : (
        items.map((item) => (
          <Pressable key={item.id} onPress={() => onOpen(item.id)} testID={`announcement-${item.id}`}>
            <Card>
              <Text style={{ color: colors.ink, fontFamily: type.bodyBold }}>{item.title}</Text>
              <Text style={{ color: colors.muted, marginTop: 6, fontFamily: type.body }} numberOfLines={3}>
                {item.body}
              </Text>
              <Text style={{ color: item.acknowledged ? colors.success : colors.goldDark, marginTop: 8, fontFamily: type.bodyBold }}>
                {item.acknowledged ? 'Leitura confirmada' : 'Aguardando confirmação'}
              </Text>
            </Card>
          </Pressable>
        ))
      )}
    </Screen>
  );
}

export function AnnouncementDetailScreen({
  item,
  loading,
  error,
  onAcknowledge,
  busy,
}: {
  item: any;
  loading?: boolean;
  error?: string | null;
  onAcknowledge: () => void;
  busy?: boolean;
}) {
  return (
    <Screen testID="announcement-detail">
      <ScreenTitle title={item?.title || 'Comunicado'} />
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState title="Comunicado indisponível" body={error} /> : null}
      {item?.body ? <Text style={{ color: colors.inkSoft, fontFamily: type.body, fontSize: 17, lineHeight: 26 }}>{item.body}</Text> : null}
      {item && !item.acknowledged ? (
        <BrandButton label={busy ? 'Salvando…' : 'Confirmar leitura'} disabled={busy} onPress={onAcknowledge} testID="ack-announcement" />
      ) : item ? (
        <Text style={{ color: colors.success, marginTop: 16, fontFamily: type.bodyBold }}>Leitura confirmada</Text>
      ) : null}
    </Screen>
  );
}
