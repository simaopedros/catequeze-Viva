import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import {
  ClassListDivider,
  ClassListItem,
  ClassesScreenHeader,
  ClassesSearchBar,
} from '../components/classesUi';
import { EmptyState, LoadingState, Screen } from '../components/ui';

type ClassItem = {
  id: string;
  name?: string;
  year?: string | number;
  community?: { name?: string };
  _count?: { enrollments?: number };
  enrollmentCount?: number;
};

function asList(payload: any): ClassItem[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.classes)) return payload.classes;
  return [];
}

function enrollmentOf(item: ClassItem) {
  return item.enrollmentCount ?? item._count?.enrollments ?? 0;
}

export function ClassesScreen({
  payload,
  loading,
  error,
  onOpen,
  onLinkPress,
}: {
  payload: any;
  loading?: boolean;
  error?: string | null;
  onOpen: (id: string) => void;
  onLinkPress?: () => void;
}) {
  const [query, setQuery] = useState('');
  const items = asList(payload);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const name = (item.name || '').toLowerCase();
      const community = (item.community?.name || '').toLowerCase();
      return name.includes(q) || community.includes(q);
    });
  }, [items, query]);

  return (
    <Screen testID="classes-screen" safeAreaEdges={['top', 'left', 'right']}>
      <ClassesScreenHeader onLinkPress={onLinkPress} />
      <ClassesSearchBar value={query} onChangeText={setQuery} />

      {loading ? <LoadingState /> : null}
      {error ? <EmptyState title="Turmas indisponíveis" body={error} /> : null}

      {!loading && !error && filtered.length === 0 ? (
        <EmptyState
          title={query ? 'Nenhuma turma encontrada' : 'Sem turmas'}
          body={query ? 'Tente outro termo na busca.' : 'Quando pertencer a uma turma, ela aparece aqui.'}
        />
      ) : null}

      {!loading && !error ? (
        <View testID="classes-list">
          {filtered.map((item, index) => (
            <View key={item.id}>
              <ClassListItem
                testID={`class-${item.id}`}
                name={item.name || 'Turma'}
                enrollmentCount={enrollmentOf(item)}
                index={index}
                onPress={() => onOpen(item.id)}
              />
              {index < filtered.length - 1 ? <ClassListDivider /> : null}
            </View>
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

export { asList as asClassList };
