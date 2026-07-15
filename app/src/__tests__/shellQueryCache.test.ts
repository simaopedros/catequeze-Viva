/**
 * shellQueryCache — shared shell query options contract.
 */
import { describe, it, expect } from "vitest";
import {
  SHELL_CONTEXT_STALE_MS,
  SHELL_CONTEXT_CACHE_MS,
  SHELL_QUERY_OPTIONS,
} from "../client/hooks/shellQueryCache";

describe("shellQueryCache", () => {
  it("aligns staleTime for user context and workspaces", () => {
    expect(SHELL_CONTEXT_STALE_MS).toBe(2 * 60 * 1000);
    expect(SHELL_QUERY_OPTIONS.staleTime).toBe(SHELL_CONTEXT_STALE_MS);
    expect(SHELL_QUERY_OPTIONS.refetchOnWindowFocus).toBe(false);
  });

  it("keeps cacheTime >= staleTime", () => {
    expect(SHELL_CONTEXT_CACHE_MS).toBeGreaterThanOrEqual(
      SHELL_CONTEXT_STALE_MS,
    );
    expect(SHELL_QUERY_OPTIONS.cacheTime).toBe(SHELL_CONTEXT_CACHE_MS);
  });
});
