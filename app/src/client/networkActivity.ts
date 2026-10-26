import type { AxiosInstance } from "axios";

export type NetworkActivity = {
  /** Requests currently in flight. */
  pending: number;
  /** `performance.now()` when the oldest in-flight request started. */
  oldestStartedAt: number | null;
};

const IDLE: NetworkActivity = { pending: 0, oldestStartedAt: null };

const inFlight = new Map<number, number>();
const listeners = new Set<() => void>();
let snapshot: NetworkActivity = IDLE;
let nextId = 1;

function now(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function publish(): void {
  let oldest: number | null = null;
  for (const startedAt of inFlight.values()) {
    if (oldest === null || startedAt < oldest) oldest = startedAt;
  }
  snapshot = inFlight.size
    ? { pending: inFlight.size, oldestStartedAt: oldest }
    : IDLE;
  for (const listener of listeners) listener();
}

export function beginRequest(): number {
  const id = nextId++;
  inFlight.set(id, now());
  publish();
  return id;
}

export function endRequest(id: number | undefined): void {
  if (id === undefined || !inFlight.delete(id)) return;
  publish();
}

export function subscribeNetworkActivity(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getNetworkActivity(): NetworkActivity {
  return snapshot;
}

const ID_KEY = "__activityId";

/** Tracks every request made through the given axios instance. */
export function trackAxiosActivity(instance: AxiosInstance): void {
  const marker = instance as AxiosInstance & { __activityTracked?: boolean };
  if (marker.__activityTracked) return;
  marker.__activityTracked = true;

  instance.interceptors.request.use((config) => {
    (config as any)[ID_KEY] = beginRequest();
    return config;
  });
  instance.interceptors.response.use(
    (response) => {
      endRequest((response.config as any)?.[ID_KEY]);
      return response;
    },
    (error) => {
      endRequest(error?.config?.[ID_KEY]);
      return Promise.reject(error);
    },
  );
}

export function resetNetworkActivityForTests(): void {
  inFlight.clear();
  publish();
}
