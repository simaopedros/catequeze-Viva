import { HttpError } from 'wasp/server';
import {
  isCacheReady,
  getCachedBibleBooks,
  getCachedBibleBook,
  getCachedBibleChapter,
  searchBibleInCache,
  getCachedCatechismEntries,
  getCachedCatechismEntry,
  getCachedCatechismByCategory,
  searchCatechismInCache,
} from '../cache/referenceCache';

/**
 * Resolve locale: explicit arg takes precedence, then user session, then pt-BR.
 * Accepting locale as an explicit parameter makes React Query cache keys
 * locale-dependent, so the UI auto-refetches on language switch.
 */
function resolveLocale(context: any, explicitLocale?: string | null): string {
  return explicitLocale || context.user?.locale || 'pt-BR';
}

// ─── Bible ──────────────────────────────────────────────────────────────────

export const listBibleBooks = async (args: { locale?: string | null } | void, context: any) => {
  if (!context.user) throw new HttpError(401);
  const a = args || {};
  const locale = resolveLocale(context, (a as any).locale);

  if (isCacheReady()) {
    return getCachedBibleBooks(locale);
  }

  return context.entities.BibleBook.findMany({
    where: { locale },
    orderBy: { position: 'asc' },
    include: { _count: { select: { chapters: true } } },
  });
};

export const getBibleBook = async (args: { id: string; locale?: string | null }, context: any) => {
  if (!context.user) throw new HttpError(401);
  const locale = resolveLocale(context, args.locale);

  if (isCacheReady()) {
    const cached = getCachedBibleBook(args.id, locale);
    if (!cached) throw new HttpError(404, 'Livro não encontrado.');
    return cached;
  }

  const book = await context.entities.BibleBook.findUnique({
    where: { id: args.id },
    include: {
      chapters: {
        orderBy: { number: 'asc' },
        select: { id: true, number: true, _count: { select: { verses: true } } },
      },
    },
  });
  if (!book) throw new HttpError(404, 'Livro não encontrado.');
  return book;
};

export const getBibleChapter = async (args: { bookId: string; chapter: number; locale?: string | null }, context: any) => {
  if (!context.user) throw new HttpError(401);
  const locale = resolveLocale(context, args.locale);

  if (isCacheReady()) {
    const cached = getCachedBibleChapter(args.bookId, args.chapter, locale);
    if (!cached) throw new HttpError(404, 'Capítulo não encontrado.');
    return cached;
  }

  const chapter = await context.entities.BibleChapter.findUnique({
    where: { bookId_number_locale: { bookId: args.bookId, number: args.chapter, locale } },
    include: {
      book: { select: { id: true, name: true, testament: true, position: true } },
      verses: { orderBy: { number: 'asc' } },
    },
  });
  if (!chapter) throw new HttpError(404, 'Capítulo não encontrado.');
  return chapter;
};

export const searchBible = async (args: { query: string; limit?: number; locale?: string | null }, context: any) => {
  if (!context.user) throw new HttpError(401);
  if (!args.query || args.query.length < 2) return [];

  const locale = resolveLocale(context, args.locale);
  const limit = args.limit || 30;

  if (isCacheReady()) {
    return searchBibleInCache(args.query, locale, limit);
  }

  // Fallback: DB query
  const q = args.query.trim();
  const refMatch = q.match(/^(.+?)\s+(\d+)(?::(\d+))?$/);

  if (refMatch) {
    const [, bookPart, chapterStr, verseStr] = refMatch;
    const chapter = parseInt(chapterStr);
    const verse = verseStr ? parseInt(verseStr) : undefined;

    const books = await context.entities.BibleBook.findMany({
      where: {
        locale,
        OR: [
          { name: { contains: bookPart, mode: 'insensitive' } },
          { abbreviation: { contains: bookPart, mode: 'insensitive' } },
        ],
      },
      select: { id: true, name: true, abbreviation: true },
    });

    if (books.length > 0) {
      const results: any[] = [];
      for (const book of books.slice(0, 3)) {
        const chapterWhere: any = { bookId: book.id, number: chapter, locale };
        const chapters = await context.entities.BibleChapter.findMany({
          where: chapterWhere,
          include: {
            book: { select: { id: true, name: true, abbreviation: true } },
            verses: verse
              ? { where: { number: verse, locale }, orderBy: { number: 'asc' } }
              : { where: { locale }, orderBy: { number: 'asc' }, take: limit },
          },
        });
        for (const ch of chapters) {
          for (const v of ch.verses) {
            results.push({
              id: v.id,
              number: v.number,
              text: v.text,
              chapter: { id: ch.id, number: ch.number, book: ch.book },
            });
          }
        }
      }
      if (results.length > 0) return results.slice(0, limit);
    }
  }

  return context.entities.BibleVerse.findMany({
    where: { text: { contains: q, mode: 'insensitive' }, locale },
    take: limit,
    include: {
      chapter: {
        include: { book: { select: { id: true, name: true, abbreviation: true } } },
      },
    },
    orderBy: { number: 'asc' },
  });
};

// ─── Catechism ──────────────────────────────────────────────────────────────

export const searchCatechism = async (args: { query: string; limit?: number; locale?: string | null }, context: any) => {
  if (!context.user) throw new HttpError(401);
  if (!args.query || args.query.length < 3) return [];

  const locale = resolveLocale(context, args.locale);

  if (isCacheReady()) {
    return searchCatechismInCache(args.query, locale, args.limit || 20);
  }

  return context.entities.CatechismEntry.findMany({
    where: {
      locale,
      OR: [
        { question: { contains: args.query, mode: 'insensitive' } },
        { answer: { contains: args.query, mode: 'insensitive' } },
      ],
    },
    take: args.limit || 20,
    orderBy: { number: 'asc' },
  });
};

export const listCatechismByCategory = async (args: { category: string; locale?: string | null }, context: any) => {
  if (!context.user) throw new HttpError(401);
  const locale = resolveLocale(context, args.locale);

  if (isCacheReady()) {
    return getCachedCatechismByCategory(args.category, locale);
  }

  return context.entities.CatechismEntry.findMany({
    where: { category: args.category, locale },
    orderBy: { number: 'asc' },
  });
};

export const getCatechismEntry = async (args: { number: number; locale?: string | null }, context: any) => {
  if (!context.user) throw new HttpError(401);
  const locale = resolveLocale(context, args.locale);

  if (isCacheReady()) {
    const entry = getCachedCatechismEntry(args.number, locale);
    if (!entry) throw new HttpError(404, 'Entrada não encontrada.');
    return entry;
  }

  const entry = await context.entities.CatechismEntry.findUnique({
    where: { number_locale: { number: args.number, locale } },
  });
  if (!entry) throw new HttpError(404, 'Entrada não encontrada.');
  return entry;
};
