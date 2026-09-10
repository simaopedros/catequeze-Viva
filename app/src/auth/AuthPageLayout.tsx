import { ReactNode } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { SkipToContent } from "../client/components/SkipToContent";
import { BrandLockup } from "../client/components/brand/Brand";
import { useLocale, SupportedLocale } from "../i18n/useLocale";
import { cn } from "../client/utils";
import { AuthHeader } from "./AuthHeader";

const LOCALE_SHORT: Record<SupportedLocale, string> = {
  "pt-BR": "PT",
  en: "EN",
  es: "ES",
};

type AuthPageLayoutProps = {
  children: ReactNode;
  /** When set, shows institutional left panel (desktop) */
  panel?: {
    eyebrow?: string;
    title: string;
    subtitle?: string;
    points?: string[];
  };
};

export function AuthPageLayout({ children, panel }: AuthPageLayoutProps) {
  const { t } = useTranslation("auth");
  const { currentLocale, setLocale, supportedLocales } = useLocale();

  return (
    <div className="canvas-public flex min-h-screen flex-col">
      <SkipToContent />
      {/* With panel: brand is on the left (desktop); header only on mobile. Without panel: always show header. */}
      <AuthHeader mobileOnly={Boolean(panel)} />

      <div className="flex flex-1">
        {/* Brand panel — desktop */}
        {panel && (
          <aside className="relative hidden w-[min(42%,28rem)] shrink-0 flex-col justify-between overflow-hidden bg-brand-ink px-10 py-10 text-brand-ink-foreground lg:flex xl:w-[28rem] xl:px-12">
            <div
              className="pointer-events-none absolute inset-0 liturgical-halo"
              aria-hidden
            />
            <div className="relative z-[2] space-y-10">
              <Link to="/" className="inline-block">
                <BrandLockup compact hideBadge tone="inverse" />
              </Link>

              <div className="space-y-4">
                {panel.eyebrow && (
                  <p className="text-overline font-semibold uppercase tracking-[0.2em] text-brand-gold">
                    {panel.eyebrow}
                  </p>
                )}
                <h1 className="font-brand-display text-[2rem] font-semibold leading-[1.15] tracking-tight text-white xl:text-[2.25rem]">
                  {panel.title}
                </h1>
                <div className="h-px w-12 bg-brand-gold" aria-hidden />
                {panel.subtitle && (
                  <p className="max-w-[20rem] text-sm leading-relaxed text-brand-ink-muted">
                    {panel.subtitle}
                  </p>
                )}
              </div>

              {panel.points && panel.points.length > 0 && (
                <ul className="space-y-4">
                  {panel.points.map((point, i) => (
                    <li
                      key={point}
                      className="flex gap-3 text-sm leading-snug text-brand-ink-faint"
                    >
                      <span className="font-brand-display mt-0.5 shrink-0 text-[0.7rem] font-semibold tabular-nums text-brand-gold">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <p className="relative z-[2] text-xs text-brand-ink-muted">
              © {new Date().getFullYear()} Catequese Viva
            </p>
          </aside>
        )}

        {/* Form column */}
        <div className="flex flex-1 flex-col">
          <main
            id="main-content"
            tabIndex={-1}
            className="flex flex-1 flex-col justify-center px-4 py-10 sm:px-8 lg:px-12 xl:px-16"
          >
            <div
              className={cn(
                "mx-auto w-full",
                panel ? "max-w-[24rem]" : "max-w-[26rem]",
              )}
            >
              {children}
            </div>
          </main>

          <footer className="border-t border-brand-ink/10 px-4 py-4 sm:px-8">
            <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                {t("footer_copyright", {
                  year: new Date().getFullYear(),
                }).replace(/&copy;|©/g, "©")}
              </p>
              <div
                className="flex items-center gap-1 text-[11px] font-medium tracking-wide text-muted-foreground"
                role="group"
                aria-label={t("language_label")}
              >
                {supportedLocales.map((locale, i) => (
                  <span key={locale} className="inline-flex items-center">
                    {i > 0 && (
                      <span className="mx-1.5 text-border select-none">·</span>
                    )}
                    <button
                      type="button"
                      onClick={() => setLocale(locale)}
                      className={cn(
                        "rounded-sm px-0.5 py-0.5 transition-colors",
                        currentLocale === locale
                          ? "font-semibold text-brand-ink"
                          : "hover:text-brand-ink",
                      )}
                      aria-current={
                        currentLocale === locale ? "true" : undefined
                      }
                    >
                      {LOCALE_SHORT[locale]}
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
