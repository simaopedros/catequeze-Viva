import { useCallback, useEffect, useState } from "react";
import { useBlocker } from "react-router";

export type UnsavedChangesGuard = {
  /** True while a blocked SPA navigation is waiting for confirmation */
  isBlocked: boolean;
  /** Allow the pending navigation */
  proceed: () => void;
  /** Stay on the page and clear the blocker */
  reset: () => void;
  /**
   * Run a leave action (e.g. navigate back) only after the user confirms
   * when the form is dirty. Used for Cancel / Back buttons.
   */
  confirmLeave: (action: () => void) => void;
  /** Controlled open state for the confirm dialog */
  dialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
  /** Confirm button handler for the dialog */
  onConfirmLeave: () => void;
};

/**
 * Guard against accidental leave when a form or offline queue is dirty.
 * - `beforeunload` for tab close / refresh
 * - `useBlocker` for in-app navigations (Wasp data router)
 * - `confirmLeave` for explicit Cancel / Back controls
 */
export function useUnsavedChangesGuard(when: boolean): UnsavedChangesGuard {
  const blocker = useBlocker(when);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [manualOpen, setManualOpen] = useState(false);

  useEffect(() => {
    if (!when) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [when]);

  const isBlocked = blocker.state === "blocked";
  const dialogOpen = isBlocked || manualOpen;

  const proceed = useCallback(() => {
    if (blocker.state === "blocked") {
      blocker.proceed();
    }
  }, [blocker]);

  const reset = useCallback(() => {
    if (blocker.state === "blocked") {
      blocker.reset();
    }
    setManualOpen(false);
    setPendingAction(null);
  }, [blocker]);

  const confirmLeave = useCallback(
    (action: () => void) => {
      if (!when) {
        action();
        return;
      }
      setPendingAction(() => action);
      setManualOpen(true);
    },
    [when],
  );

  const onConfirmLeave = useCallback(() => {
    if (isBlocked) {
      proceed();
      return;
    }
    const action = pendingAction;
    setManualOpen(false);
    setPendingAction(null);
    action?.();
  }, [isBlocked, pendingAction, proceed]);

  const setDialogOpen = useCallback(
    (open: boolean) => {
      if (open) {
        setManualOpen(true);
        return;
      }
      reset();
    },
    [reset],
  );

  return {
    isBlocked,
    proceed,
    reset,
    confirmLeave,
    dialogOpen,
    setDialogOpen,
    onConfirmLeave,
  };
}
