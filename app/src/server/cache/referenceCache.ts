/**
 * In-memory cache for immutable reference data: Bible, Catechism, Directory.
 *
 * These datasets are seeded once and never change after deployment.
 * Pre-loading them into memory eliminates all DB round-trips for
 * browsing and searching reference content (~95% latency reduction).
 *
 * Memory footprint (all 3 locales): ~7 MB total.
 * Cache is populated at server startup via setup.ts.
 */

import { PrismaClient } from '@prisma/client';
import type { BibleBook, BibleChapter, BibleVerse, CatechismEntry, DirectoryEntry } from '@prisma/client';

// ─── Types ────────────────────────────────────────────────────────────────

interface CachedBibleChapter {
  id: string;
  number: number;
  locale: string;
  bookId: string;
  book: { id: string; name: string; abbreviation: string | null; testament: string; position: number };
  verses: { id: string; number: number; text: string; locale: string }[];
}

interface CachedBibleBook {
  id: string;
  name: string;
  abbreviation: string | null;
  testament: string;
  position: number;
  locale: string;
  chapterCount: number;
  chapters: { id: string; number: number; verseCount: number }[];
}

interface CacheStore {
  /** All Bible books, indexed by locale */
  bibleBooks: Map<string, CachedBibleBook[]>;
  /** Bible chapters with verses, keyed by `${bookId}:${chapter}:${locale}` */
  bibleChapters: Map<string, CachedBibleChapter>;
  /** All Bible verses (flat), indexed by locale */
  bibleVerses: Map<string, { id: string; number: number; text: string; chapterNumber: number; book: { id: string; name: string; abbreviation: string | null; testament: string; position: number } }[]>;
  /** Catechism entries, indexed by locale */
  catechismEntries: Map<string, CatechismEntry[]>;
  /** Directory entries, indexed by locale */
  directoryEntries: Map<string, DirectoryEntry[]>;
  /** Whether preloading is complete */
  ready: boolean;
}

// ─── Store ─────────────────────────────────────────────────────────────────

const store: CacheStore = {
  bibleBooks: new Map(),
  bibleChapters: new Map(),
  bibleVerses: new Map(),
  catechismEntries: new Map(),
  directoryEntries: new Map(),
  ready: false,
};

// ─── Preload ───────────────────────────────────────────────────────────────

/**
 * Preload all reference data into memory.
 * Accepts either a Wasp entities object or uses a standalone PrismaClient.
 * Called from serverSetup at startup (non-blocking via fire-and-forget).
 */
export async function preloadReferenceCache(entities?: any): Promise<void> {
  if (store.ready) return;

  let prisma: any = entities;
  let needsDisconnect = false;

  // If no entities provided (called from serverSetup), create a standalone PrismaClient
  if (!prisma) {
    prisma = new PrismaClient();
    needsDisconnect = true;
  }

  const locales = ['pt-BR', 'en', 'es'];
  console.log('[referenceCache] Preloading reference data...');

  try {
    await Promise.all([
      preloadBible(prisma, locales),
      preloadCatechism(prisma, locales),
      preloadDirectory(prisma, locales),
    ]);

    store.ready = true;
    console.log('[referenceCache] Preload complete.');
  } catch (err) {
    console.error('[referenceCache] Preload failed:', err);
  } finally {
    if (needsDisconnect) {
      await prisma.$disconnect();
    }
  }
}

