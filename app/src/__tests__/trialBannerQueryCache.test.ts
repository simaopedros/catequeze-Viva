/**
 * ProductTrialBanner must reuse getDashboardStats cache (shell stale window),
 * not force a fresh ~3s fetch on every internal route remount.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("ProductTrialBanner query cache", () => {
  const banner = readFileSync(
    resolve(__dirname, "../catequese/components/ProductTrialBanner.tsx"),
    "utf8",
  );
  const shellCache = readFileSync(
    resolve(__dirname, "../client/hooks/shellQueryCache.ts"),
    "utf8",
  );

  it("reuses shell staleTime and does not force remount refetch", () => {
    expect(shellCache).toContain(
      "export const SHELL_CONTEXT_STALE_MS = 2 * 60 * 1000",
    );
    expect(banner).toContain("SHELL_CONTEXT_STALE_MS");
    expect(banner).toContain("staleTime: SHELL_CONTEXT_STALE_MS");
    expect(banner).not.toMatch(/staleTime:\s*0/);
    expect(banner).not.toMatch(/refetchOnMount:\s*["']always["']/);
  });

  it("uses the same getDashboardStats args as DashboardPage parish scope", () => {
    expect(banner).toContain("getDashboardStats");
    expect(banner).toContain("{ parishId: activeParishId || undefined }");
    expect(banner).toContain("computeActivationFlags");
    expect(banner).toContain("firstValueReached");
  });
});
