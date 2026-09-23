import React, { useMemo, useState } from 'react';
import { Text } from 'react-native';
import {
  DetailRow,
  EmptyState,
  ErrorState,
  ListRow,
  LoadingState,
  Screen,
  ScreenIntro,
  SearchInput,
} from '../components/ui';
import { colors, spacing, typography } from '../theme';

export function FamiliesScreen({
  rows,
  loading,
  error,
  refreshing,
  onOpen,
  onRefresh,
}: {
  rows: any[];
  loading?: boolean;
  error?: string | null;
  refreshing?: boolean;
  onOpen: (id: string) => void;
  onRefresh?: () => void;
}) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => String(row.name || row.label || '').toLowerCase().includes(q));
  }, [query, rows]);

  return (
    <Screen testID="families-screen" onRefresh={onRefresh} refreshing={refreshing}>
      <ScreenIntro text="Agregados e contactos." />
      <SearchInput placeholder="Buscar por nome" value={query} onChangeText={setQuery} />
      {loading && filtered.length === 0 && rows.length === 0 ? <LoadingState /> : null}
      {error ? <ErrorState title="Lista indisponível" /> : null}
      {!loading && !error && filtered.length === 0 ? <EmptyState title="Ninguém por aqui" /> : null}
      {filtered.map((row) => (
        <ListRow
          key={row.id}
          title={row.name || row.label || 'Família'}
          subtitle={row.parish?.name || row.notes?.slice?.(0, 60)}
          onPress={() => onOpen(row.id)}
        />
      ))}
    </Screen>
  );
}

export function FamilyDetailScreen({ household, loading, error }: { household: any; loading?: boolean; error?: string | null }) {
  if (loading) return <Screen><LoadingState /></Screen>;
  if (error || !household) return <Screen><ErrorState title="Ficha indisponível" /></Screen>;

  const members = household.members || household.catechumens || [];

  return (
    <Screen>
      <Text style={{ ...typography.headingMd, color: colors.text.primary, marginBottom: spacing[3] }}>
        {household.name || 'Família'}
      </Text>
      {household.parish?.name ? <DetailRow label="Paróquia" value={household.parish.name} /> : null}
      {household.phone ? <DetailRow label="Telefone" value={household.phone} /> : null}
      {household.notes ? <DetailRow label="Notas" value={household.notes} /> : null}
      {members.length > 0 ? (
        members.map((member: any) => (
          <ListRow
            key={member.id}
            title={[member.firstName, member.lastName].filter(Boolean).join(' ') || member.name}
            avatarName={member.firstName || member.name}
          />
        ))
      ) : null}
    </Screen>
  );
}
