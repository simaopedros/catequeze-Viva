import React, { useMemo, useState } from 'react';
import { Avatar } from '../components/Avatar';
import { EmptyState, ListCard, ListRow, PrimaryFab, Screen, ScreenTitle, SearchBar, SkeletonList, Tag } from '../components/ui';
import { fullName } from '../utils/format';

export function asCatechumenList(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.catechumens)) return payload.catechumens;
  return [];
}

export function CatechumensListScreen({
  payload,
  loading,
  error,
  onOpen,
  onCreate,
  refreshing,
  onRefresh,
  safeTop,
}: {
  payload: any;
  loading?: boolean;
  error?: string | null;
  onOpen: (id: string) => void;
  onCreate?: () => void;
  refreshing?: boolean;
  onRefresh?: () => void;
  safeTop?: boolean;
}) {
  const [query, setQuery] = useState('');
  const items = asCatechumenList(payload);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => fullName(item).toLowerCase().includes(q));
  }, [items, query]);
  const withoutClass = items.filter((item) => !(item.enrollments?.length || item.class)).length;

  return (
    <Screen
      testID="catechumens-screen"
      safeTop={safeTop}
      refreshing={refreshing}
      onRefresh={onRefresh}
      fab={onCreate ? <PrimaryFab icon="account-plus-outline" label="Novo" onPress={onCreate} testID="create-catechumen" /> : undefined}
    >
      <ScreenTitle title="Catequizandos" subtitle={items.length ? `${items.length} inscritos${withoutClass ? ` · ${withoutClass} sem turma` : ''}` : 'Fichas, famílias e presenças.'} />
      {items.length > 5 ? <SearchBar value={query} onChangeText={setQuery} placeholder="Procurar por nome" testID="catechumens-search" /> : null}
      {loading && items.length === 0 ? <SkeletonList rows={5} /> : null}
      {error ? <EmptyState icon="cloud-off-outline" title="Catequizandos indisponíveis" body={error} /> : null}
      {!loading && items.length === 0 && !error ? (
        <EmptyState icon="account-child-outline" title="Sem catequizandos" body="Ainda não há catequizandos neste espaço." action={onCreate ? 'Criar ficha' : undefined} onAction={onCreate} />
      ) : null}
      {filtered.length > 0 ? (
        <ListCard>
          {filtered.map((item, index) => {
            const name = fullName(item, 'Catequizando');
            const className = item.enrollments?.[0]?.class?.name || item.class?.name;
            return (
              <ListRow
                key={item.id}
                testID={`catechumen-${item.id}`}
                left={<Avatar name={name} url={item.avatarUrl} size={38} />}
                title={name}
                subtitle={[className, item.household?.name].filter(Boolean).join(' · ') || 'Sem turma'}
                right={!className ? <Tag label="Sem turma" tone="warning" /> : undefined}
                onPress={() => onOpen(item.id)}
                last={index === filtered.length - 1}
              />
            );
          })}
        </ListCard>
      ) : null}
      {!loading && items.length > 0 && filtered.length === 0 ? <EmptyState icon="magnify" title="Sem resultados" body="Nenhum catequizando corresponde à pesquisa." /> : null}
    </Screen>
  );
}
