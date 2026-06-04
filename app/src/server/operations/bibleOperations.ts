import { HttpError } from 'wasp/server';

export const listBibleBooks = async (_args: void, context: any) => {
  if (!context.user) throw new HttpError(401);
  return context.entities.BibleBook.findMany({
    orderBy: { position: 'asc' },
    include: { _count: { select: { chapters: true } } },
  });
};

export const getBibleChapter = async (args: { bookId: string; chapter: number }, context: any) => {
  if (!context.user) throw new HttpError(401);
  const chapter = await context.entities.BibleChapter.findUnique({
    where: { bookId_number: { bookId: args.bookId, number: args.chapter } },
    include: {
      book: { select: { id: true, name: true, testament: true, position: true } },
      verses: { orderBy: { number: 'asc' } },
    },
  });
  if (!chapter) throw new HttpError(404, 'Capítulo não encontrado.');
  return chapter;
};

export const searchBible = async (args: { query: string; limit?: number }, context: any) => {
  if (!context.user) throw new HttpError(401);
  if (!args.query || args.query.length < 2) return [];

  const q = args.query.trim();
  const limit = args.limit || 30;

  // Try to parse as "Book Chapter:Verse" or "Book Chapter" reference
  // Patterns: "Gênesis 1:1", "Gn 1", "1:1", "João 3:16"
  const refMatch = q.match(/^(.+?)\s+(\d+)(?::(\d+))?$/);
  
  if (refMatch) {
    const [, bookPart, chapterStr, verseStr] = refMatch;
    const chapter = parseInt(chapterStr);
    const verse = verseStr ? parseInt(verseStr) : undefined;

    // Find book by name or abbreviation
    const books = await context.entities.BibleBook.findMany({
      where: {
        OR: [
          { name: { contains: bookPart, mode: 'insensitive' } },
          { abbreviation: { contains: bookPart, mode: 'insensitive' } },
        ],
      },
      select: { id: true, name: true, abbreviation: true },
    });

    if (books.length > 0) {
      // Found matching books - search for verses in those books
      const results: any[] = [];
      for (const book of books.slice(0, 3)) {
        const chapterWhere: any = { bookId: book.id, number: chapter };
        const chapters = await context.entities.BibleChapter.findMany({
          where: chapterWhere,
          include: {
            book: { select: { id: true, name: true, abbreviation: true } },
            verses: verse
              ? { where: { number: verse }, orderBy: { number: 'asc' } }
              : { orderBy: { number: 'asc' }, take: limit },
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

  // Fallback: full text search
  return context.entities.BibleVerse.findMany({
    where: { text: { contains: q, mode: 'insensitive' } },
    take: limit,
    include: {
      chapter: {
        include: { book: { select: { id: true, name: true, abbreviation: true } } },
      },
    },
    orderBy: { number: 'asc' },
  });
};

export const searchCatechism = async (args: { query: string; limit?: number }, context: any) => {
  if (!context.user) throw new HttpError(401);
  if (!args.query || args.query.length < 3) return [];

  return context.entities.CatechismEntry.findMany({
    where: {
      OR: [
        { question: { contains: args.query, mode: 'insensitive' } },
        { answer: { contains: args.query, mode: 'insensitive' } },
      ],
    },
    take: args.limit || 20,
    orderBy: { number: 'asc' },
  });
};

export const listCatechismByCategory = async (args: { category: string }, context: any) => {
  if (!context.user) throw new HttpError(401);
  return context.entities.CatechismEntry.findMany({
    where: { category: args.category },
    orderBy: { number: 'asc' },
  });
};

export const getCatechismEntry = async (args: { number: number }, context: any) => {
  if (!context.user) throw new HttpError(401);
  const entry = await context.entities.CatechismEntry.findUnique({ where: { number: args.number } });
  if (!entry) throw new HttpError(404, 'Entrada não encontrada.');
  return entry;
};

export const getBibleBook = async (args: { id: string }, context: any) => {
  if (!context.user) throw new HttpError(401);
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
