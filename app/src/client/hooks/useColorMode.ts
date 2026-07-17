import { useEffect } from "react";

/**
 * Light theme is the only officially supported color scheme for this stage.
 * Always force light; ignore any stored dark preference.
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
