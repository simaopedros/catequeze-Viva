/**
 * Tiny in-memory TTL cache for hot admin read paths (platform overview, plans list).
 * Not shared across processes — fine for single-node / brief staleness.
 */

export type TtlCache<T> = {
  get: () => T | undefined;
  set: (value: T) => void;
  clear: () => void;
  /** Test helper */
  size: () => number;
};

export function createTtlCache<T>(ttlMs: number): TtlCache<T> {
  let entry: { value: T; expiresAt: number } | null = null;

  return {
    get() {
      if (!entry) return undefined;
      if (Date.now() >= entry.expiresAt) {
        entry = null;
        return undefined;
      }
      return entry.value;
    },
    set(value: T) {
      entry = { value, expiresAt: Date.now() + ttlMs };
    },
    clear() {
      entry = null;
    },
    size() {
      return entry && Date.now() < entry.expiresAt ? 1 : 0;
    },
  };
}
