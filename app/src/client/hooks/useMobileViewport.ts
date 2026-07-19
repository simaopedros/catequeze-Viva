import { useEffect, useState } from "react";

/**
 * Normalizes the visual viewport into a CSS variable so fixed mobile chrome
 * stays above the software keyboard without page-specific magic numbers.
 */
export function useMobileViewport() {
  const [keyboardInset, setKeyboardInset] = useState(0);

  useEffect(() => {
    const viewport = window.visualViewport;
    const root = document.documentElement;

    const update = () => {
      const inset = viewport
        ? Math.max(
            0,
            Math.round(
              window.innerHeight - viewport.height - viewport.offsetTop,
            ),
          )
        : 0;
      const next = inset > 80 ? inset : 0;
      setKeyboardInset(next);
      root.style.setProperty("--keyboard-inset", `${next}px`);
    };

    update();
    viewport?.addEventListener("resize", update);
    viewport?.addEventListener("scroll", update);
    window.addEventListener("orientationchange", update);

    return () => {
      viewport?.removeEventListener("resize", update);
      viewport?.removeEventListener("scroll", update);
      window.removeEventListener("orientationchange", update);
      root.style.removeProperty("--keyboard-inset");
    };
  }, []);

  return {
    keyboardInset,
    keyboardOpen: keyboardInset > 0,
  };
}
