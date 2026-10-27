/**
 * Recover from stale JS chunks after a deploy (hashed assets rotated).
 * Reloads once within a cooldown window so open tabs pick up the new index.
 */

export const CHUNK_RELOAD_STORAGE_KEY = "cv-chunk-reload-at";
export const CHUNK_RELOAD_COOLDOWN_MS = 30_000;

const CHUNK_LOAD_ERROR_RE =
  /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Expected a JavaScript module script but the server responded with a MIME type of text\/html/i;

let reloadInFlight = false;

export function isChunkLoadError(error: unknown): boolean {
  if (!error) return false;
  const message =
    typeof error === "string"
      ? error
      : error instanceof Error
        ? error.message
        : typeof (error as { message?: unknown }).message === "string"
          ? String((error as { message: string }).message)
          : "";
  return CHUNK_LOAD_ERROR_RE.test(message);
}

function readLastReloadAt(
  storage: Pick<Storage, "getItem"> | null | undefined,
): number {
  if (!storage) return 0;
  try {
    const raw = storage.getItem(CHUNK_RELOAD_STORAGE_KEY);
    if (!raw) return 0;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

function writeLastReloadAt(
  storage: Pick<Storage, "setItem"> | null | undefined,
  at: number,
): void {
  if (!storage) return;
  try {
    storage.setItem(CHUNK_RELOAD_STORAGE_KEY, String(at));
  } catch {
    // Private mode / quota — in-memory guard still applies for this document.
  }
}

/**
 * Returns true if a reload was started (or would start in tests when reload is stubbed).
 */
export function reloadOnceForChunkError(options?: {
  now?: number;
  storage?: Pick<Storage, "getItem" | "setItem"> | null;
  reload?: () => void;
  cooldownMs?: number;
}): boolean {
  if (reloadInFlight) return false;

  const now = options?.now ?? Date.now();
  const cooldownMs = options?.cooldownMs ?? CHUNK_RELOAD_COOLDOWN_MS;
  const storage =
    options?.storage !== undefined
      ? options.storage
      : typeof sessionStorage !== "undefined"
        ? sessionStorage
        : null;

  const last = readLastReloadAt(storage);
  if (last > 0 && now - last < cooldownMs) {
    return false;
  }

  writeLastReloadAt(storage, now);
  reloadInFlight = true;

  const reload =
    options?.reload ??
    (() => {
      window.location.reload();
    });
  reload();
  return true;
}

/** Test helper — resets the in-memory in-flight flag. */
export function resetChunkReloadGuardForTests(): void {
  reloadInFlight = false;
}

export function installChunkLoadRecovery(): () => void {
  if (typeof window === "undefined") return () => {};

  const onPreloadError = (event: Event) => {
    if (typeof (event as { preventDefault?: () => void }).preventDefault === "function") {
      event.preventDefault();
    }
    reloadOnceForChunkError();
  };

  const onSwMessage = (event: MessageEvent) => {
    if (event.data?.type !== "CHUNK_CACHE_MISS") return;
    reloadOnceForChunkError();
  };

  window.addEventListener("vite:preloadError", onPreloadError);
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("message", onSwMessage);
  }

  return () => {
    window.removeEventListener("vite:preloadError", onPreloadError);
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.removeEventListener("message", onSwMessage);
    }
  };
}
