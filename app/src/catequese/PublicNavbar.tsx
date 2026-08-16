import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Menu, X } from "lucide-react";
import { Button } from "../client/components/ui/button";
import { BrandLockup } from "../client/components/brand/Brand";

export function PublicNavbar({
  hidePricing = false,
}: {
  hidePricing?: boolean;
}) {
  const { t } = useTranslation("publicNav");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const linkClass =
    "text-[0.8125rem] font-medium tracking-wide text-muted-foreground transition-colors hover:text-brand-ink";

  return (
    <header className="sticky top-0 z-sticky border-b border-brand-ink/8 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/90">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
        <Link
          to="/"
          className="min-w-0 shrink-0 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-ink/30 focus-visible:ring-offset-2"
          onClick={() => setOpen(false)}
        >
          <BrandLockup compact hideBadge />
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-8 md:flex">
          <a href="/#recursos" className={linkClass}>
            {t("resources")}
          </a>
          <a href="/#como" className={linkClass}>
            {t("how_it_works")}
          </a>
          {!hidePricing && (
            <Link to="/pricing" className={linkClass}>
              {t("pricing")}
            </Link>
          )}
          <Link to="/contact" className={linkClass}>
            {t("contact")}
          </Link>
        </nav>

        <div className="hidden items-center gap-5 md:flex">
          <Link
            to="/login"
            className="text-[0.8125rem] font-medium text-muted-foreground transition-colors hover:text-brand-ink"
          >
            {t("login")}
          </Link>
          <Button
            size="sm"
            variant="default"
            asChild
            className="h-9 rounded-md px-4 text-[0.8125rem] font-medium"
          >
            <Link to="/signup">{t("cta")}</Link>
          </Button>
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-sm text-brand-ink md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? t("closeMenu") : t("openMenu")}
          aria-expanded={open}
        >
          {open ? (
            <X className="h-5 w-5" strokeWidth={1.75} />
          ) : (
            <Menu className="h-5 w-5" strokeWidth={1.75} />
          )}
        </button>
      </div>

      {open && (
        <div className="border-t border-brand-ink/8 bg-white md:hidden">
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
            <nav className="flex flex-col">
              <a
                href="/#recursos"
                className="border-b border-border/50 py-3.5 text-[0.9375rem] font-medium text-brand-ink"
                onClick={() => setOpen(false)}
              >
                {t("resources")}
              </a>
              <a
                href="/#como"
                className="border-b border-border/50 py-3.5 text-[0.9375rem] font-medium text-brand-ink"
                onClick={() => setOpen(false)}
              >
                {t("how_it_works")}
              </a>
              {!hidePricing && (
                <Link
                  to="/pricing"
                  className="border-b border-border/50 py-3.5 text-[0.9375rem] font-medium text-brand-ink"
                  onClick={() => setOpen(false)}
                >
                  {t("pricing")}
                </Link>
              )}
              <Link
                to="/contact"
                className="border-b border-border/50 py-3.5 text-[0.9375rem] font-medium text-brand-ink"
                onClick={() => setOpen(false)}
              >
                {t("contact")}
              </Link>
            </nav>

            <div className="mt-6 flex flex-col gap-2.5">
              <Button
                size="lg"
                variant="default"
                asChild
                className="h-11 w-full rounded-md"
              >
                <Link to="/signup" onClick={() => setOpen(false)}>
                  {t("cta")}
                </Link>
              </Button>
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="py-2 text-center text-sm font-medium text-muted-foreground hover:text-brand-ink"
              >
                {t("login")}
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
