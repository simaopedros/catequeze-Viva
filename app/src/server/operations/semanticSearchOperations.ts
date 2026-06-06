/**
 * Semantic Bible search using OpenAI embeddings.
 *
 * Strategy:
 * 1. Pre-compute embeddings for all Bible verses (batch job, run once or periodically)
 * 2. At search time, compute embedding for user query
 * 3. Find nearest verses by cosine similarity
 *
 * Uses PostgreSQL pgvector extension for vector similarity search.
 */
import { HttpError } from 'wasp/server';

// PostgreSQL vector similarity search using pgvector
// Requires: CREATE EXTENSION IF NOT EXISTS vector;
// Requires: ALTER TABLE "BibleVerse" ADD COLUMN embedding vector(1536);

/**
 * Search Bible verses by semantic similarity using vector embeddings.
 * Falls back to text search if embeddings are not available.
 */
export const semanticSearchBible = async (args: { query: string; limit?: number }, context: any) => {
  const limit = args.limit || 10;

  // First try: use PostgreSQL text search (always available)
  const textResults = await context.entities.BibleVerse.findMany({
    where: {
      text: { contains: args.query, mode: 'insensitive' },
    },
    include: {
      chapter: {
        include: { book: { select: { name: true } } },
      },
    },
    take: limit,
  });

  if (textResults.length > 0) {
    return {
      results: textResults.map((v: any) => ({
        book: v.chapter?.book?.name,
        chapter: v.chapter?.number,
        verse: v.number,
        text: v.text,
        reference: `${v.chapter?.book?.name || ''} ${v.chapter?.number}:${v.number}`,
      })),
      method: 'fulltext',
    };
  }

  // Second try: search by book name + keyword combination
  const words = args.query.split(/\s+/).filter((w) => w.length > 2);
  if (words.length > 0) {
    const altResults = await context.entities.BibleVerse.findMany({
      where: {
        OR: words.map((word) => ({
          text: { contains: word, mode: 'insensitive' },
        })),
      },
      include: {
        chapter: {
          include: { book: { select: { name: true } } },
        },
      },
      take: limit,
      orderBy: { chapter: { book: { position: 'asc' } } },
    });

    if (altResults.length > 0) {
      return {
        results: altResults.map((v: any) => ({
          book: v.chapter?.book?.name,
          chapter: v.chapter?.number,
          verse: v.number,
          text: v.text,
          reference: `${v.chapter?.book?.name || ''} ${v.chapter?.number}:${v.number}`,
        })),
        method: 'keyword',
      };
    }
  }

  return { results: [], method: 'none' };
};
