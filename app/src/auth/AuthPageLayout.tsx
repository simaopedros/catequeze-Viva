import {
  Component,
  ReactNode,
  lazy,
  Suspense,
  useEffect,
  useState,
} from "react";

import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { SkipToContent } from "../client/components/SkipToContent";
import { BrandLockup } from "../client/components/brand/Brand";
import { usePageTitle } from "../client/hooks/usePageTitle";
import { useLocale, SupportedLocale } from "../i18n/useLocale";
import { cn } from "../client/utils";
import { AuthHeader } from "./AuthHeader";

const AuthFeaturePanel = lazy(() => import("./AuthFeaturePanel"));

// A failed optional chunk must never take down the authentication form.
class PanelBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

const LOCALE_SHORT: Record<SupportedLocale, string> = {
  "pt-BR": "PT",
  en: "EN",
  es: "ES",
};

type AuthPageLayoutProps = {
  children: ReactNode;
  /** Browser tab title segment before " · Catechis". */
  pageTitle?: string;
  animatedPanel?: boolean;
  /** When set, shows institutional left panel (desktop) */
  panel?: {
    eyebrow?: string;
    title: string;
    subtitle?: string;
    points?: string[];
  };
};

export function AuthPageLayout({
  children,
  panel,
  pageTitle,
  animatedPanel = false,
}: AuthPageLayoutProps) {
  const { t } = useTranslation("auth");
  const { currentLocale, setLocale, supportedLocales } = useLocale();
  usePageTitle(pageTitle);
  // Defer the optional panel chunk until after the form commits.
  const [showMotion, setShowMotion] = useState(false);
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    if (!animatedPanel) return;
    const media = window.matchMedia("(min-width: 1024px)");
    const update = () => setDesktop(media.matches);
    update();
    setShowMotion(true);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [animatedPanel]);

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SkipToContent />
      {/* With panel: brand is on the left (desktop); header only on mobile. Without panel: always show header. */}
      <AuthHeader mobileOnly={Boolean(panel)} />

      <div className="flex flex-1">
        {/* Brand panel — desktop */}
        {panel && (
          <aside
            data-viewport-fixed={animatedPanel || undefined}
            className={cn(
              "relative hidden w-[min(42%,28rem)] shrink-0 flex-col justify-between bg-brand-ink px-10 py-10 text-[#E8EEF5] lg:flex xl:w-[48%] xl:px-12",
              animatedPanel &&
                "auth-motion-aside lg:sticky lg:top-0 lg:h-screen lg:self-start lg:overflow-hidden",
            )}
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.08]"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 15% 20%, #F4CF7A 0%, transparent 42%), radial-gradient(circle at 85% 75%, #D39A2B 0%, transparent 38%)",
              }}
              aria-hidden
            />
            <div
              className={cn(
                "relative flex flex-1 flex-col gap-7",
                animatedPanel && "auth-motion-content min-h-0",
              )}
            >
              <Link to="/" className="inline-block">
                <BrandLockup compact hideBadge tone="inverse" />
              </Link>

              {animatedPanel ? (
                <>
                  <div className="auth-motion-heading shrink-0 space-y-3">
                    <h1 className="font-brand-display text-[1.8rem] font-semibold leading-tight tracking-tight text-white xl:text-[2.25rem]">
                      {panel.title}
                    </h1>
                    <div className="h-px w-12 bg-brand-gold" aria-hidden />
                    {panel.subtitle && (
                      <p className="auth-motion-subtitle max-w-sm text-sm leading-relaxed text-[#A8B8C9]">
                        {panel.subtitle}
                      </p>
                    )}
                  </div>
                  {showMotion && desktop && (
                    <PanelBoundary fallback={null}>
                      <Suspense fallback={null}>
                        <AuthFeaturePanel />
                      </Suspense>
                    </PanelBoundary>
                  )}
                </>
              ) : (
                <div className="space-y-4">
                  {panel.eyebrow && (
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-gold/90">
                      {panel.eyebrow}
                    </p>
                  )}
                  <h1 className="font-brand-display text-[2rem] font-semibold leading-[1.15] tracking-tight text-white xl:text-[2.25rem]">
                    {panel.title}
                  </h1>
                  <div className="h-px w-12 bg-brand-gold" aria-hidden />
                  {panel.subtitle && (
                    <p className="text-sm leading-relaxed text-[#A8B8C9] max-w-[20rem]">
                      {panel.subtitle}
                    </p>
                  )}
                </div>
              )}

              {!animatedPanel && panel.points && panel.points.length > 0 && (
                <ul className="space-y-4">
                  {panel.points.map((point, i) => (
                    <li
                      key={point}
                      className="flex gap-3 text-sm leading-snug text-[#C5D0DC]"
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

            <p className="relative mt-6 text-xs text-[#6B7C8F]">
              © {new Date().getFullYear()} Catechis
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
              {animatedPanel && showMotion && !desktop && (
                <div className="lg:hidden">
                  <PanelBoundary fallback={null}>
                    <Suspense fallback={null}>
                      <AuthFeaturePanel compact />
                    </Suspense>
                  </PanelBoundary>
                </div>
              )}
            </div>
          </main>

          <footer className="border-t border-brand-ink/8 px-4 py-4 sm:px-8">
            <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                {t("footer_copyright", {
                  year: new Date().getFullYear(),
                }).replace(/&copy;|©/g, "©")}
              </p>
              <div
                className="flex items-center gap-1 text-xs font-medium tracking-wide text-muted-foreground"
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
                        "inline-flex min-h-11 min-w-11 items-center justify-center rounded-sm px-2 py-2 transition-colors",
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
