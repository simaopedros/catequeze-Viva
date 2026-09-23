import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { CatechismHeroCard, CatechismPartsGrid } from '../components/catechismUi';
import {
  Card,
  EmptyState,
  ErrorState,
  ListRow,
  LoadingState,
  Screen,
  ScreenIntro,
  PrimaryButton,
  SearchInput,
  SectionHeader,
} from '../components/ui';
import {
  MIN_CATECHISM_SEARCH_LENGTH,
  catechismCategoryTitle,
  catechismEntryListTitle,
  type CatechismListEntry,
  type CatechismPartKey,
} from '../catechism/catechismPresentation';
import { colors, spacing, typography } from '../theme';

export function CatechismHomeScreen({
  onOpenCategory,
  onOpenEntry,
  onSearch,
  results,
  activeCategory,
  listMode,
  loading,
  error,
  searching,
  onClearList,
}: {
  onOpenCategory: (key: CatechismPartKey) => void;
  onOpenEntry: (number: number) => void;
  onSearch: (q: string) => void;
  results: CatechismListEntry[];
  activeCategory?: string | null;
  listMode?: 'category' | 'search' | null;
  loading?: boolean;
  error?: string | null;
  searching?: boolean;
  onClearList?: () => void;
}) {
  const [query, setQuery] = useState('');
  const showParts = !listMode || results.length === 0;
  const sectionTitle =
    listMode === 'search'
      ? 'Resultados da pesquisa'
      : activeCategory
        ? catechismCategoryTitle(activeCategory)
        : null;

  const submitSearch = () => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_CATECHISM_SEARCH_LENGTH) return;
    onSearch(trimmed);
  };

  return (
    <Screen testID="catechism-screen">
      <CatechismHeroCard entryCount={listMode === 'category' ? results.length : undefined} />
      <ScreenIntro text="Escolha uma das seis partes ou pesquise no texto do CIC." />
      <SearchInput
        placeholder="Pesquisar no catecismo (mín. 3 letras)"
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={submitSearch}
        returnKeyType="search"
      />
      <PrimaryButton
        label={searching ? 'A pesquisar…' : 'Pesquisar'}
        variant="secondary"
        onPress={submitSearch}
        loading={searching}
        disabled={query.trim().length < MIN_CATECHISM_SEARCH_LENGTH || searching}
      />

      {showParts ? <CatechismPartsGrid activeKey={activeCategory} onSelect={onOpenCategory} /> : null}

      {listMode && sectionTitle ? (
        <SectionHeader
          title={sectionTitle}
          actionLabel={onClearList ? 'Ver partes' : undefined}
          onAction={onClearList}
        />
      ) : null}

      {loading ? <LoadingState /> : null}
      {error ? <ErrorState title="Catecismo indisponível" /> : null}

      {!loading && !error && listMode && results.length === 0 ? (
        <EmptyState
          title={listMode === 'search' ? 'Nenhum resultado' : 'Parte vazia'}
          body={
            listMode === 'search'
              ? 'Tente outras palavras ou abra uma das partes abaixo.'
              : 'Não há entradas nesta categoria no momento.'
          }
        />
      ) : null}

      {!loading && !error
        ? results.map((entry) => {
            const number = entry.number;
            if (number == null) return null;
            return (
              <ListRow
                key={String(entry.id ?? number)}
                testID={`catechism-entry-${number}`}
                title={catechismEntryListTitle(entry)}
                subtitle={entry.category ? catechismCategoryTitle(entry.category) : undefined}
                onPress={() => onOpenEntry(number)}
              />
            );
          })
        : null}
    </Screen>
  );
}

export function CatechismEntryScreen({
  entry,
  loading,
  error,
}: {
  entry: any;
  loading?: boolean;
  error?: string | null;
}) {
  if (loading) return <Screen><LoadingState /></Screen>;
  if (error || !entry) return <Screen><ErrorState title="Entrada indisponível" /></Screen>;

  const categoryLabel = catechismCategoryTitle(entry.category);

  return (
    <Screen testID="catechism-entry-screen">
      <Text style={styles.entryMeta}>
        {categoryLabel} · n.º {entry.number}
      </Text>
      <Text style={styles.entryQuestion}>{entry.question}</Text>
      <Card elevated>
        <Text style={styles.entryAnswer}>{entry.answer}</Text>
      </Card>
    </Screen>
  );
}

const styles = {
  entryMeta: {
    ...typography.bodySm,
    color: colors.text.muted,
    fontWeight: '600' as const,
    marginBottom: spacing[2],
  },
  entryQuestion: {
    ...typography.headingMd,
    color: colors.text.primary,
    marginBottom: spacing[4],
  },
  entryAnswer: {
    fontSize: 16,
    lineHeight: 26,
    color: colors.text.secondary,
  },
};
