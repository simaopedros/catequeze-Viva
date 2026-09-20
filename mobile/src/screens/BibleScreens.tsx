import React from 'react';
import type { BibleBook, BibleChapter } from '../api/types';
import {
  AppText,
  Card,
  EmptyState,
  ErrorState,
  ListRow,
  LoadingState,
  Screen,
  ScreenTitle,
  TextButton,
} from '../components/ui';
import { copy } from '../copy/ptBR';
import { spacing } from '../theme';

export function BibleBooksScreen({
  books,
  loading,
  error,
  onOpen,
  onRefresh,
  refreshing,
}: {
  books: BibleBook[];
  loading?: boolean;
  error?: string | null;
  onOpen: (id: string) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  return (
    <Screen testID="bible-books-screen" onRefresh={onRefresh} refreshing={refreshing}>
      <ScreenTitle title={copy.bible.title} subtitle={copy.bible.subtitle} />
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState title={copy.bible.errorBible} body={error} /> : null}
      {books.map((book) => (
        <ListRow
          key={book.id}
          testID={`bible-book-${book.id}`}
          title={book.name}
          meta={book.testament || ''}
          onPress={() => onOpen(book.id)}
        />
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
      <ScreenTitle title={book?.name || copy.bible.book} />
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState title={copy.bible.errorBook} body={error} /> : null}
      {chapters.length === 0 && !loading ? (
        <EmptyState title={copy.bible.emptyChaptersTitle} body={copy.bible.emptyChaptersBody} />
      ) : (
        chapters.map((chapter) => (
          <ListRow
            key={chapter.id || chapter.number}
            title={copy.bible.chapter(chapter.number)}
            onPress={() => onOpenChapter(chapter.number)}
          />
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
        title={
          chapter?.book?.name
            ? `${chapter.book.name} ${chapter.number}`
            : copy.bible.chapter(chapter?.number ?? 0)
        }
      />
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState title={copy.bible.errorChapter} body={error} /> : null}
      {(chapter?.verses || []).map((verse) => (
        <Card key={verse.number}>
          <AppText variant="overline" color="goldMuted">
            {verse.number}
          </AppText>
          <AppText variant="body" color="inkSoft" style={{ marginTop: spacing.xs }}>
            {verse.text}
          </AppText>
          {canPublish ? (
            <TextButton label={copy.bible.share} onPress={() => onShareVerse(verse.number, verse.text)} />
          ) : null}
        </Card>
      ))}
    </Screen>
  );
}
