import React from 'react';
import { Pressable, View } from 'react-native';
import { Text } from 'react-native-paper';
import { BrandButton, Card, EmptyState, FilterChips, Icon, ListCard, ListRow, Row, Screen, ScreenTitle, SearchBar, SectionHeader, SkeletonList, type IconName } from '../components/ui';
import type { BibleFavorite } from '../storage/readingPrefs';
import { colors, fontFamilies, spacing } from '../theme';

export type ReferenceResult = { id: string; title: string; body?: string | null; meta?: string | null; onPress?: () => void };

/** Pesquisa genérica (Bíblia, Catecismo, Diretório) com resultados em cartões. */
export function ReferenceSearchScreen({
  title,
  subtitle,
  placeholder,
  query,
  onChangeQuery,
  results,
  loading,
  error,
  minChars = 2,
  testID,
  children,
}: {
  title: string;
  subtitle?: string;
  placeholder?: string;
  query: string;
  onChangeQuery: (value: string) => void;
  results: ReferenceResult[];
  loading?: boolean;
  error?: string | null;
  minChars?: number;
  testID?: string;
  children?: React.ReactNode;
}) {
  const short = query.trim().length < minChars;
  return (
    <Screen testID={testID}>
      <ScreenTitle title={title} subtitle={subtitle} />
      <SearchBar value={query} onChangeText={onChangeQuery} placeholder={placeholder} testID={`${testID ?? 'reference'}-input`} autoFocus />
      {children}
      {loading ? <SkeletonList rows={3} /> : null}
      {error ? <EmptyState icon="cloud-off-outline" title="Pesquisa indisponível" body={error} /> : null}
      {!short && !loading && !error && results.length === 0 ? <EmptyState icon="magnify-close" title="Nada encontrado" body="Tente outra palavra." /> : null}
      {results.map((result) => (
        <Card key={result.id} onPress={result.onPress} testID={`result-${result.id}`}>
          <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Text variant="titleSmall" style={{ color: colors.goldDark, flex: 1 }}>
              {result.title}
            </Text>
            {result.meta ? (
              <Text variant="labelSmall" style={{ color: colors.muted }}>
                {result.meta}
              </Text>
            ) : null}
          </Row>
          {result.body ? (
            <Text variant="bodyMedium" style={{ color: colors.inkSoft, lineHeight: 22, marginTop: 4 }} numberOfLines={6}>
              {result.body}
            </Text>
          ) : null}
        </Card>
      ))}
    </Screen>
  );
}

export function BibleFavoritesScreen({
  items,
  loading,
  onOpen,
  onRemove,
}: {
  items: BibleFavorite[];
  loading?: boolean;
  onOpen: (item: BibleFavorite) => void;
  onRemove: (item: BibleFavorite) => void;
}) {
  return (
    <Screen testID="bible-favorites-screen">
      <ScreenTitle title="Versículos guardados" subtitle="Os seus favoritos ficam neste telemóvel." />
      {loading ? <SkeletonList rows={3} /> : null}
      {!loading && items.length === 0 ? <EmptyState icon="bookmark-outline" title="Sem favoritos" body="Toque num versículo e escolha “Guardar” para o encontrar aqui." /> : null}
      {items.map((item) => (
        <Card key={`${item.bookId}-${item.chapter}-${item.verse}`} onPress={() => onOpen(item)}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text variant="titleSmall" style={{ color: colors.goldDark }}>
              {item.bookName} {item.chapter}:{item.verse}
            </Text>
            <Pressable onPress={() => onRemove(item)} accessibilityLabel="Remover dos favoritos" style={{ padding: 4 }}>
              <Icon name="bookmark-remove-outline" size={20} color={colors.muted} />
            </Pressable>
          </Row>
          <Text style={{ color: colors.inkSoft, lineHeight: 24, marginTop: 4, fontFamily: fontFamilies.regular, fontStyle: 'italic' }}>“{item.text}”</Text>
        </Card>
      ))}
    </Screen>
  );
}

