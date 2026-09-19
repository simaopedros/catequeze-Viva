import React, { useMemo, useState } from 'react';
import { EmptyState, ListCard, ListRow, PrimaryFab, Screen, ScreenTitle, SearchBar, SkeletonList } from '../components/ui';
import { fullName } from '../utils/format';

export function asFamilyList(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.households)) return payload.households;
  return [];
}

export function FamiliesListScreen({
  payload,
  loading,
  error,
  onOpen,
  onCreate,
  refreshing,
  onRefresh,
}: {
  payload: any;
  loading?: boolean;
  error?: string | null;
  onOpen: (id: string) => void;
  onCreate?: () => void;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  const [query, setQuery] = useState('');
  const items = asFamilyList(payload);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => `${item.name ?? ''} ${(item.guardians ?? []).map((g: any) => fullName(g.user)).join(' ')}`.toLowerCase().includes(q));
  }, [items, query]);

  return (
    <Screen
      testID="families-screen"
      refreshing={refreshing}
      onRefresh={onRefresh}
      fab={onCreate ? <PrimaryFab icon="home-plus-outline" label="Nova" onPress={onCreate} testID="create-family" /> : undefined}
    >
      <ScreenTitle title="Famílias" subtitle={items.length ? `${items.length} agregados` : 'Agregados familiares e responsáveis.'} />
      {items.length > 5 ? <SearchBar value={query} onChangeText={setQuery} placeholder="Procurar família ou responsável" testID="families-search" /> : null}
      {loading && items.length === 0 ? <SkeletonList rows={4} /> : null}
      {error ? <EmptyState icon="cloud-off-outline" title="Famílias indisponíveis" body={error} /> : null}
      {!loading && items.length === 0 && !error ? (
        <EmptyState icon="home-heart" title="Sem famílias" body="Ainda não há famílias registadas neste espaço." action={onCreate ? 'Criar família' : undefined} onAction={onCreate} />
      ) : null}
      {filtered.length > 0 ? (
        <ListCard>
          {filtered.map((item, index) => {
            const guardians = (item.guardians ?? []).map((g: any) => fullName(g.user, '')).filter(Boolean);
            const count = item._count?.catechumens ?? item.catechumens?.length;
            return (
              <ListRow
                key={item.id}
                testID={`family-${item.id}`}
                icon="home-outline"
                title={item.name || 'Família'}
                subtitle={guardians.join(', ') || item.community?.name || 'Sem responsáveis'}
                meta={count != null ? `${count} cateq.` : undefined}
                onPress={() => onOpen(item.id)}
                last={index === filtered.length - 1}
              />
            );
          })}
        </ListCard>
      ) : null}
    </Screen>
  );
}
