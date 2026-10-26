import { useEffect, useSyncExternalStore } from "react";

const labels = new Map<string, string>();
const listeners = new Set<() => void>();
let version = 0;

function emit() {
  version += 1;
  listeners.forEach((listener) => listener());
}

export function setBreadcrumbLabel(path: string, label: string | null) {
  if (label) {
    if (labels.get(path) === label) return;
    labels.set(path, label);
  } else {
    if (!labels.has(path)) return;
    labels.delete(path);
  }
  emit();
}

export function getBreadcrumbLabel(path: string): string | undefined {
  return labels.get(path);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Re-renders when any page publishes or clears a breadcrumb label. */
export function useBreadcrumbLabelsVersion(): number {
  return useSyncExternalStore(
    subscribe,
    () => version,
    () => version,
  );
}

/** Lets a detail page replace its raw id segment with a human label. */
export function useBreadcrumbLabel(path: string, label?: string | null) {
  useEffect(() => {
    if (!label) return;
    setBreadcrumbLabel(path, label);
    return () => setBreadcrumbLabel(path, null);
  }, [path, label]);
}
