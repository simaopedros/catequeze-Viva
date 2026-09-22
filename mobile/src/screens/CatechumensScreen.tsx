import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import {
  asCatechumenRows,
  filterCatechumensByQuery,
  mapCatechumenListItem,
} from '../catechumens/catechumensPresentation';
import {
  CatechumenListDivider,
  CatechumenListItem,
  CatechumensScreenHeader,
  CatechumensSearchBar,
} from '../components/catechumensUi';
import { EmptyState, LoadingState, Screen } from '../components/ui';

export function CatechumensScreen({
  payload,
  loading,
  error,
  onOpen,
}: {
  payload: unknown;
  loading?: boolean;
  error?: string | null;
  onOpen: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const items = useMemo(() => asCatechumenRows(payload).map(mapCatechumenListItem), [payload]);
  const filtered = useMemo(() => filterCatechumensByQuery(items, query), [items, query]);

  return (
    <Screen testID="catechumens-screen" safeAreaEdges={['top', 'left', 'right']}>
      <CatechumensScreenHeader count={!loading && !error ? items.length : undefined} />
      <CatechumensSearchBar value={query} onChangeText={setQuery} />

      {loading ? <LoadingState /> : null}
      {error ? (
        <EmptyState title="Lista indisponível" body={error} />
      ) : null}

      {!loading && !error && filtered.length === 0 ? (
        <EmptyState
          title={query ? 'Nenhum catequizando encontrado' : 'Nenhum catequizando'}
          body={
            query
              ? 'Tente outro termo na busca.'
              : 'Quando houver catequizandos na sua paróquia, eles aparecem aqui.'
          }
        />
      ) : null}

      {!loading && !error ? (
        <View testID="catechumens-list">
          {filtered.map((item, index) => (
            <View key={item.id}>
              <CatechumenListItem
                testID={`catechumen-${item.id}`}
                item={item}
                index={index}
                onPress={() => onOpen(item.id)}
              />
              {index < filtered.length - 1 ? <CatechumenListDivider /> : null}
            </View>
          ))}
        </View>
      ) : null}
    </Screen>
  );
}
