import type { BibleBook } from '../api/types';

export type BibleTestamentFilter = 'all' | 'OT' | 'NT';

export function bibleTestamentLabel(testament?: string | null): string {
  if (testament === 'OT') return 'Antigo Testamento';
  if (testament === 'NT') return 'Novo Testamento';
  return 'Bíblia';
}

export function bibleBookChapterCount(book: BibleBook): number {
  if (book.chapters?.length) return book.chapters.length;
  return book._count?.chapters ?? 0;
}

export function partitionBibleBooks(books: BibleBook[]) {
  const sorted = [...books].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  return {
    all: sorted,
    ot: sorted.filter((b) => b.testament === 'OT'),
    nt: sorted.filter((b) => b.testament === 'NT'),
  };
}

export function filterBibleBooks(books: BibleBook[], query: string): BibleBook[] {
  const q = query.trim().toLowerCase();
  if (!q) return books;
  return books.filter((book) => {
    const name = book.name?.toLowerCase() ?? '';
    const abbr = book.abbreviation?.toLowerCase() ?? '';
    const id = book.id?.toLowerCase() ?? '';
    return name.includes(q) || abbr.includes(q) || id.includes(q);
  });
}

export function booksForTestament(books: BibleBook[], filter: BibleTestamentFilter): BibleBook[] {
  if (filter === 'OT') return books.filter((b) => b.testament === 'OT');
  if (filter === 'NT') return books.filter((b) => b.testament === 'NT');
  return books;
}
