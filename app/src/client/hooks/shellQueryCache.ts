/**
 * Shared React Query options for AppShell identity queries.
 * Keeps useUserContext + listWorkspaces aligned and provides invalidation
 * after workspace switch / onboarding.
 */
import {
  queryClientInitialized,
  getCurrentUserContext,
  listWorkspaces,
} from "wasp/client/operations";

/** Shared stale window for shell context (user memberships + workspaces). */
export const SHELL_CONTEXT_STALE_MS = 2 * 60 * 1000;

/** Shared garbage-collection window (must be >= staleTime). */
export const SHELL_CONTEXT_CACHE_MS = 30 * 60 * 1000;

export const SHELL_QUERY_OPTIONS = {
  staleTime: SHELL_CONTEXT_STALE_MS,
  cacheTime: SHELL_CONTEXT_CACHE_MS,
  refetchOnWindowFocus: false,
  // Same query key + options ⇒ multiple hooks share one network request.
} as const;

function queryKeyOf(fn: { queryCacheKey?: string[] }): string[] {
  return fn.queryCacheKey ?? [];
}

/**
 * Mark user-context + workspace list stale and refetch active observers.
 * Call after workspace switch, onboarding completion, membership changes.
 */
export async function invalidateShellContext(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const queryClient = await queryClientInitialized;
    const keys = [
      queryKeyOf(getCurrentUserContext as { queryCacheKey?: string[] }),
      queryKeyOf(listWorkspaces as { queryCacheKey?: string[] }),
    ].filter((k) => k.length > 0);

    await Promise.all(
      keys.map((queryKey) =>
        queryClient.invalidateQueries({ queryKey }),
      ),
    );
  } catch {
    /* query client may not be ready in tests */
  }
}
