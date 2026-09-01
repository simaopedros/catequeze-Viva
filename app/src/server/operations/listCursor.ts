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

/**
 * Legacy (non-cursor) callers used to receive the whole table when `take` was
 * omitted. Every list now has a default and a hard ceiling; UIs that need more
 * must page with `paginated: true` + `cursor`.
 */
export const LEGACY_DEFAULT_TAKE = 200;
export const LEGACY_MAX_TAKE = 500;

export function legacyTake(take: number | undefined | null): number {
  const n = Number(take);
  if (!Number.isFinite(n) || n <= 0) return LEGACY_DEFAULT_TAKE;
  return Math.min(Math.floor(n), LEGACY_MAX_TAKE);
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
    take: useCursorPage ? pageSize + 1 : legacyTake(args.take),
    skip: useCursorPage ? 0 : args.skip || 0,
  };
}

// ─── Date + id cursor (orderBy date/updatedAt desc, id desc) ─────────────────

export type DateIdCursor = { t: string; i: string };

export function encodeDateIdCursor(row: {
  date?: Date | string | null;
  updatedAt?: Date | string | null;
  id: string;
  field?: 'date' | 'updatedAt';
}): string {
  const field = row.field || (row.date != null ? 'date' : 'updatedAt');
  const raw = field === 'date' ? row.date : row.updatedAt;
  const t =
    raw instanceof Date
      ? raw.toISOString()
      : raw
        ? new Date(raw).toISOString()
        : '';
  return Buffer.from(JSON.stringify({ t, i: row.id, f: field }), 'utf8').toString(
    'base64url',
  );
}

export function decodeDateIdCursor(
  cursor: string,
): { t: string; i: string; f: 'date' | 'updatedAt' } | null {
  try {
    const raw = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    if (typeof raw?.i !== 'string' || typeof raw?.t !== 'string') return null;
    return {
      t: raw.t,
      i: raw.i,
      f: raw.f === 'date' ? 'date' : 'updatedAt',
    };
  } catch {
    return null;
  }
}

/** Filter for rows strictly after cursor when ordered by field desc, id desc. */
export function dateIdCursorWhere(
  cursor: string | null | undefined,
  field: 'date' | 'updatedAt' = 'updatedAt',
): any | null {
  if (!cursor) return null;
  const c = decodeDateIdCursor(cursor);
  if (!c) return null;
  const t = new Date(c.t);
  if (Number.isNaN(+t)) return null;
  return {
    OR: [
      { [field]: { lt: t } },
      { AND: [{ [field]: t }, { id: { lt: c.i } }] },
    ],
  };
}

export function wrapDateIdPage<
  T extends { id: string; date?: Date | string | null; updatedAt?: Date | string | null },
>(
  rows: T[],
  pageSize: number,
  useCursorPage: boolean,
  field: 'date' | 'updatedAt' = 'updatedAt',
): T[] | { items: T[]; nextCursor: string | null } {
  if (!useCursorPage) return rows;
  const hasMore = rows.length > pageSize;
  const items = hasMore ? rows.slice(0, pageSize) : rows;
  const last = items[items.length - 1];
  return {
    items,
    nextCursor:
      hasMore && last
        ? encodeDateIdCursor({
            date: last.date,
            updatedAt: last.updatedAt,
            id: last.id,
            field,
          })
        : null,
  };
}
