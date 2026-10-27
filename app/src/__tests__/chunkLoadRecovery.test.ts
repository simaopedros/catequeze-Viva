/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CHUNK_RELOAD_COOLDOWN_MS,
  CHUNK_RELOAD_STORAGE_KEY,
  isChunkLoadError,
  reloadOnceForChunkError,
  resetChunkReloadGuardForTests,
} from "../client/chunkLoadRecovery";

describe("chunkLoadRecovery", () => {
  afterEach(() => {
    resetChunkReloadGuardForTests();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("detects known dynamic-import failure messages", () => {
    expect(
      isChunkLoadError(
        new Error(
          "Failed to fetch dynamically imported module: https://catechis.app/assets/DashboardPage-xxx.js",
        ),
      ),
    ).toBe(true);
    expect(
      isChunkLoadError(new Error("Importing a module script failed.")),
    ).toBe(true);
    expect(
      isChunkLoadError(
        new Error("error loading dynamically imported module"),
      ),
    ).toBe(true);
    expect(
      isChunkLoadError(
        new Error(
          "Expected a JavaScript module script but the server responded with a MIME type of text/html",
        ),
      ),
    ).toBe(true);
    expect(isChunkLoadError(new Error("Network Error"))).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
  });

  it("reloads once and stores a timestamp guard", () => {
    const reload = vi.fn();
    const storage = {
      store: new Map<string, string>(),
      getItem(key: string) {
        return this.store.get(key) ?? null;
      },
      setItem(key: string, value: string) {
        this.store.set(key, value);
      },
    };

    expect(
      reloadOnceForChunkError({
        now: 1_000_000,
        storage,
        reload,
      }),
    ).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(storage.getItem(CHUNK_RELOAD_STORAGE_KEY)).toBe("1000000");
  });

  it("does not reload again within the cooldown window", () => {
    const reload = vi.fn();
    const storage = {
      store: new Map<string, string>([
        [CHUNK_RELOAD_STORAGE_KEY, String(1_000_000)],
      ]),
      getItem(key: string) {
        return this.store.get(key) ?? null;
      },
      setItem(key: string, value: string) {
        this.store.set(key, value);
      },
    };

    expect(
      reloadOnceForChunkError({
        now: 1_000_000 + CHUNK_RELOAD_COOLDOWN_MS - 1,
        storage,
        reload,
      }),
    ).toBe(false);
    expect(reload).not.toHaveBeenCalled();

    resetChunkReloadGuardForTests();
    expect(
      reloadOnceForChunkError({
        now: 1_000_000 + CHUNK_RELOAD_COOLDOWN_MS,
        storage,
        reload,
      }),
    ).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
