/**
 * In-memory cache for immutable reference data: Bible, Catechism, Directory.
 *
 * These datasets are seeded once and never change after deployment.
 * Pre-loading them into memory eliminates all DB round-trips for
 * browsing and searching reference content (~95% latency reduction).
 *
 * Memory footprint (all 3 locales): ~7 MB total.
 * Cache is populated at server startup via setup.ts, with lazy auto-recovery
 * if the DB wasn't seeded yet at boot time.
 *
 * Optimizations:
 * - Flat queries (no Prisma JOINs) for Bible — avoids SQL overhead on 93k verses
 * - Pre-computed lowercase fields — zero string allocations during search
 * - Lazy loading with concurrency guard — auto-recovers after seeding
 */

import { PrismaClient } from '@prisma/client';
import type { BibleBook, BibleChapter, BibleVerse, CatechismEntry, DirectoryEntry } from '@prisma/client';

// ─── Types ────────────────────────────────────────────────────────────────

interface CachedBibleBook {
  id: string;
  name: string;
  nameLower: string;
  abbreviation: string | null;
  abbreviationLower: string | null;
  testament: string;
  position: number;
  locale: string;
  chapterCount: number;
  chapters: { id: string; number: number; verseCount: number }[];
}

interface CachedBibleChapter {
  id: string;
  number: number;
  locale: string;
  bookId: string;
  book: { id: string; name: string; nameLower: string; abbreviation: string | null; abbreviationLower: string | null; testament: string; position: number };
  verses: { id: string; number: number; text: string; textLower: string; locale: string }[];
}

/** Flat verse entry for full-text search (pre-lowered for zero-allocation filtering). */
interface CachedBibleVerse {
  id: string;
  number: number;
  text: string;
  textLower: string;
  chapterNumber: number;
  book: { id: string; name: string; nameLower: string; abbreviation: string | null; abbreviationLower: string | null; testament: string; position: number };
}

/** Catechism entry with pre-lowered search fields. */
interface CachedCatechismEntry {
  id: string;
  number: number;
  category: string | null;
  question: string;
  questionLower: string;
  answer: string;
  answerLower: string;
  locale: string;
}

/** Directory entry with pre-lowered search fields. */
interface CachedDirectoryEntry {
  id: string;
  number: number;
  content: string;
  contentLower: string;
  title: string | null;
  titleLower: string | null;
  chapter: string | null;
  chapterLower: string | null;
  part: string | null;
  locale: string;
}

interface CacheStore {
  bibleBooks: Map<string, CachedBibleBook[]>;
  bibleChapters: Map<string, CachedBibleChapter>;
  bibleVerses: Map<string, CachedBibleVerse[]>;
  catechismEntries: Map<string, CachedCatechismEntry[]>;
  directoryEntries: Map<string, CachedDirectoryEntry[]>;
  ready: boolean;
  /** Guards against concurrent preload attempts. */
  loading: Promise<void> | null;
}

// ─── Store ─────────────────────────────────────────────────────────────────

const store: CacheStore = {
  bibleBooks: new Map(),
  bibleChapters: new Map(),
  bibleVerses: new Map(),
  catechismEntries: new Map(),
  directoryEntries: new Map(),
  ready: false,
  loading: null,
};

// ─── Preload ───────────────────────────────────────────────────────────────

/**
 * Preload all reference data into memory.
 * Accepts either a Wasp entities object or uses a standalone PrismaClient.
 * Called from serverSetup at startup (non-blocking via fire-and-forget),
 * or on-demand via ensureCacheReady().
 */
export async function preloadReferenceCache(entities?: any): Promise<void> {
  if (store.ready) return;

  let prisma: any = entities;
  let needsDisconnect = false;

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

    // Only mark as ready if at least Bible data was loaded (indicates DB is seeded).
    // An empty DB on startup is normal before the first seed runs.
    const hasData = [...store.bibleVerses.values()].some((v) => v.length > 0);
    if (hasData) {
      store.ready = true;
      console.log('[referenceCache] Preload complete.');
    } else {
      console.log('[referenceCache] No data found — cache will retry on first request.');
    }
  } catch (err) {
    console.error('[referenceCache] Preload failed:', err);
    throw err;
  } finally {
    if (needsDisconnect) {
      await prisma.$disconnect();
    }
  }
}

/**
 * Load Bible data using flat, join-free queries.
 * 
 * Instead of Prisma `include` (which generates SQL JOINs across ~93k verses),
 * we run 3 flat SELECTs per locale and stitch relationships in JS.
 */
