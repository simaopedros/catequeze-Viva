import React from 'react';
import { Pressable, View } from 'react-native';
import { Text } from 'react-native-paper';
import { BrandButton, Card, EmptyState, ErrorText, Icon, Row, Screen, ScreenTitle, SkeletonList, type IconName } from '../components/ui';
import { colors, spacing } from '../theme';
import { formatRelative } from '../utils/format';

function asNotifications(payload: any) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

const KIND_ICON: Record<string, IconName> = {
  MESSAGE: 'message-text-outline',
  MEETING: 'calendar-outline',
  ATTENDANCE: 'clipboard-check-outline',
  SOCIAL: 'account-group-outline',
  DOCUMENT: 'file-document-outline',
  ANNOUNCEMENT: 'bullhorn-outline',
  SYSTEM: 'information-outline',
};

function iconFor(item: any): IconName {
  const kind = String(item.kind || item.type || '').toUpperCase();
  for (const key of Object.keys(KIND_ICON)) {
    if (kind.includes(key)) return KIND_ICON[key];
  }
  return 'bell-outline';
}

export function NotificationsScreen({
  payload,
  loading,
  error,
  onRead,
  onReadAll,
  onOpen,
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
  onOpen?: (item: any) => void;
  actionError?: string | null;
  busy?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  const items = asNotifications(payload);
  const unread = items.filter((item: any) => !item.readAt).length;
  return (
    <Screen testID="notifications-screen" refreshing={refreshing} onRefresh={onRefresh}>
      <ScreenTitle
        title="Notificações"
        subtitle={unread > 0 ? `${unread} por ler` : 'Tudo em dia'}
        action={
          unread > 0 && onReadAll ? (
            <BrandButton variant="text" icon="check-all" testID="read-all" label={busy ? 'A marcar…' : 'Ler todas'} disabled={busy} onPress={onReadAll} style={{ marginTop: 0 }} />
          ) : undefined
        }
      />
      {loading && items.length === 0 ? <SkeletonList rows={4} /> : null}
      {error ? <EmptyState icon="cloud-off-outline" title="Caixa indisponível" body={error} /> : null}
      <ErrorText message={actionError} />
      {items.length === 0 && !loading && !error ? (
        <EmptyState icon="bell-check-outline" title="Tudo em dia" body="Não há notificações por ler." />
      ) : (
        items.map((item: any) => {
          const read = Boolean(item.readAt);
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              testID={`notification-${item.id}`}
              onPress={() => {
                if (!read) onRead(item.id);
                onOpen?.(item);
              }}
            >
              <Card style={!read ? { borderColor: colors.gold, backgroundColor: colors.paper } : undefined}>
                <Row gap={spacing.sm} style={{ alignItems: 'flex-start' }}>
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 19,
                      backgroundColor: read ? colors.cream : '#F8E7BF',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon name={iconFor(item)} size={19} color={read ? colors.muted : colors.goldDark} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Row style={{ justifyContent: 'space-between' }}>
                      <Text variant="titleSmall" style={{ color: colors.ink, flex: 1 }}>
                        {item.title || 'Aviso'}
                      </Text>
                      {!read ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.gold }} /> : null}
                    </Row>
                    {item.body || item.message ? (
                      <Text variant="bodyMedium" style={{ color: colors.muted, marginTop: 2 }}>
                        {item.body || item.message}
                      </Text>
                    ) : null}
                    <Text variant="labelSmall" style={{ color: colors.tabInactive, marginTop: 6 }}>
                      {formatRelative(item.createdAt)}
                    </Text>
                  </View>
                </Row>
              </Card>
            </Pressable>
          );
        })
      )}
    </Screen>
  );
}
