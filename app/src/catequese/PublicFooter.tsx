import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { BrandLockup } from "../client/components/brand/Brand";
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
    <footer data-landing-footer className="bg-brand-ink text-[#E8EEF5]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-10 py-14 sm:py-16 md:grid-cols-12 md:gap-8">
          <div className="md:col-span-5 space-y-4">
            <BrandLockup compact hideBadge tone="inverse" />
            <p className="max-w-xs text-sm leading-relaxed text-[#A8B8C9]">
              {t("tagline")}
            </p>
            <div className="h-px w-10 bg-brand-gold/80" aria-hidden />
          </div>

          <div className="md:col-span-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-gold/90">
              {t("footer_explore")}
            </p>
            <ul className="mt-4 space-y-2.5 text-sm text-[#C5D0DC]">
              <li>
                <a
                  href="/#recursos"
                  className="transition-colors hover:text-white"
                >
                  {t("resources")}
                </a>
              </li>
              <li>
                <a href="/#como" className="transition-colors hover:text-white">
                  {t("how_it_works")}
                </a>
              </li>
              {!hidePricing && (
                <li>
                  <Link
                    to="/pricing"
                    className="transition-colors hover:text-white"
                  >
                    {t("pricing")}
                  </Link>
                </li>
              )}
              <li>
                <Link
                  to="/contact"
                  className="transition-colors hover:text-white"
                >
                  {t("contact")}
                </Link>
              </li>
              <li>
                <Link
                  to="/about"
                  className="transition-colors hover:text-white"
                >
                  {t("about")}
                </Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-4 md:text-right">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-gold/90">
              {t("footer_start")}
            </p>
            <p className="mt-4 text-sm leading-relaxed text-[#A8B8C9] md:ml-auto md:max-w-[16rem]">
              {t("footer_start_desc")}
            </p>
            <Link
              to="/signup"
              className="mt-5 inline-flex h-10 items-center justify-center rounded-sm bg-[#FFF7E7] px-5 text-sm font-semibold text-brand-ink transition-colors hover:bg-white"
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
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-white/10 py-5 text-xs text-[#8A9AAB] sm:flex-row sm:items-center sm:justify-between">
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
                      ? "font-semibold text-[#F4CF7A]"
                      : "text-[#8A9AAB] hover:text-[#E8EEF5]",
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
              to="/privacy"
              className="transition-colors hover:text-[#E8EEF5]"
            >
              {t("privacy")}
            </Link>
            <Link
              to="/terms"
              className="transition-colors hover:text-[#E8EEF5]"
            >
              {t("terms")}
            </Link>
            <Link
              to="/login"
              className="transition-colors hover:text-[#E8EEF5]"
            >
              {t("login")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
