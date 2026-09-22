import React, { useMemo, useState } from 'react';
import {
  DetailRow,
  EmptyState,
  ErrorState,
  ListRow,
  LoadingState,
  Screen,
  ScreenTitle,
  SearchInput,
} from '../components/ui';

export function CatechumenDetailScreen({ profile, loading, error }: { profile: any; loading?: boolean; error?: string | null }) {
  if (loading) return <Screen><LoadingState /></Screen>;
  if (error || !profile) return <Screen><ErrorState title="Ficha indisponível" /></Screen>;

  const name = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || profile.displayName;
  const className =
    profile.enrollments?.find((e: any) => e?.class?.name)?.class?.name ||
    profile.class?.name;
  const fields = [
    className ? { label: 'Turma', value: className } : null,
    profile.household?.name ? { label: 'Família', value: profile.household.name } : null,
    profile.parish?.name ? { label: 'Paróquia', value: profile.parish.name } : null,
    profile.email ? { label: 'E-mail', value: profile.email } : null,
    profile.phone ? { label: 'Telefone', value: profile.phone } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <Screen>
      <ScreenTitle title="Catequizando" subtitle={name} />
      {fields.map((field) => <DetailRow key={field.label} label={field.label} value={field.value} />)}
    </Screen>
  );
}

export function FamiliesScreen({
  rows,
  loading,
  error,
  onOpen,
}: {
  rows: any[];
  loading?: boolean;
  error?: string | null;
  onOpen: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => String(row.name || row.label || '').toLowerCase().includes(q));
  }, [query, rows]);

  return (
    <Screen testID="families-screen">
      <ScreenTitle title="Famílias" subtitle="Agregados e contactos." />
      <SearchInput placeholder="Buscar por nome" value={query} onChangeText={setQuery} />
      {loading ? <LoadingState /> : null}
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
      <ScreenTitle title="Família" subtitle={household.name} />
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
