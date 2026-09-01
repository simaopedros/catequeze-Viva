import { useTranslation } from "react-i18next";

/**
 * Keyboard/screen-reader shortcut to the page's <main id="main-content">.
 * Visually hidden until focused; shared by the app shell and public layouts.
 */
export function SkipToContent({ targetId = "main-content" }: { targetId?: string }) {
  const { t } = useTranslation("common");
  return (
    <a
      href={`#${targetId}`}
      className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-overlay focus:rounded-sm focus:bg-brand-ink focus:px-4 focus:py-2 focus:text-white"
    >
      {t("skip_to_content")}
    </a>
  );
}