async function preloadBible(entities: any, locales: string[]): Promise<void> {
  for (const locale of locales) {
    // Load all books with chapter counts
    const books = await entities.BibleBook.findMany({
      where: { locale },
      orderBy: { position: 'asc' },
      include: {
        chapters: {
          orderBy: { number: 'asc' },
          select: { id: true, number: true, _count: { select: { verses: true } } },
        },
      },
    });

    const cachedBooks: CachedBibleBook[] = books.map((b: any) => ({
      id: b.id,
      name: b.name,
      abbreviation: b.abbreviation,
      testament: b.testament,
      position: b.position,
      locale: b.locale,
      chapterCount: b.chapters.length,
      chapters: b.chapters.map((ch: any) => ({
        id: ch.id,
        number: ch.number,
        verseCount: ch._count.verses,
      })),
    }));

    store.bibleBooks.set(locale, cachedBooks);

    // Load all chapters with verses (eager loading for instant chapter access)
    const chapters = await entities.BibleChapter.findMany({
      where: { locale },
      include: {
        book: { select: { id: true, name: true, abbreviation: true, testament: true, position: true } },
        verses: { orderBy: { number: 'asc' }, select: { id: true, number: true, text: true, locale: true } },
      },
    });

    for (const ch of chapters) {
      const key = `${ch.bookId}:${ch.number}:${locale}`;
      store.bibleChapters.set(key, ch);
    }

    // Build flat verse index for search
    const verses: CacheStore['bibleVerses'] extends Map<string, infer T> ? T : never = [];
    for (const ch of chapters) {
      for (const v of ch.verses) {
        verses.push({
          id: v.id,
          number: v.number,
          text: v.text,
          chapterNumber: ch.number,
          book: ch.book,
        });
      }
    }
    store.bibleVerses.set(locale, verses);

    console.log(`[referenceCache] Bible/${locale}: ${cachedBooks.length} books, ${chapters.length} chapters, ${verses.length} verses`);
  }
}

async function preloadCatechism(entities: any, locales: string[]): Promise<void> {
  for (const locale of locales) {
    const entries = await entities.CatechismEntry.findMany({
      where: { locale },
      orderBy: { number: 'asc' },
    });
    store.catechismEntries.set(locale, entries);
    console.log(`[referenceCache] Catechism/${locale}: ${entries.length} entries`);
  }
}

