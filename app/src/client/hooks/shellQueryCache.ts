/**
 * Shared React Query options for AppShell identity.
 * Prefer getAppBootstrap so context + workspaces share one network request.
 */
import {
  queryClientInitialized,
  getAppBootstrap,
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
} as const;

function queryKeyOf(fn: { queryCacheKey?: string[] }): string[] {
  return fn.queryCacheKey ?? [];
}

/**
 * Invalidate shell bootstrap (and legacy keys if still observed).
 * Call after membership/onboarding/billing mutations — not on local workspace switch.
 */
export async function invalidateShellContext(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const queryClient = await queryClientInitialized;
    const keys = [
      queryKeyOf(getAppBootstrap as { queryCacheKey?: string[] }),
      queryKeyOf(getCurrentUserContext as { queryCacheKey?: string[] }),
      queryKeyOf(listWorkspaces as { queryCacheKey?: string[] }),
    ].filter((k) => k.length > 0);

    await Promise.all(
      keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    );
  } catch {
    /* query client may not be ready in tests */
  }
}