async function preloadBible(entities: any, locales: string[]): Promise<void> {
  for (const locale of locales) {
    // 1. Flat query: all books (no includes)
    const books: BibleBook[] = await entities.BibleBook.findMany({
      where: { locale },
      orderBy: { position: 'asc' },
    });

    // 2. Flat query: all chapters (no includes)
    const chapters: BibleChapter[] = await entities.BibleChapter.findMany({
      where: { locale },
      orderBy: { number: 'asc' },
    });

    // 3. Flat query: all verses (no includes)
    const verses: BibleVerse[] = await entities.BibleVerse.findMany({
      where: { locale },
      orderBy: [{ chapterId: 'asc' }, { number: 'asc' }],
    });

    // ── Build JS lookups ──────────────────────────────────────────────

    const bookMap = new Map<string, typeof books[0]>();
    for (const b of books) {
      bookMap.set(b.id, b);
    }

    // Group verses by chapterId
    const versesByChapter = new Map<string, typeof verses>();
    for (const v of verses) {
      const arr = versesByChapter.get(v.chapterId);
      if (arr) {
        arr.push(v);
      } else {
        versesByChapter.set(v.chapterId, [v]);
      }
    }

    // Build cached books (with chapter counts)
    const cachedBooks: CachedBibleBook[] = books.map((b) => {
      const bookChapters = chapters.filter((ch) => ch.bookId === b.id).sort((a, b) => a.number - b.number);
      return {
        id: b.id,
        name: b.name,
        nameLower: b.name.toLowerCase(),
        abbreviation: b.abbreviation,
        abbreviationLower: b.abbreviation?.toLowerCase() ?? null,
        testament: b.testament,
        position: b.position,
        locale: b.locale,
        chapterCount: bookChapters.length,
        chapters: bookChapters.map((ch) => ({
          id: ch.id,
          number: ch.number,
          verseCount: (versesByChapter.get(ch.id) || []).length,
        })),
      };
    });

    store.bibleBooks.set(locale, cachedBooks);

    // Build cached chapters (with verses)
    for (const ch of chapters) {
      const book = bookMap.get(ch.bookId);
      if (!book) continue;
      const chapterVerses = versesByChapter.get(ch.id) || [];
      const key = `${ch.bookId}:${ch.number}:${locale}`;
      store.bibleChapters.set(key, {
        id: ch.id,
        number: ch.number,
        locale: ch.locale,
        bookId: ch.bookId,
        book: {
          id: book.id,
          name: book.name,
          nameLower: book.name.toLowerCase(),
          abbreviation: book.abbreviation,
          abbreviationLower: book.abbreviation?.toLowerCase() ?? null,
          testament: book.testament,
          position: book.position,
        },
        verses: chapterVerses.map((v) => ({
          id: v.id,
          number: v.number,
          text: v.text,
          textLower: v.text.toLowerCase(),
          locale: v.locale,
        })),
      });
    }

    // Build flat verse index (for full-text search)
    const cachedVerses: CachedBibleVerse[] = [];
    for (const ch of chapters) {
      const book = bookMap.get(ch.bookId);
      if (!book) continue;
      const chapterVerses = versesByChapter.get(ch.id) || [];
      for (const v of chapterVerses) {
        cachedVerses.push({
          id: v.id,
          number: v.number,
          text: v.text,
          textLower: v.text.toLowerCase(),
          chapterNumber: ch.number,
          book: {
            id: book.id,
            name: book.name,
            nameLower: book.name.toLowerCase(),
            abbreviation: book.abbreviation,
            abbreviationLower: book.abbreviation?.toLowerCase() ?? null,
            testament: book.testament,
            position: book.position,
          },
        });
      }
    }
    store.bibleVerses.set(locale, cachedVerses);

    console.log(`[referenceCache] Bible/${locale}: ${cachedBooks.length} books, ${chapters.length} chapters, ${cachedVerses.length} verses`);
  }
}

async function preloadCatechism(entities: any, locales: string[]): Promise<void> {
  for (const locale of locales) {
    const entries: CatechismEntry[] = await entities.CatechismEntry.findMany({
      where: { locale },
      orderBy: { number: 'asc' },
    });
    store.catechismEntries.set(
      locale,
      entries.map((e) => ({
        id: e.id,
        number: e.number,
        category: e.category,
        question: e.question,
        questionLower: e.question.toLowerCase(),
        answer: e.answer,
        answerLower: e.answer.toLowerCase(),
        locale: e.locale,
      })),
    );
    console.log(`[referenceCache] Catechism/${locale}: ${entries.length} entries`);
  }
}