export const CATECHISM_CATEGORIES: { value: string; label: string; icon: IconName; hint: string }[] = [
  { value: 'creed', label: 'Credo', icon: 'cross-outline', hint: 'A profissão da fé' },
  { value: 'sacraments', label: 'Sacramentos', icon: 'water-outline', hint: 'A celebração do mistério cristão' },
  { value: 'commandments', label: 'Mandamentos', icon: 'scale-balance', hint: 'A vida em Cristo' },
  { value: 'prayer', label: 'Oração', icon: 'hands-pray', hint: 'A oração cristã' },
  { value: 'virtues', label: 'Virtudes', icon: 'heart-outline', hint: 'Fé, esperança e caridade' },
  { value: 'sin', label: 'Pecado e graça', icon: 'weather-sunset-up', hint: 'Conversão e misericórdia' },
];

export function CatechismHomeScreen({
  category,
  onChangeCategory,
  entries,
  loading,
  error,
  onOpenEntry,
  onSearch,
}: {
  category: string | null;
  onChangeCategory: (value: string) => void;
  entries: any[];
  loading?: boolean;
  error?: string | null;
  onOpenEntry: (number: number) => void;
  onSearch: () => void;
}) {
  return (
    <Screen testID="catechism-screen">
      <ScreenTitle
        title="Catecismo"
        subtitle="Perguntas e respostas do Catecismo da Igreja Católica."
        action={
          <Pressable onPress={onSearch} testID="catechism-search" style={{ padding: 6 }}>
            <Icon name="text-search" size={26} color={colors.ink} />
          </Pressable>
        }
      />
      {!category ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {CATECHISM_CATEGORIES.map((item) => (
            <Pressable
              key={item.value}
              testID={`catechism-category-${item.value}`}
              onPress={() => onChangeCategory(item.value)}
              style={({ pressed }) => ({ width: '47.5%', backgroundColor: pressed ? colors.paper : colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: 16, padding: spacing.md, gap: 6 })}
            >
              <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#F8E7BF', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={item.icon} size={20} color={colors.goldDark} />
              </View>
              <Text variant="titleSmall" style={{ color: colors.ink }}>
                {item.label}
              </Text>
              <Text variant="bodySmall" style={{ color: colors.muted }}>
                {item.hint}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <>
          <FilterChips value={category} onChange={onChangeCategory} options={CATECHISM_CATEGORIES.map((item) => ({ value: item.value, label: item.label, icon: item.icon }))} />
          {loading && entries.length === 0 ? <SkeletonList rows={4} /> : null}
          {error ? <EmptyState icon="cloud-off-outline" title="Catecismo indisponível" body={error} /> : null}
          {!loading && !error && entries.length === 0 ? <EmptyState icon="book-off-outline" title="Sem entradas" body="Esta categoria ainda não tem conteúdo carregado." /> : null}
          {entries.length > 0 ? (
            <ListCard>
              {entries.map((entry, index) => (
                <ListRow
                  key={entry.id || entry.number}
                  testID={`catechism-entry-${entry.number}`}
                  meta={`§ ${entry.number}`}
                  title={entry.question}
                  onPress={() => onOpenEntry(entry.number)}
                  last={index === entries.length - 1}
                />
              ))}
            </ListCard>
          ) : null}
        </>
      )}
    </Screen>
  );
}

export function ReferenceEntryScreen({
  eyebrow,
  title,
  body,
  loading,
  error,
  onPrev,
  onNext,
  onShare,
  onCopy,
  testID,
}: {
  eyebrow?: string;
  title?: string | null;
  body?: string | null;
  loading?: boolean;
  error?: string | null;
  onPrev?: () => void;
  onNext?: () => void;
  onShare?: () => void;
  onCopy?: () => void;
  testID?: string;
}) {
  return (
    <Screen testID={testID}>
      {loading && !body ? <SkeletonList rows={2} /> : null}
      {error ? <EmptyState icon="cloud-off-outline" title="Entrada indisponível" body={error} /> : null}
      {body ? (
        <Card style={{ paddingVertical: spacing.lg }}>
          {eyebrow ? (
            <Text variant="labelMedium" style={{ color: colors.goldDark, letterSpacing: 1, marginBottom: spacing.xs }}>
              {eyebrow}
            </Text>
          ) : null}
          {title ? (
            <Text style={{ fontFamily: fontFamilies.display, fontSize: 24, color: colors.ink, marginBottom: spacing.sm, lineHeight: 30 }}>{title}</Text>
          ) : null}
          <Text variant="bodyLarge" style={{ color: colors.inkSoft, lineHeight: 27 }}>
            {body}
          </Text>
          <Row style={{ marginTop: spacing.md, flexWrap: 'wrap' }}>
            {onShare ? <BrandButton variant="ghost" icon="share-variant-outline" label="Partilhar" onPress={onShare} style={{ flex: 1 }} /> : null}
            {onCopy ? <BrandButton variant="text" icon="content-copy" label="Copiar" onPress={onCopy} /> : null}
          </Row>
        </Card>
      ) : null}
      {onPrev || onNext ? (
        <Row style={{ justifyContent: 'space-between' }}>
          <BrandButton variant="ghost" icon="chevron-left" label="Anterior" onPress={onPrev ?? (() => undefined)} disabled={!onPrev} style={{ flex: 1 }} />
          <BrandButton variant="ghost" icon="chevron-right" label="Seguinte" onPress={onNext ?? (() => undefined)} disabled={!onNext} style={{ flex: 1 }} />
        </Row>
      ) : null}
    </Screen>
  );
}

export const DIRECTORY_PARTS = [
  { value: 'I', label: 'Parte I', hint: 'A catequese na missão evangelizadora da Igreja' },
  { value: 'II', label: 'Parte II', hint: 'O processo da catequese' },
  { value: 'III', label: 'Parte III', hint: 'A catequese nas Igrejas particulares' },
];

export function DirectoryHomeScreen({
  part,
  onChangePart,
  entries,
  loading,
  error,
  onOpenEntry,
  onSearch,
}: {
  part: string | null;
  onChangePart: (value: string) => void;
  entries: any[];
  loading?: boolean;
  error?: string | null;
  onOpenEntry: (number: number) => void;
  onSearch: () => void;
}) {
  return (
    <Screen testID="directory-screen">
      <ScreenTitle
        title="Diretório para a Catequese"
        subtitle="Orientações da Igreja para a ação catequética."
        action={
          <Pressable onPress={onSearch} testID="directory-search" style={{ padding: 6 }}>
            <Icon name="text-search" size={26} color={colors.ink} />
          </Pressable>
        }
      />
      <SectionHeader title="Partes" icon="book-information-variant" />
      <ListCard>
        {DIRECTORY_PARTS.map((item, index) => (
          <ListRow
            key={item.value}
            testID={`directory-part-${item.value}`}
            icon={part === item.value ? 'book-open-variant' : 'book-outline'}
            title={item.label}
            subtitle={item.hint}
            onPress={() => onChangePart(item.value)}
            last={index === DIRECTORY_PARTS.length - 1}
          />
        ))}
      </ListCard>
      {part ? (
        <>
          <SectionHeader title={`Números da ${DIRECTORY_PARTS.find((item) => item.value === part)?.label ?? part}`} />
          {loading && entries.length === 0 ? <SkeletonList rows={4} /> : null}
          {error ? <EmptyState icon="cloud-off-outline" title="Diretório indisponível" body={error} /> : null}
          {!loading && !error && entries.length === 0 ? <EmptyState icon="book-off-outline" title="Sem entradas" body="Esta parte ainda não tem conteúdo carregado." /> : null}
          {entries.length > 0 ? (
            <ListCard>
              {entries.map((entry, index) => (
                <ListRow
                  key={entry.id || entry.number}
                  testID={`directory-entry-${entry.number}`}
                  meta={`n. ${entry.number}`}
                  title={entry.title || (entry.content || '').slice(0, 80)}
                  subtitle={entry.chapter || undefined}
                  onPress={() => onOpenEntry(entry.number)}
                  last={index === entries.length - 1}
                />
              ))}
            </ListCard>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}
