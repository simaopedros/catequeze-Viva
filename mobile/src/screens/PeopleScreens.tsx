import React, { useMemo, useState } from 'react';
import { Text } from 'react-native';
import { Card, EmptyState, ErrorState, Field, LoadingState, PersonRow, Screen, ScreenTitle } from '../components/ui';
import { asList, personName } from '../format';
import { colors, type } from '../theme';

export function PeopleListScreen({
  title,
  subtitle,
  payload,
  loading,
  error,
  onOpen,
  testID,
}: {
  title: string;
  subtitle: string;
  payload: any;
  loading?: boolean;
  error?: string | null;
  onOpen: (id: string) => void;
  testID: string;
}) {
  const [query, setQuery] = useState('');
  const items = useMemo(() => {
    const rows = asList(payload);
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) => personName(row).toLowerCase().includes(needle));
  }, [payload, query]);

  return (
    <Screen testID={testID}>
      <ScreenTitle title={title} subtitle={subtitle} />
      <Field label="Buscar por nome" value={query} onChangeText={setQuery} autoCapitalize="words" testID="people-search" />
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState title="Lista indisponível" body={error} /> : null}
      {!loading && !error && items.length === 0 ? (
        <EmptyState title="Ninguém por aqui" body="A busca não encontrou pessoas neste espaço." />
      ) : (
        items.map((row) => (
          <PersonRow
            key={row.id}
            name={personName(row)}
            detail={row.enrollments?.[0]?.class?.name || row.household?.name || row.parish?.name || ''}
            onPress={() => onOpen(row.id)}
            testID={`person-${row.id}`}
          />
        ))
      )}
    </Screen>
  );
}

export function PersonDetailScreen({
  title,
  payload,
  loading,
  error,
  lines,
}: {
  title: string;
  payload: any;
  loading?: boolean;
  error?: string | null;
  lines: { label: string; value?: string | null }[];
}) {
  return (
    <Screen testID="person-detail">
      <ScreenTitle title={payload ? personName(payload, title) : title} />
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState title="Ficha indisponível" body={error} /> : null}
      {lines.map((line) =>
        line.value ? (
          <Card key={line.label}>
            <Text style={{ color: colors.muted, fontFamily: type.body, fontSize: 13 }}>{line.label}</Text>
            <Text style={{ color: colors.ink, fontFamily: type.bodyMedium, marginTop: 4 }}>{line.value}</Text>
          </Card>
        ) : null,
      )}
    </Screen>
  );
}
