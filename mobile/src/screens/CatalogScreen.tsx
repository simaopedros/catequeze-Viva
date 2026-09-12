import React from 'react';
import { Pressable, Text } from 'react-native';
import { Card, EmptyState, LoadingState, Screen, ScreenTitle } from '../components/ui';
import { colors } from '../theme';

export type CatalogRow = {
  id: string;
  title: string;
  subtitle?: string;
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
}) {
  return (
    <Screen testID={testID}>
      <ScreenTitle title={title} subtitle={subtitle} />
      {header}
      {loading ? <LoadingState /> : null}
      {error ? <EmptyState title="Não foi possível carregar" body={error} /> : null}
      {!loading && !error && items.length === 0 ? (
        <EmptyState title={emptyTitle} body={emptyBody} />
      ) : null}
      {items.map((item) => {
        const inner = (
          <Card>
            <Text style={{ color: colors.ink, fontWeight: '700', fontSize: 17 }}>{item.title}</Text>
            {item.subtitle ? (
              <Text style={{ color: colors.muted, marginTop: 4 }}>{item.subtitle}</Text>
            ) : null}
          </Card>
        );
        if (!onOpen) return <React.Fragment key={item.id}>{inner}</React.Fragment>;
        return (
          <Pressable key={item.id} testID={`item-${item.id}`} onPress={() => onOpen(item.id)}>
            {inner}
          </Pressable>
        );
      })}
    </Screen>
  );
}
