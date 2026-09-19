import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from 'react-native-paper';
import { BrandButton, Card, EmptyState, Icon, ListCard, ListRow, Row, Screen, ScreenTitle, SearchBar, SectionHeader, Segmented, SkeletonList } from '../components/ui';
import type { BibleBook, BibleChapter } from '../api/types';
import { colors, fontFamilies, radius, spacing } from '../theme';

const TESTAMENT_LABEL: Record<string, string> = { OT: 'Antigo Testamento', NT: 'Novo Testamento', OLD: 'Antigo Testamento', NEW: 'Novo Testamento' };

export function BibleBooksScreen({
  books,
  loading,
  error,
  onOpen,
  onSearch,
  recents,
  onOpenRecent,
  favoritesCount,
  onOpenFavorites,
}: {
  books: BibleBook[];
  loading?: boolean;
  error?: string | null;
  onOpen: (id: string) => void;
  onSearch?: () => void;
  recents?: { bookId: string; bookName: string; chapter: number }[];
  onOpenRecent?: (bookId: string, chapter: number) => void;
  favoritesCount?: number;
  onOpenFavorites?: () => void;
}) {
  const [query, setQuery] = useState('');
  const [testament, setTestament] = useState<'ALL' | 'OT' | 'NT'>('ALL');

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = books.filter((book) => {
      const t = String(book.testament || '').toUpperCase();
      const matchesTestament = testament === 'ALL' || (testament === 'OT' ? t.startsWith('O') || t === 'AT' : t.startsWith('N'));
      return matchesTestament && (!q || book.name.toLowerCase().includes(q));
    });
    const map = new Map<string, BibleBook[]>();
    for (const book of filtered) {
      const key = TESTAMENT_LABEL[String(book.testament || '').toUpperCase()] || book.testament || 'Livros';
      map.set(key, [...(map.get(key) ?? []), book]);
    }
    return Array.from(map.entries());
  }, [books, query, testament]);

  return (
    <Screen testID="bible-books-screen">
      <ScreenTitle
        title="Bíblia"
        subtitle="Leia e partilhe um versículo na Comunidade."
        action={
          <Row gap={2}>
            {onOpenFavorites ? (
              <Pressable onPress={onOpenFavorites} testID="bible-favorites" style={{ padding: 6 }} accessibilityLabel="Favoritos">
                <Icon name={favoritesCount ? 'bookmark' : 'bookmark-outline'} size={24} color={favoritesCount ? colors.goldDark : colors.ink} />
              </Pressable>
            ) : null}
            {onSearch ? (
              <Pressable onPress={onSearch} testID="bible-search" style={{ padding: 6 }} accessibilityLabel="Pesquisar">
                <Icon name="text-search" size={26} color={colors.ink} />
              </Pressable>
            ) : null}
          </Row>
        }
      />
      {recents && recents.length > 0 && onOpenRecent ? (
        <>
          <SectionHeader title="Continuar a ler" icon="history" />
          <Row style={{ flexWrap: 'wrap', marginBottom: spacing.sm }}>
            {recents.slice(0, 4).map((recent) => (
              <Pressable key={`${recent.bookId}-${recent.chapter}`} onPress={() => onOpenRecent(recent.bookId, recent.chapter)} style={{ backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 }}>
                <Text variant="labelMedium" style={{ color: colors.ink }}>
                  {recent.bookName} {recent.chapter}
                </Text>
              </Pressable>
            ))}
          </Row>
        </>
      ) : null}
      <SearchBar value={query} onChangeText={setQuery} placeholder="Procurar livro" testID="bible-book-filter" />
      <Segmented value={testament} onChange={setTestament} options={[{ value: 'ALL', label: 'Todos' }, { value: 'OT', label: 'Antigo' }, { value: 'NT', label: 'Novo' }]} />
      {loading && books.length === 0 ? <SkeletonList rows={5} /> : null}
      {error ? <EmptyState icon="cloud-off-outline" title="Bíblia indisponível" body={error} /> : null}
      {!loading && !error && books.length === 0 ? (
        <EmptyState icon="book-off-outline" title="Bíblia ainda não disponível" body="Os livros ainda não foram carregados neste servidor. Tente novamente mais tarde." />
      ) : null}
      {!loading && books.length > 0 && grouped.length === 0 ? <EmptyState icon="magnify" title="Sem resultados" body="Nenhum livro corresponde ao filtro." /> : null}
      {grouped.map(([label, list]) => (
        <View key={label}>
          <SectionHeader title={label} />
          <ListCard>
            {list.map((book, index) => (
              <ListRow
                key={book.id}
                testID={`bible-book-${book.id}`}
                icon="book-outline"
                title={book.name}
                meta={(book as any).chapterCount ? `${(book as any).chapterCount} cap.` : undefined}
                onPress={() => onOpen(book.id)}
                last={index === list.length - 1}
              />
            ))}
          </ListCard>
        </View>
      ))}
    </Screen>
  );
}

