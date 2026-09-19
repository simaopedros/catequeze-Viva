import React, { useMemo, useState } from 'react';
import { EmptyState, ListCard, ListRow, PrimaryFab, Screen, ScreenTitle, SearchBar, SkeletonList, Tag } from '../components/ui';

type ClassItem = {
  id: string;
  name?: string;
  year?: string | number;
  status?: string;
  community?: { name?: string };
  _count?: { enrollments?: number };
};

function asList(payload: any): ClassItem[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.classes)) return payload.classes;
  return [];
}

const STATUS_LABEL: Record<string, { label: string; tone: 'success' | 'warning' | 'neutral' | 'info' }> = {
  ACTIVE: { label: 'Ativa', tone: 'success' },
  PAUSED: { label: 'Pausada', tone: 'warning' },
  COMPLETED: { label: 'Concluída', tone: 'info' },
  ARCHIVED: { label: 'Arquivada', tone: 'neutral' },
  DRAFT: { label: 'Rascunho', tone: 'neutral' },
};

export function ClassesScreen({
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
  const items = asList(payload);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => `${item.name ?? ''} ${item.community?.name ?? ''}`.toLowerCase().includes(q));
  }, [items, query]);

  return (
    <Screen
      testID="classes-screen"
      safeTop
      refreshing={refreshing}
      onRefresh={onRefresh}
      fab={onCreate ? <PrimaryFab icon="plus" label="Nova turma" onPress={onCreate} testID="create-class" /> : undefined}
    >
      <ScreenTitle title="Turmas" subtitle="Encontros, catequizandos e presença." />
      {items.length > 3 ? <SearchBar value={query} onChangeText={setQuery} placeholder="Procurar turma" testID="classes-search" /> : null}
      {loading && items.length === 0 ? <SkeletonList rows={4} /> : null}
      {error ? <EmptyState icon="cloud-off-outline" title="Turmas indisponíveis" body={error} /> : null}
      {!loading && items.length === 0 && !error ? (
        <EmptyState
          icon="school-outline"
          title="Sem turmas"
          body="Quando pertencer a uma turma, ela aparece aqui."
          action={onCreate ? 'Criar turma' : undefined}
          onAction={onCreate}
        />
      ) : null}
      {filtered.length > 0 ? (
        <ListCard>
          {filtered.map((item, index) => {
            const status = item.status ? STATUS_LABEL[item.status] : null;
            const enrolled = item._count?.enrollments;
            return (
              <ListRow
                key={item.id}
                testID={`class-${item.id}`}
                icon="school-outline"
                title={item.name || 'Turma'}
                subtitle={[item.community?.name, item.year ? String(item.year) : null, enrolled != null ? `${enrolled} inscritos` : null]
                  .filter(Boolean)
                  .join(' · ')}
                right={status ? <Tag label={status.label} tone={status.tone} /> : undefined}
                onPress={() => onOpen(item.id)}
                last={index === filtered.length - 1}
              />
            );
          })}
        </ListCard>
      ) : null}
      {!loading && items.length > 0 && filtered.length === 0 ? (
        <EmptyState icon="magnify" title="Sem resultados" body="Nenhuma turma corresponde à pesquisa." />
      ) : null}
    </Screen>
  );
}

export { asList as asClassList };
