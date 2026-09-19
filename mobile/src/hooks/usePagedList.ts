import { useCallback, useEffect, useRef, useState } from 'react';

export type CursorPage<T> = { items: T[]; nextCursor: string | null };

export function usePagedList<T>(fetchPage: (cursor: string | null) => Promise<CursorPage<T>>, deps: unknown[] = []) {
  const [items, setItems] = useState<T[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cursorRef = useRef<string | null>(null);
  const busyRef = useRef(false);

  const run = useCallback(
    async (cursor: string | null, mode: 'initial' | 'refresh' | 'more') => {
      if (busyRef.current) return;
      busyRef.current = true;
      if (mode === 'initial') setLoading(true);
      if (mode === 'refresh') setRefreshing(true);
      if (mode === 'more') setLoadingMore(true);
      setError(null);
      try {
        const page = await fetchPage(cursor);
        const pageItems = Array.isArray(page?.items) ? page.items : [];
        const next = page?.nextCursor ?? null;
        setItems((current) => (mode === 'more' ? [...current, ...pageItems] : pageItems));
        setNextCursor(next);
        cursorRef.current = next;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Pedido falhou.');
      } finally {
        busyRef.current = false;
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps,
  );

  useEffect(() => {
    cursorRef.current = null;
    void run(null, 'initial');
  }, [run]);

  const reload = useCallback(() => {
    cursorRef.current = null;
    return run(null, 'refresh');
  }, [run]);

  const loadMore = useCallback(() => {
    if (!cursorRef.current) return Promise.resolve();
    return run(cursorRef.current, 'more');
  }, [run]);

  return { items, nextCursor, loading, refreshing, loadingMore, error, reload, loadMore, setItems };
}