async function preloadDirectory(entities: any, locales: string[]): Promise<void> {
  for (const locale of locales) {
    const entries: DirectoryEntry[] = await entities.DirectoryEntry.findMany({
      where: { locale },
      orderBy: { number: 'asc' },
    });
    store.directoryEntries.set(
      locale,
      entries.map((e) => ({
        id: e.id,
        number: e.number,
        content: e.content,
        contentLower: e.content.toLowerCase(),
        title: e.title,
        titleLower: e.title?.toLowerCase() ?? null,
        chapter: e.chapter,
        chapterLower: e.chapter?.toLowerCase() ?? null,
        part: e.part,
        locale: e.locale,
      })),
    );
    console.log(`[referenceCache] Directory/${locale}: ${entries.length} entries`);
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

/** Check if cache is fully loaded and ready to serve queries. */
export function isCacheReady(): boolean {
  return store.ready;
}

/**
 * Ensure the reference cache is loaded, triggering a load if necessary.
 * Safe to call concurrently — only one load runs at a time.
 *
 * Use this in operations that need guaranteed cache access.
 * Returns true if cache is ready after the call, false if DB has no data yet.
 */
export async function ensureCacheReady(): Promise<boolean> {
  if (store.ready) return true;

  // If a load is already in progress, wait for it
  if (store.loading) {
    try {
      await store.loading;
    } catch {
      // Previous load failed — we'll retry below
    }
    // Re-check after the pending load resolved
    if (store.ready) return true;
  }

  // Start a new load
  store.loading = preloadReferenceCache()
    .then(() => {
      store.loading = null;
    })
    .catch((err) => {
      store.loading = null;
      throw err;
    });

  try {
    await store.loading;
  } catch {
    // Load failed — cache remains not ready
    return false;
  }

  return store.ready;
}

/**
 * Trigger a non-blocking background load if the cache isn't ready.
 * Use this in hot paths (e.g. globalSearch) where we don't want to block
 * the request but want the cache to be available for subsequent requests.
 */
export function triggerBackgroundLoad(): void {
  if (store.ready || store.loading) return;
  store.loading = preloadReferenceCache()
    .then(() => {
      store.loading = null;
    })
    .catch((err) => {
      store.loading = null;
      console.error('[referenceCache] Background load failed:', err);
    });
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

export function getCachedBibleVersesForSearch(locale: string): CachedBibleVerse[] {
  return store.bibleVerses.get(locale) || store.bibleVerses.get('pt-BR') || [];
}

/**
 * Search Bible verses in cache.
 * Tries reference parsing ("Book Chapter:Verse") first, then full-text.
 * Uses pre-lowered fields for zero string allocation during filtering.
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
        b.nameLower.includes(lowerBook) ||
        (b.abbreviationLower && b.abbreviationLower.includes(lowerBook)),
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

  // Fallback: full text search using pre-lowered fields
  return verses
    .filter((v) => v.textLower.includes(lowerQ))
    .slice(0, limit)
    .map((v) => ({
      id: v.id,
      number: v.number,
      text: v.text,
      chapter: { id: '', number: v.chapterNumber, book: v.book },
    }));
}

// ─── Catechism ──────────────────────────────────────────────────────────────

export function getCachedCatechismEntries(locale: string): CachedCatechismEntry[] {
  return store.catechismEntries.get(locale) || store.catechismEntries.get('pt-BR') || [];
}

export function getCachedCatechismEntry(number: number, locale: string): CachedCatechismEntry | undefined {
  const entries = getCachedCatechismEntries(locale);
  return entries.find((e) => e.number === number);
}

export function getCachedCatechismByCategory(category: string, locale: string): CachedCatechismEntry[] {
  return getCachedCatechismEntries(locale).filter((e) => e.category === category);
}

/**
 * Search Catechism entries using pre-lowered fields (zero allocations).
 */
export function searchCatechismInCache(query: string, locale: string, limit: number = 20) {
  const q = query.trim().toLowerCase();
  if (q.length < 3) return [];
  return getCachedCatechismEntries(locale)
    .filter(
      (e) =>
        e.questionLower.includes(q) || e.answerLower.includes(q),
    )
    .slice(0, limit);
}

// ─── Directory ──────────────────────────────────────────────────────────────

export function getCachedDirectoryEntries(locale: string): CachedDirectoryEntry[] {
  return store.directoryEntries.get(locale) || store.directoryEntries.get('pt-BR') || [];
}

export function getCachedDirectoryEntry(number: number, locale: string): CachedDirectoryEntry | undefined {
  const entries = getCachedDirectoryEntries(locale);
  return entries.find((e) => e.number === number);
}

export function getCachedDirectoryByPart(part: string, locale: string): CachedDirectoryEntry[] {
  return getCachedDirectoryEntries(locale).filter((e) => e.part === part);
}

/**
 * Search Directory entries using pre-lowered fields (zero allocations).
 */
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
        e.contentLower.includes(lowerQ) ||
        (e.titleLower && e.titleLower.includes(lowerQ)) ||
        (e.chapterLower && e.chapterLower.includes(lowerQ)),
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
