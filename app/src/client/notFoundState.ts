import { useSyncExternalStore } from "react";

// Marks that the catch-all NotFoundPage is on screen, so App can hide its own
// NavBar (NotFoundPage already renders PublicNavbar/PublicFooter).
let notFoundActive = false;
const listeners = new Set<() => void>();

export function setNotFoundActive(value: boolean): void {
  if (notFoundActive === value) return;
  notFoundActive = value;
  listeners.forEach((l) => l());
}

export function useNotFoundActive(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => notFoundActive,
    () => false,
  );
}
