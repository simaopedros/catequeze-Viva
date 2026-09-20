import React from 'react';
import { BrandButton, EmptyState, ErrorState, GroupedList, ListRow, LoadingState, Screen, ScreenTitle } from '../components/ui';
import { copy } from '../copy/ptBR';
import { asItems } from '../format';

export function NotificationsScreen({
  payload,
  loading,
  error,
  onRead,
  onReadAll,
  onRefresh,
  refreshing,
}: {
  payload: any;
  loading?: boolean;
  error?: string | null;
  onRead: (id: string) => void;
  onReadAll?: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  const items = asItems(payload);
  return (
    <Screen testID="notifications-screen" onRefresh={onRefresh} refreshing={refreshing}>
      <ScreenTitle title={copy.notifications.title} />
      {onReadAll ? <BrandButton variant="ghost" label={copy.notifications.markAll} onPress={onReadAll} /> : null}
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState title={copy.notifications.errorTitle} body={error} /> : null}
      {items.length === 0 && !loading ? (
        <EmptyState title={copy.notifications.emptyTitle} body={copy.notifications.emptyBody} icon="notifications-outline" />
      ) : (
        <GroupedList>
          {items.map((item: any) => (
            <ListRow
              key={item.id}
              title={item.title || copy.notifications.fallback}
              meta={item.body || item.message || (item.readAt ? '' : copy.notifications.markRead)}
              onPress={() => onRead(item.id)}
            />
          ))}
        </GroupedList>
      )}
    </Screen>
  );
}
