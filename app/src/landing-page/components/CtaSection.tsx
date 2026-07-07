import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";
import { useScrollReveal } from "../hooks/useScrollReveal";
import { Button } from "../../client/components/ui/button";
import { Badge } from "../../client/components/ui/badge";
import { BrandMark } from "../../client/components/brand/Brand";
import { cn } from "../../client/utils";
import { trackMarketingEvent } from "../../client/analytics/marketingAnalytics";

function useLandingText(ns: string) {
  const { t } = useTranslation(ns);
  const { t: tLanding } = useTranslation("landing");

  return (key: string) => {
    const value = t(key);
    return typeof value === "string" && value !== key ? value : tLanding(key);
  };
}

export function CtaSection({ ns = "landing", responsiveCtas = false }: { ns?: string; responsiveCtas?: boolean }) {
  const tr = useLandingText(ns);
  const { ref, className } = useScrollReveal();
  const ctaClassName = responsiveCtas ? "h-auto min-h-12 w-full px-6 text-center leading-snug whitespace-normal sm:w-auto sm:px-10" : undefined;

  return (
    <section className="mx-auto max-w-3xl px-4 pb-32 md:pb-20">
      <div ref={ref} className={cn("relative overflow-hidden rounded-3xl border border-border/70 bg-muted/20 p-12 text-center space-y-5", responsiveCtas && "rounded-2xl px-5 py-8 sm:rounded-3xl sm:p-12", className)}>
        <div className="relative space-y-5">
          <Badge variant="brand" className="inline-flex items-center gap-1.5 border-0 bg-background text-primary shadow-none"><BrandMark className="h-3.5 w-3.5" />{tr("cta_badge")}</Badge>
          <h2 className="text-title-xl font-bold">{tr("cta_title")}</h2>
          <p className="mx-auto max-w-lg text-text-secondary">{tr("cta_subtitle")}</p>
          <div className="flex flex-col gap-2 pt-2">
            <Button size="xl" variant="brand" asChild className={ctaClassName}>
              <Link to="/signup" onClick={() => trackMarketingEvent("primary_cta_clicked", { landing: ns, placement: "closing_cta", destination: "/signup" })}>
                {tr("cta_button")}
                <ArrowRight className="h-4 w-4 shrink-0" />
              </Link>
            </Button>
            <p className="text-xs leading-relaxed text-text-secondary">{tr("cta_helper")}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
