/**
 * Promote the preloaded Google Fonts stylesheet (see `head` in main.wasp) to a
 * real stylesheet once the app has hydrated. Keeping the <link> as a preload in
 * the HTML avoids a render-blocking cross-origin request on first paint.
 *
 * Activating promptly (and wiring onload) prevents the browser warning that the
 * preload was unused within a few seconds.
 */
export function activatePreloadedFonts(): void {
  if (typeof document === "undefined") return;
  const links = document.querySelectorAll<HTMLLinkElement>(
    "link[data-font-stylesheet][rel='preload']",
  );
  links.forEach((link) => {
    const promote = () => {
      if (link.rel === "stylesheet") return;
      link.rel = "stylesheet";
    };
    if (link.sheet) {
      promote();
      return;
    }
    link.addEventListener("load", promote, { once: true });
    // Already in cache / some browsers never fire load on preload — promote now.
    promote();
  });
}

// Run as soon as this module evaluates on the client so hydration is not required.
if (typeof window !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", activatePreloadedFonts, {
      once: true,
    });
  } else {
    activatePreloadedFonts();
  }
}
