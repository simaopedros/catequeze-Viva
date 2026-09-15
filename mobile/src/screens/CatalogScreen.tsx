import React from 'react';
import { CrudBar, EmptyState, LoadingState, PersonRow, Screen, ScreenTitle } from '../components/ui';

export type CatalogRow = {
  id: string;
  title: string;
  subtitle?: string;
  photoUrl?: string | null;
};

export function CatalogScreen({
  title,
  subtitle,
  items,
  loading,
  error,
  emptyTitle,
  emptyBody,
  onOpen,
  testID,
  header,
  onCreate,
  createLabel,
  canWrite,
}: {
  title: string;
  subtitle: string;
  items: CatalogRow[];
  loading?: boolean;
  error?: string | null;
  emptyTitle: string;
  emptyBody: string;
  onOpen?: (id: string) => void;
  testID?: string;
  header?: React.ReactNode;
  onCreate?: () => void;
  createLabel?: string;
  canWrite?: boolean;
}) {
  return (
    <Screen testID={testID}>
      <ScreenTitle title={title} subtitle={subtitle} />
      <CrudBar canWrite={canWrite} onCreate={onCreate} createLabel={createLabel} />
      {header}
      {loading ? <LoadingState /> : null}
      {error ? <EmptyState title="Não foi possível carregar" body={error} /> : null}
      {!loading && !error && items.length === 0 ? (
        <EmptyState title={emptyTitle} body={emptyBody} />
      ) : null}
      {items.map((item) => (
        <PersonRow
          key={item.id}
          testID={`item-${item.id}`}
          name={item.title}
          hint={item.subtitle}
          photoUrl={item.photoUrl}
          onPress={onOpen ? () => onOpen(item.id) : undefined}
        />
      ))}
    </Screen>
  );
}
