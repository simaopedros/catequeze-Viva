import React, { useState } from 'react';
import { Pressable, Text } from 'react-native';
import { BrandButton, Card, EmptyState, ErrorState, Field, LoadingState, Screen, ScreenTitle } from '../components/ui';
import { colors, type } from '../theme';

export const CATECHISM_CATEGORIES = [
  { id: 'creed', label: 'O Credo' },
  { id: 'sacraments', label: 'Os Sacramentos' },
  { id: 'commandments', label: 'Os Mandamentos' },
  { id: 'prayer', label: 'A Oração' },
  { id: 'virtues', label: 'As Virtudes' },
  { id: 'sin', label: 'O Pecado' },
] as const;

export function CatechismHomeScreen({
  entries,
  loading,
  error,
  onSearch,
  onOpenCategory,
  onOpenEntry,
}: {
  entries: any[];
  loading?: boolean;
  error?: string | null;
  onSearch: (query: string) => void;
  onOpenCategory: (category: string) => void;
  onOpenEntry: (number: number) => void;
}) {
  const [query, setQuery] = useState('');
  return (
    <Screen testID="catechism-screen">
      <ScreenTitle title="Catecismo" subtitle="Catecismo da Igreja Católica." />
      <Field label="Buscar" value={query} onChangeText={setQuery} testID="catechism-query" />
      <BrandButton label="Buscar" onPress={() => onSearch(query)} testID="catechism-search" />
      {CATECHISM_CATEGORIES.map((category) => (
        <Pressable key={category.id} onPress={() => onOpenCategory(category.id)} testID={`catechism-${category.id}`}>
          <Card>
            <Text style={{ color: colors.ink, fontFamily: type.bodyBold }}>{category.label}</Text>
          </Card>
        </Pressable>
      ))}
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState title="Busca indisponível" body={error} /> : null}
      {entries.map((entry) => (
        <Pressable key={entry.number} onPress={() => onOpenEntry(entry.number)}>
          <Card>
            <Text style={{ color: colors.goldDark, fontFamily: type.bodyBold }}>{entry.number}</Text>
            <Text style={{ color: colors.ink, marginTop: 4, fontFamily: type.body }} numberOfLines={3}>
              {entry.question || entry.title}
            </Text>
          </Card>
        </Pressable>
      ))}
      {!loading && entries.length === 0 ? (
        <EmptyState title="Escolha um caminho" body="Selecione uma categoria ou busque por uma palavra." />
      ) : null}
    </Screen>
  );
}

export function CatechismEntryScreen({
  entry,
  loading,
  error,
  onShare,
}: {
  entry: any;
  loading?: boolean;
  error?: string | null;
  onShare?: () => void;
}) {
  return (
    <Screen testID="catechism-entry">
      <ScreenTitle title={entry?.number ? `Número ${entry.number}` : 'Catecismo'} subtitle={entry?.question} />
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState title="Entrada indisponível" body={error} /> : null}
      {entry?.answer ? (
        <Text style={{ color: colors.inkSoft, fontFamily: type.body, fontSize: 17, lineHeight: 28 }}>{entry.answer}</Text>
      ) : null}
      {onShare && entry ? <BrandButton variant="ghost" label="Partilhar na Comunidade" onPress={onShare} /> : null}
    </Screen>
  );
}
