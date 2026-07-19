/**
 * Shared helpers for name/id cursor pagination (take + 1, no re-read of prior pages).
 */

export type NameIdCursor = { n: string; i: string };

export function encodeNameIdCursor(row: {
  name?: string | null;
  id: string;
}): string {
  return Buffer.from(
    JSON.stringify({ n: row.name || '', i: row.id }),
    'utf8',
  ).toString('base64url');
}

export function decodeNameIdCursor(cursor: string): NameIdCursor | null {
  try {
    const raw = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    if (typeof raw?.i !== 'string') return null;
    return { n: raw.n || '', i: raw.i };
  } catch {
    return null;
  }
}

/** Prisma filter for rows after cursor when ordered by name asc, id asc. */
export function nameIdCursorWhere(cursor: string | null | undefined): any | null {
  if (!cursor) return null;
  const c = decodeNameIdCursor(cursor);
  if (!c) return null;
  return {
    OR: [
      { name: { gt: c.n } },
      { AND: [{ name: c.n }, { id: { gt: c.i } }] },
    ],
  };
}

export function mergeWhere(base: any, extra: any | null): any {
  if (!extra) return base || {};
  if (!base || Object.keys(base).length === 0) return extra;
  return { AND: [base, extra] };
}

export function wrapNameIdPage<T extends { name?: string | null; id: string }>(
  rows: T[],
  pageSize: number,
  useCursorPage: boolean,
): T[] | { items: T[]; nextCursor: string | null } {
  if (!useCursorPage) return rows;
  const hasMore = rows.length > pageSize;
  const items = hasMore ? rows.slice(0, pageSize) : rows;
  const last = items[items.length - 1];
  return {
    items,
    nextCursor:
      hasMore && last
        ? encodeNameIdCursor({ name: last.name, id: last.id })
        : null,
  };
}

export function emptyPage(useCursorPage: boolean) {
  return useCursorPage ? { items: [], nextCursor: null } : [];
}

export function pageParams(args: {
  take?: number;
  skip?: number;
  cursor?: string | null;
  paginated?: boolean;
}) {
  const useCursorPage = Boolean(args.paginated || args.cursor);
  const pageSize = Math.min(Math.max(args.take || 50, 1), 100);
  return {
    useCursorPage,
    pageSize,
    take: useCursorPage ? pageSize + 1 : args.take,
    skip: useCursorPage ? 0 : args.skip || 0,
  };
}
