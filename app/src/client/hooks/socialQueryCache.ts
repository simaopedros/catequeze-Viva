/**
 * Invalidate Comunidade follow/profile queries after a follow, block or avatar
 * change so every card and the profile page stay in sync.
 */
import {
  queryClientInitialized,
  getSocialFollowState,
  getSocialProfile,
  getMySocialProfile,
  getSocialFeed,
  listMySocialBlocks,
} from "wasp/client/operations";

function queryKeyOf(fn: { queryCacheKey?: string[] }): string[] {
  return fn.queryCacheKey ?? [];
}

export async function invalidateSocialFollowQueries(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const queryClient = await queryClientInitialized;
    const keys = [
      queryKeyOf(getSocialFollowState as { queryCacheKey?: string[] }),
      queryKeyOf(getSocialProfile as { queryCacheKey?: string[] }),
      queryKeyOf(getMySocialProfile as { queryCacheKey?: string[] }),
      queryKeyOf(getSocialFeed as { queryCacheKey?: string[] }),
      queryKeyOf(listMySocialBlocks as { queryCacheKey?: string[] }),
    ].filter((key) => key.length > 0);

    await Promise.all(
      keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    );
  } catch {
    /* query client may not be ready in tests */
  }
}
