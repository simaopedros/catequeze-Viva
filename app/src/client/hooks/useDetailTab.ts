import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";

/**
 * Sync detail-page tab state with `?tab=` for deep links / refresh.
 * Falls back to `defaultTab` when missing or invalid.
 */
export function useDetailTab<T extends string>(
  allowedTabs: readonly T[],
  defaultTab: T,
  paramKey = "tab",
): [T, (next: T) => void] {
  const [searchParams, setSearchParams] = useSearchParams();

  const tab = useMemo(() => {
    const raw = searchParams.get(paramKey);
    if (raw && (allowedTabs as readonly string[]).includes(raw)) {
      return raw as T;
    }
    return defaultTab;
  }, [allowedTabs, defaultTab, paramKey, searchParams]);

  const setTab = useCallback(
    (next: T) => {
      setSearchParams(
        (prev) => {
          const nextParams = new URLSearchParams(prev);
          if (next === defaultTab) {
            nextParams.delete(paramKey);
          } else {
            nextParams.set(paramKey, next);
          }
          return nextParams;
        },
        { replace: true },
      );
    },
    [defaultTab, paramKey, setSearchParams],
  );

  return [tab, setTab];
}
