import React, { useMemo, useState } from 'react';
import {
  BibleBookHeroCard,
  BibleChapterGrid,
  BibleHeroCard,
  BibleTestamentFilters,
  BibleVerseCard,
} from '../components/bibleUi';
import {
  bibleBookChapterCount,
  bibleTestamentLabel,
  booksForTestament,
  filterBibleBooks,
  partitionBibleBooks,
  type BibleTestamentFilter,
} from '../bible/biblePresentation';
import {
  EmptyState,
  ErrorState,
  ListRow,
  LoadingState,
  Screen,
  ScreenIntro,
  SearchInput,
  SectionHeader,
} from '../components/ui';
import type { BibleBook, BibleChapter } from '../api/types';

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
  const [query, setQuery] = useState('');
  const [testament, setTestament] = useState<BibleTestamentFilter>('all');
  const partitioned = useMemo(() => partitionBibleBooks(books), [books]);

  const filtered = useMemo(() => {
    const scoped = booksForTestament(partitioned.all, testament);
    return filterBibleBooks(scoped, query);
  }, [partitioned.all, testament, query]);

  const showGrouped = testament === 'all' && !query.trim();

  return (
    <Screen testID="bible-books-screen">
      <BibleHeroCard
        bookCount={partitioned.all.length}
        otCount={partitioned.ot.length}
        ntCount={partitioned.nt.length}
      />
      <ScreenIntro text="Escolha um livro ou filtre por testamento." />
      <SearchInput
        placeholder="Pesquisar livro"
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
      />
      <BibleTestamentFilters value={testament} onChange={setTestament} />

      {loading && books.length === 0 ? <LoadingState /> : null}
      {error ? <ErrorState title="Bíblia indisponível" /> : null}

      {!loading && !error && filtered.length === 0 ? (
        <EmptyState title="Nenhum livro encontrado" body="Tente outro nome ou limpe a pesquisa." />
      ) : null}

      {showGrouped ? (
        <>
          <SectionHeader title="Antigo Testamento" />
          {partitioned.ot.map((book) => (
            <ListRow
              key={book.id}
              testID={`bible-book-${book.id}`}
              title={book.name}
              subtitle={bibleBookChapterCount(book) ? `${bibleBookChapterCount(book)} cap.` : undefined}
              onPress={() => onOpen(book.id)}
            />
          ))}
          <SectionHeader title="Novo Testamento" />
          {partitioned.nt.map((book) => (
            <ListRow
              key={book.id}
              testID={`bible-book-${book.id}`}
              title={book.name}
              subtitle={bibleBookChapterCount(book) ? `${bibleBookChapterCount(book)} cap.` : undefined}
              onPress={() => onOpen(book.id)}
            />
          ))}
        </>
      ) : (
        filtered.map((book) => (
          <ListRow
            key={book.id}
            testID={`bible-book-${book.id}`}
            title={book.name}
            subtitle={bibleTestamentLabel(book.testament)}
            onPress={() => onOpen(book.id)}
          />
        ))
      )}
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
  const chapterCount = bibleBookChapterCount(book ?? { id: '', name: '' });

  return (
    <Screen testID="bible-book-screen">
      <BibleBookHeroCard
        bookName={book?.name || 'Livro'}
        testamentLabel={bibleTestamentLabel(book?.testament)}
        chapterCount={chapterCount}
      />
      <ScreenIntro text="Toque num capítulo para ler." />
      {loading ? <LoadingState /> : null}
      {error ? <EmptyState title="Livro indisponível" body={error} /> : null}
      {chapters.length === 0 && !loading ? (
        <EmptyState title="Sem capítulos" body="Este livro ainda não tem capítulos no cache." />
      ) : (
        <BibleChapterGrid chapters={chapters} onOpenChapter={onOpenChapter} />
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
  const heading = chapter?.book?.name
    ? `${chapter.book.name} ${chapter.number}`
    : `Capítulo ${chapter?.number ?? ''}`;

  const intro = canPublish
    ? `${heading} — toque em «Partilhar» para publicar na Comunidade.`
    : heading;

  return (
    <Screen testID="bible-chapter-screen">
      <ScreenIntro text={intro} />
      {loading ? <LoadingState /> : null}
      {error ? <EmptyState title="Capítulo indisponível" body={error} /> : null}
      {(chapter?.verses || []).map((verse) => (
        <BibleVerseCard
          key={verse.number}
          number={verse.number}
          text={verse.text}
          canPublish={canPublish}
          onShare={() => onShareVerse(verse.number, verse.text)}
        />
      ))}
    </Screen>
  );
}