async function preloadDirectory(entities: any, locales: string[]): Promise<void> {
  for (const locale of locales) {
    const entries = await entities.DirectoryEntry.findMany({
      where: { locale },
      orderBy: { number: 'asc' },
    });
    store.directoryEntries.set(locale, entries);
    console.log(`[referenceCache] Directory/${locale}: ${entries.length} entries`);
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

export function isCacheReady(): boolean {
  return store.ready;
}

// ─── Bible ──────────────────────────────────────────────────────────────────

export function getCachedBibleBooks(locale: string): CachedBibleBook[] {
  return store.bibleBooks.get(locale) || store.bibleBooks.get('pt-BR') || [];
}

export function getCachedBibleBook(bookId: string, locale: string): CachedBibleBook | undefined {
  const books = store.bibleBooks.get(locale) || [];
  return books.find((b) => b.id === bookId);
}

export function getCachedBibleChapter(bookId: string, chapter: number, locale: string): CachedBibleChapter | undefined {
  return store.bibleChapters.get(`${bookId}:${chapter}:${locale}`);
}

export function getCachedBibleVersesForSearch(locale: string) {
  return store.bibleVerses.get(locale) || store.bibleVerses.get('pt-BR') || [];
}

/**
 * Search Bible verses in cache.
 * Tries reference parsing ("Book Chapter:Verse") first, then full-text.
 */
export function searchBibleInCache(query: string, locale: string, limit: number = 30) {
  const q = query.trim();
  if (q.length < 2) return [];

  const verses = getCachedBibleVersesForSearch(locale);
  const books = getCachedBibleBooks(locale);
  const lowerQ = q.toLowerCase();

  // Try "Book Chapter:Verse" or "Book Chapter" reference pattern
  const refMatch = q.match(/^(.+?)\s+(\d+)(?::(\d+))?$/);
  if (refMatch) {
    const [, bookPart, chapterStr, verseStr] = refMatch;
    const chapter = parseInt(chapterStr);
    const verse = verseStr ? parseInt(verseStr) : undefined;
    const lowerBook = bookPart.toLowerCase();

    const matchedBooks = books.filter(
      (b) =>
        b.name.toLowerCase().includes(lowerBook) ||
        (b.abbreviation && b.abbreviation.toLowerCase().includes(lowerBook)),
    );

    if (matchedBooks.length > 0) {
      const results: any[] = [];
      for (const book of matchedBooks.slice(0, 3)) {
        const chapterData = getCachedBibleChapter(book.id, chapter, locale);
        if (!chapterData) continue;
        for (const v of chapterData.verses) {
          if (verse && v.number !== verse) continue;
          results.push({
            id: v.id,
            number: v.number,
            text: v.text,
            chapter: { id: chapterData.id, number: chapterData.number, book: chapterData.book },
          });
          if (results.length >= limit) break;
        }
        if (results.length >= limit) break;
      }
      if (results.length > 0) return results.slice(0, limit);
    }
  }

  // Fallback: full text search in cached verses
  return verses
    .filter((v: any) => v.text.toLowerCase().includes(lowerQ))
    .slice(0, limit)
    .map((v: any) => ({
      id: v.id,
      number: v.number,
      text: v.text,
      chapter: { id: '', number: v.chapterNumber, book: v.book },
    }));
}

// ─── Catechism ──────────────────────────────────────────────────────────────

export function getCachedCatechismEntries(locale: string): CatechismEntry[] {
  return store.catechismEntries.get(locale) || store.catechismEntries.get('pt-BR') || [];
}

export function getCachedCatechismEntry(number: number, locale: string): CatechismEntry | undefined {
  const entries = getCachedCatechismEntries(locale);
  return entries.find((e) => e.number === number);
}

export function getCachedCatechismByCategory(category: string, locale: string): CatechismEntry[] {
  return getCachedCatechismEntries(locale).filter((e) => e.category === category);
}

export function searchCatechismInCache(query: string, locale: string, limit: number = 20) {
  const q = query.trim().toLowerCase();
  if (q.length < 3) return [];
  return getCachedCatechismEntries(locale)
    .filter(
      (e) =>
        e.question.toLowerCase().includes(q) || e.answer.toLowerCase().includes(q),
    )
    .slice(0, limit);
}

// ─── Directory ──────────────────────────────────────────────────────────────

export function getCachedDirectoryEntries(locale: string): DirectoryEntry[] {
  return store.directoryEntries.get(locale) || store.directoryEntries.get('pt-BR') || [];
}

export function getCachedDirectoryEntry(number: number, locale: string): DirectoryEntry | undefined {
  const entries = getCachedDirectoryEntries(locale);
  return entries.find((e) => e.number === number);
}

export function getCachedDirectoryByPart(part: string, locale: string): DirectoryEntry[] {
  return getCachedDirectoryEntries(locale).filter((e) => e.part === part);
}

export function searchDirectoryInCache(query: string, locale: string, limit: number = 20) {
  const q = query.trim();
  if (q.length < 2) return [];

  const lowerQ = q.toLowerCase();

  // Try numeric search (exact entry number)
  const num = parseInt(q);
  if (!isNaN(num)) {
    const entry = getCachedDirectoryEntry(num, locale);
    if (entry) return [entry];
  }

  return getCachedDirectoryEntries(locale)
    .filter(
      (e) =>
        e.content.toLowerCase().includes(lowerQ) ||
        (e.title && e.title.toLowerCase().includes(lowerQ)) ||
        (e.chapter && e.chapter.toLowerCase().includes(lowerQ)),
    )
    .slice(0, limit);
}

export function getCachedDirectoryParts(locale: string) {
  const entries = getCachedDirectoryEntries(locale);
  const seen = new Set<string>();
  const result: { part: string | null; chapter: string | null; title: string | null; number: number }[] = [];
  for (const e of entries) {
    const key = e.chapter || `__no_chapter_${e.number}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push({ part: e.part, chapter: e.chapter, title: e.title, number: e.number });
    }
  }
  return result;
}
