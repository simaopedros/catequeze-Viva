import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { BrandLockup } from "../client/components/brand/Brand";
import { SalesWhatsAppCta } from "../client/components/SalesWhatsAppCta";
import { trackMarketingEvent } from "../client/analytics/marketingAnalytics";
import { useLocale, SupportedLocale } from "../i18n/useLocale";
import { cn } from "../client/utils";

const LOCALE_SHORT: Record<SupportedLocale, string> = {
  "pt-BR": "PT",
  en: "EN",
  es: "ES",
};

export function PublicFooter({
  hidePricing = false,
}: {
  hidePricing?: boolean;
}) {
  const { t } = useTranslation("publicNav");
  const { currentLocale, setLocale, supportedLocales } = useLocale();

  return (
    <footer data-landing-footer className="bg-brand-ink text-brand-ink-foreground">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-10 py-14 sm:py-16 md:grid-cols-12 md:gap-8">
          <div className="md:col-span-5 space-y-4">
            <BrandLockup compact hideBadge tone="inverse" />
            <p className="max-w-xs text-sm leading-relaxed text-brand-ink-muted">
              {t("tagline")}
            </p>
            <div
              className="h-px w-16 bg-gradient-to-r from-brand-gold to-transparent"
              aria-hidden
            />
          </div>

          <div className="md:col-span-3">
            <p className="text-overline font-semibold uppercase tracking-[0.18em] text-brand-gold">
              {t("footer_explore")}
            </p>
            <ul className="mt-4 space-y-2.5 text-sm text-brand-ink-faint">
              <li>
                <a href="/#como" className="transition-colors hover:text-white">
                  {t("how_it_works")}
                </a>
              </li>
              <li>
                <a
                  href="/#recursos"
                  className="transition-colors hover:text-white"
                >
                  {t("resources")}
                </a>
              </li>
              {!hidePricing && (
                <li>
                  <a
                    href="/#planos"
                    className="transition-colors hover:text-white"
                  >
                    {t("pricing")}
                  </a>
                </li>
              )}
              <li>
                <a
                  href="/#duvidas"
                  className="transition-colors hover:text-white"
                >
                  {t("faq")}
                </a>
              </li>
              <li>
                <Link to="/blog" className="transition-colors hover:text-white">
                  {t("blog")}
                </Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-4 md:text-right">
            <p className="text-overline font-semibold uppercase tracking-[0.18em] text-brand-gold">
              {t("footer_talk")}
            </p>
            <p className="mt-4 text-sm leading-relaxed text-brand-ink-muted md:ml-auto md:max-w-[16rem]">
              {t("footer_start_desc")}
            </p>
            <Link
              to="/signup"
              className="mt-5 inline-flex h-10 items-center justify-center rounded-sm bg-brand-paper px-5 text-sm font-semibold text-brand-ink transition-colors hover:bg-white"
              onClick={() =>
                trackMarketingEvent("primary_cta_clicked", {
                  landing: "public_footer",
                  placement: "footer_cta",
                  destination: "/signup",
                })
              }
            >
              {t("cta")}
            </Link>
            <SalesWhatsAppCta
              variant="inline"
              placement="public_footer"
              className="mt-4 text-sm text-brand-ink-muted md:ml-auto md:max-w-[16rem] md:text-right [&_a]:text-brand-light-gold [&_a]:hover:text-white"
            />
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-white/10 py-5 text-xs text-brand-ink-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Catequese Viva</p>

          <div
            className="flex items-center gap-1 text-[11px] font-medium tracking-wide"
            role="group"
            aria-label={t("language")}
          >
            {supportedLocales.map((locale, i) => (
              <span key={locale} className="inline-flex items-center">
                {i > 0 && (
                  <span className="mx-1.5 text-white/20 select-none">·</span>
                )}
                <button
                  type="button"
                  onClick={() => setLocale(locale)}
                  className={cn(
                    "rounded-sm px-0.5 py-0.5 transition-colors",
                    currentLocale === locale
                      ? "font-semibold text-brand-light-gold"
                      : "text-brand-ink-muted hover:text-brand-ink-foreground",
                  )}
                  aria-current={currentLocale === locale ? "true" : undefined}
                >
                  {LOCALE_SHORT[locale]}
                </button>
              </span>
            ))}
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Link
              to="/contact"
              className="transition-colors hover:text-brand-ink-foreground"
            >
              {t("contact")}
            </Link>
            <Link
              to="/about"
              className="transition-colors hover:text-brand-ink-foreground"
            >
              {t("about")}
            </Link>
            <Link
              to="/blog"
              className="transition-colors hover:text-brand-ink-foreground"
            >
              {t("blog")}
            </Link>
            <Link
              to="/privacy"
              className="transition-colors hover:text-brand-ink-foreground"
            >
              {t("privacy")}
            </Link>
            <Link
              to="/terms"
              className="transition-colors hover:text-brand-ink-foreground"
            >
              {t("terms")}
            </Link>
            <Link
              to="/login"
              className="transition-colors hover:text-brand-ink-foreground"
            >
              {t("login")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
