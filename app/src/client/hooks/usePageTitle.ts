import { useEffect } from "react";

/** Matches `title` in main.wasp — the value index.html ships with. */
export const APP_NAME = "Catequese Viva";

/**
 * Sets `document.title` for the current screen.
 *
 * On unmount the title falls back to the app name, so navigating to a screen
 * that does not declare a title never leaves the previous one stale: React
 * runs the outgoing tree's cleanup before the incoming tree's effects.
 */
export function usePageTitle(title?: string) {
  useEffect(() => {
    if (!title) return;
    document.title = `${title} · ${APP_NAME}`;
    return () => {
      document.title = APP_NAME;
    };
  }, [title]);
}
