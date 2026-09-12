import React from 'react';
import { Pressable, Text } from 'react-native';
import { BrandButton, Card, EmptyState, Field, LoadingState, Screen, ScreenTitle } from '../components/ui';
import { colors } from '../theme';

export function SearchReferenceScreen({
  title,
  subtitle,
  placeholder,
  query,
  onChangeQuery,
  onSearch,
  loading,
  error,
  results,
  onOpen,
  emptyTitle,
  emptyBody,
  testID,
}: {
  title: string;
  subtitle: string;
  placeholder: string;
  query: string;
  onChangeQuery: (value: string) => void;
  onSearch: () => void;
  loading?: boolean;
  error?: string | null;
  results: { id: string; title: string; subtitle?: string }[];
  onOpen?: (id: string) => void;
  emptyTitle: string;
  emptyBody: string;
  testID?: string;
}) {
  return (
    <Screen testID={testID}>
      <ScreenTitle title={title} subtitle={subtitle} />
      <Field label="Pesquisa" value={query} onChangeText={onChangeQuery} placeholder={placeholder} />
      <BrandButton label={loading ? 'A procurar…' : 'Procurar'} onPress={onSearch} disabled={loading} />
      {error ? <EmptyState title="Pesquisa indisponível" body={error} /> : null}
      {loading ? <LoadingState /> : null}
      {!loading && results.length === 0 ? <EmptyState title={emptyTitle} body={emptyBody} /> : null}
      {results.map((item) => (
        <Pressable key={item.id} onPress={() => onOpen?.(item.id)} disabled={!onOpen}>
          <Card>
            <Text style={{ color: colors.ink, fontWeight: '700' }}>{item.title}</Text>
            {item.subtitle ? <Text style={{ color: colors.muted, marginTop: 4 }}>{item.subtitle}</Text> : null}
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}