export function BibleBookScreen({
  book,
  loading,
  error,
  onOpenChapter,
}: {
  book?: BibleBook | null;
  loading?: boolean;
  error?: string | null;
  onOpenChapter: (chapter: number) => void;
}) {
  const chapters = book?.chapters ?? [];
  return (
    <Screen testID="bible-book-screen">
      <ScreenTitle eyebrow={TESTAMENT_LABEL[String(book?.testament || '').toUpperCase()]} title={book?.name || 'Livro'} subtitle={chapters.length ? `${chapters.length} capítulos` : undefined} />
      {loading && !book ? <SkeletonList rows={3} /> : null}
      {error ? <EmptyState icon="cloud-off-outline" title="Livro indisponível" body={error} /> : null}
      {chapters.length === 0 && !loading && !error ? (
        <EmptyState icon="book-off-outline" title="Sem capítulos" body="Este livro ainda não tem capítulos disponíveis." />
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {chapters.map((chapter) => (
            <Pressable
              key={chapter.id || chapter.number}
              testID={`bible-chapter-${chapter.number}`}
              onPress={() => onOpenChapter(chapter.number)}
              style={({ pressed }) => ({
                width: '18%',
                aspectRatio: 1,
                borderRadius: radius.md,
                backgroundColor: pressed ? colors.gold : colors.surface,
                borderWidth: 1,
                borderColor: colors.line,
                alignItems: 'center',
                justifyContent: 'center',
              })}
            >
              <Text variant="titleMedium" style={{ color: colors.ink }}>
                {chapter.number}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </Screen>
  );
}

export function BibleChapterScreen({
  chapter,
  loading,
  error,
  canPublish,
  onShareVerse,
  onShareVerseOS,
  onPrev,
  onNext,
  onCopyVerse,
  onToggleFavorite,
}: {
  chapter?: BibleChapter | null;
  loading?: boolean;
  error?: string | null;
  canPublish?: boolean;
  onShareVerse: (verseNumber: number, text: string) => void;
  onShareVerseOS?: (verseNumber: number, text: string) => void;
  onPrev?: () => void;
  onNext?: () => void;
  onCopyVerse?: (verseNumber: number, text: string) => void;
  onToggleFavorite?: (verseNumber: number, text: string) => void;
}) {
  const [fontScale, setFontScale] = useState(1);
  const [selected, setSelected] = useState<number | null>(null);
  const title = chapter?.book?.name ? `${chapter.book.name} ${chapter.number}` : `Capítulo ${chapter?.number ?? ''}`;
  const verses = chapter?.verses || [];
  const selectedVerse = verses.find((verse) => verse.number === selected);

  return (
    <Screen testID="bible-chapter-screen">
      <ScreenTitle
        eyebrow={chapter?.book?.name ? 'Bíblia' : undefined}
        title={title}
        action={
          <Row gap={4}>
            <Pressable onPress={() => setFontScale((value) => Math.max(0.85, value - 0.1))} style={{ padding: 6 }} accessibilityLabel="Diminuir letra">
              <Icon name="format-font-size-decrease" size={22} color={colors.ink} />
            </Pressable>
            <Pressable onPress={() => setFontScale((value) => Math.min(1.6, value + 0.1))} style={{ padding: 6 }} accessibilityLabel="Aumentar letra">
              <Icon name="format-font-size-increase" size={22} color={colors.ink} />
            </Pressable>
          </Row>
        }
      />
      {loading && !chapter ? <SkeletonList rows={4} /> : null}
      {error ? <EmptyState icon="cloud-off-outline" title="Capítulo indisponível" body={error} /> : null}
      {verses.length > 0 ? (
        <Card style={{ paddingVertical: spacing.md }}>
          <Text style={{ fontFamily: fontFamilies.display, fontSize: 26 * fontScale, color: colors.ink, marginBottom: spacing.sm, textAlign: 'center' }}>{title}</Text>
          <Text style={{ lineHeight: 30 * fontScale, color: colors.inkSoft, fontSize: 17 * fontScale }}>
            {verses.map((verse) => (
              <Text
                key={verse.number}
                testID={`verse-${verse.number}`}
                onPress={() => setSelected((current) => (current === verse.number ? null : verse.number))}
                style={{
                  color: colors.inkSoft,
                  fontSize: 17 * fontScale,
                  backgroundColor: selected === verse.number ? '#F8E7BF' : 'transparent',
                }}
              >
                <Text style={{ color: colors.goldDark, fontSize: 11 * fontScale, fontFamily: fontFamilies.bold }}>{verse.number} </Text>
                {verse.text}{' '}
              </Text>
            ))}
          </Text>
        </Card>
      ) : null}
      {selectedVerse ? (
        <Card tone="paper">
          <Text variant="labelMedium" style={{ color: colors.goldDark, marginBottom: 4 }}>
            VERSÍCULO {selectedVerse.number}
          </Text>
          <Text variant="bodyMedium" style={{ color: colors.ink, fontStyle: 'italic' }}>
            “{selectedVerse.text}”
          </Text>
          <Row style={{ flexWrap: 'wrap', marginTop: spacing.xs }}>
            {canPublish ? (
              <BrandButton variant="gold" icon="account-group-outline" label="Publicar na Comunidade" onPress={() => onShareVerse(selectedVerse.number, selectedVerse.text)} style={{ flex: 1 }} testID={`publish-verse-${selectedVerse.number}`} />
            ) : null}
            {onShareVerseOS ? (
              <BrandButton variant="ghost" icon="share-variant-outline" label="Partilhar" testID={`share-verse-${selectedVerse.number}`} onPress={() => onShareVerseOS(selectedVerse.number, selectedVerse.text)} style={{ flex: 1 }} />
            ) : null}
            {onCopyVerse ? <BrandButton variant="text" icon="content-copy" label="Copiar" onPress={() => onCopyVerse(selectedVerse.number, selectedVerse.text)} /> : null}
            {onToggleFavorite ? <BrandButton variant="text" icon="bookmark-outline" label="Guardar" onPress={() => onToggleFavorite(selectedVerse.number, selectedVerse.text)} testID={`favorite-verse-${selectedVerse.number}`} /> : null}
          </Row>
        </Card>
      ) : verses.length > 0 ? (
        <Text variant="bodySmall" style={{ color: colors.muted, textAlign: 'center', marginBottom: spacing.sm }}>
          Toque num versículo para partilhar.
        </Text>
      ) : null}
      {onPrev || onNext ? (
        <Row style={{ justifyContent: 'space-between' }}>
          <BrandButton variant="ghost" icon="chevron-left" label="Anterior" onPress={onPrev ?? (() => undefined)} disabled={!onPrev} style={{ flex: 1 }} testID="chapter-prev" />
          <BrandButton variant="ghost" icon="chevron-right" label="Seguinte" onPress={onNext ?? (() => undefined)} disabled={!onNext} style={{ flex: 1 }} testID="chapter-next" />
        </Row>
      ) : null}
    </Screen>
  );
}