/**
 * Ponte entre superfícies que querem abrir a busca global (Ctrl+K) e a
 * TopBar, que é dona do input. Evita prop-drilling através do layout.
 */
export const OPEN_SEARCH_EVENT = "cv:open-search";

export function openGlobalSearch() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_SEARCH_EVENT));
}
