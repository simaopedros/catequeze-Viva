/**
 * Promote the preloaded Google Fonts stylesheet (see `head` in main.wasp) to a
 * real stylesheet once the app has hydrated. Keeping the <link> as a preload in
 * the HTML avoids a render-blocking cross-origin request on first paint.
 */
export function activatePreloadedFonts(): void {
  if (typeof document === "undefined") return;
  const links = document.querySelectorAll<HTMLLinkElement>(
    "link[data-font-stylesheet][rel='preload']",
  );
  links.forEach((link) => {
    link.rel = "stylesheet";
  });
}
