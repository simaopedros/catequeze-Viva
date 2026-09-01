import { useEffect } from "react";

/**
 * Light theme is the only supported color scheme for this product stage
 * (decision recorded in the correction plan). Main.css ships no `.dark`
 * tokens and the `dark` variant is class-based, so `dark:` utilities are
 * inert. This hook only clears any stale `.dark` class / stored preference.
 */
export default function useColorMode(): ["light", (mode: string) => void] {
  useEffect(() => {
    const root = window.document.documentElement;
    const body = window.document.body;
    root.classList.remove("dark");
    body.classList.remove("dark");
    try {
      localStorage.setItem("color-theme", "light");
    } catch {
      /* ignore */
    }
  }, []);

  return ["light", () => {}];
}
