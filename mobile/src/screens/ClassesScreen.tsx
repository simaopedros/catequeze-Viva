import React from 'react';
import { EmptyState, ErrorState, ListRow, LoadingState, Screen, ScreenTitle } from '../components/ui';
import { copy } from '../copy/ptBR';

type ClassItem = {
  id: string;
  name?: string;
  year?: string | number;
  community?: { name?: string };
};

function asList(payload: any): ClassItem[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.classes)) return payload.classes;
  return [];
}

export function ClassesScreen({
  payload,
  loading,
  error,
  onOpen,
  onRefresh,
  refreshing,
}: {
  payload: any;
  loading?: boolean;
  error?: string | null;
  onOpen: (id: string) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  const items = asList(payload);
  return (
    <Screen testID="classes-screen" onRefresh={onRefresh} refreshing={refreshing}>
      <ScreenTitle title={copy.classes.title} subtitle={copy.classes.subtitle} />
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState title={copy.classes.errorTitle} body={error} /> : null}
      {!loading && items.length === 0 ? (
        <EmptyState title={copy.classes.emptyTitle} body={copy.classes.emptyBody} />
      ) : (
        items.map((item) => (
          <ListRow
            key={item.id}
            testID={`class-${item.id}`}
            title={item.name || copy.classes.fallback}
            meta={`${item.community?.name || copy.classes.community}${item.year ? ` · ${item.year}` : ''}`}
            onPress={() => onOpen(item.id)}
          />
        ))
      )}
    </Screen>
  );
}

export { asList as asClassList };
