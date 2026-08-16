import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Feather, ChevronRight } from "lucide-react";
import { useScrollReveal } from "../hooks/useScrollReveal";
import { cn } from "../../client/utils";
import { trackMarketingEvent } from "../../client/analytics/marketingAnalytics";

export function AiShowcaseSection({
  ns = "landing",
  responsiveCtas = false,
}: {
  ns?: string;
  responsiveCtas?: boolean;
}) {
  const { t } = useTranslation(ns);
  const { ref, className } = useScrollReveal();

  return (
    <section className="relative overflow-hidden border-y border-border/70 bg-background">
      <div className="relative mx-auto max-w-4xl space-y-6 px-4 py-20 text-center">
        <div ref={ref} className={className}>
          <div className="mb-6 inline-flex items-center gap-2 rounded-sm border border-border/70 bg-white px-4 py-1.5 text-sm font-medium text-brand-ink">
            <Feather className="h-4 w-4 text-brand-gold" />
            {t("ai_showcase_badge")}
          </div>
          <div className="mx-auto mb-4 h-px w-16 bg-gradient-to-r from-brand-gold to-transparent" aria-hidden />
          <h2
            className="text-3xl font-semibold tracking-tight text-brand-ink sm:text-5xl"
            style={{ fontFamily: "var(--font-brand-display)" }}
          >
            {t("ai_showcase_title")}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            {t("ai_showcase_subtitle")}
          </p>
          <div className="mt-8 flex justify-center">
            <Link
              to="/pricing"
              onClick={() =>
                trackMarketingEvent("primary_cta_clicked", {
                  landing: ns,
                  placement: "ai_showcase",
                  destination: "/pricing",
                })
              }
              className={cn(
                "inline-flex h-12 items-center justify-center rounded-sm bg-brand-ink px-8 text-sm font-semibold text-white transition-colors hover:bg-brand-ink-soft",
                responsiveCtas &&
                  "h-auto min-h-12 w-full max-w-sm text-center leading-snug whitespace-normal sm:w-auto",
              )}
            >
              {t("ai_showcase_cta")}
              <ChevronRight className="ml-2 h-4 w-4 shrink-0" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
