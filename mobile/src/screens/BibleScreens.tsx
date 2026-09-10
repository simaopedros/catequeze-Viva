import React from 'react';
import { Pressable, Text } from 'react-native';
import { BrandButton, Card, EmptyState, LoadingState, Screen, ScreenTitle } from '../components/ui';
import type { BibleBook, BibleChapter } from '../api/types';
import { colors } from '../theme';

export function BibleBooksScreen({
  books,
  loading,
  error,
  onOpen,
}: {
  books: BibleBook[];
  loading?: boolean;
  error?: string | null;
  onOpen: (id: string) => void;
}) {
  return (
    <Screen testID="bible-books-screen">
      <ScreenTitle title="Bíblia" subtitle="Leia e partilhe um versículo na Comunidade." />
      {loading ? <LoadingState /> : null}
      {error ? <EmptyState title="Bíblia indisponível" body={error} /> : null}
      {books.map((book) => (
        <Pressable key={book.id} onPress={() => onOpen(book.id)} testID={`bible-book-${book.id}`}>
          <Card>
            <Text style={{ color: colors.ink, fontWeight: '700' }}>{book.name}</Text>
            <Text style={{ color: colors.muted }}>{book.testament || ''}</Text>
          </Card>
        </Pressable>
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
      <ScreenTitle title={book?.name || 'Livro'} />
      {loading ? <LoadingState /> : null}
      {error ? <EmptyState title="Livro indisponível" body={error} /> : null}
      {chapters.length === 0 && !loading ? (
        <EmptyState title="Sem capítulos" body="Este livro ainda não tem capítulos no cache." />
      ) : (
        chapters.map((chapter) => (
          <Pressable key={chapter.id || chapter.number} onPress={() => onOpenChapter(chapter.number)}>
            <Card>
              <Text style={{ color: colors.ink, fontWeight: '700' }}>Capítulo {chapter.number}</Text>
            </Card>
          </Pressable>
        ))
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
}: {
  chapter?: BibleChapter | null;
  loading?: boolean;
  error?: string | null;
  canPublish?: boolean;
  onShareVerse: (verseNumber: number, text: string) => void;
}) {
  return (
    <Screen testID="bible-chapter-screen">
      <ScreenTitle
        title={chapter?.book?.name ? `${chapter.book.name} ${chapter.number}` : `Capítulo ${chapter?.number ?? ''}`}
      />
      {loading ? <LoadingState /> : null}
      {error ? <EmptyState title="Capítulo indisponível" body={error} /> : null}
      {(chapter?.verses || []).map((verse) => (
        <Card key={verse.number}>
          <Text style={{ color: colors.goldDark, fontWeight: '700' }}>{verse.number}</Text>
          <Text style={{ color: colors.inkSoft, marginTop: 6, lineHeight: 22 }}>{verse.text}</Text>
          {canPublish ? (
            <BrandButton
              variant="ghost"
              label="Partilhar na Comunidade"
              onPress={() => onShareVerse(verse.number, verse.text)}
            />
          ) : null}
        </Card>
      ))}
    </Screen>
  );
}
