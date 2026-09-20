import React from 'react';
import { AppText, Card, EmptyState, ErrorState, LoadingState, Screen, ScreenTitle, TextButton } from '../components/ui';
import { copy } from '../copy/ptBR';

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
  onRefresh,
  refreshing,
}: {
  payload: any;
  loading?: boolean;
  error?: string | null;
  onRead: (id: string) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  const items = asNotifications(payload);
  return (
    <Screen testID="notifications-screen" onRefresh={onRefresh} refreshing={refreshing}>
      <ScreenTitle title={copy.notifications.title} />
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState title={copy.notifications.errorTitle} body={error} /> : null}
      {items.length === 0 && !loading ? (
        <EmptyState title={copy.notifications.emptyTitle} body={copy.notifications.emptyBody} icon="notifications-outline" />
      ) : (
        items.map((item: any) => (
          <Card key={item.id}>
            <AppText variant="titleSm">{item.title || copy.notifications.fallback}</AppText>
            <AppText variant="bodySm" color="secondary" style={{ marginTop: 4 }}>
              {item.body || item.message || ''}
            </AppText>
            {!item.readAt ? (
              <TextButton label={copy.notifications.markRead} onPress={() => onRead(item.id)} />
            ) : null}
          </Card>
        ))
      )}
    </Screen>
  );
}
