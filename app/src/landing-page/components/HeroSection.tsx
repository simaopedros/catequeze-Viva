import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { ArrowRight, Sparkles } from "lucide-react";
import { useScrollReveal } from "../hooks/useScrollReveal";
import { Button } from "../../client/components/ui/button";
import { Badge } from "../../client/components/ui/badge";
import { cn } from "../../client/utils";
import { trackMarketingEvent } from "../../client/analytics/marketingAnalytics";

export function HeroSection({ ns = "landing", responsiveCtas = false }: { ns?: string; responsiveCtas?: boolean; }) {
  const { t } = useTranslation(ns);
  const { ref: revealRef, className: revealClass } = useScrollReveal();
  const ctaClassName = responsiveCtas ? "h-auto min-h-12 w-full px-6 text-center leading-snug whitespace-normal sm:w-auto sm:px-10" : undefined;

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      <div className="absolute top-20 right-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

      <div ref={revealRef} className={`relative max-w-4xl mx-auto px-4 py-16 sm:py-20 md:py-28 ${revealClass}`}>
        <div className="space-y-6 md:space-y-8 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2">
            <Badge variant="brand" size="lg" className="gap-1.5 backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              {t("hero.badge")}
            </Badge>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.1] text-balance">
            {t("hero.headline_line1")}<br />
            <span className="text-gradient-primary">{t("hero.headline_line2")}</span>
          </h1>

          {/* Subheadline — concreta, focada no catequista */}
          <p className="text-lg md:text-xl text-text-secondary max-w-2xl mx-auto leading-relaxed">
            {t("hero.subheadline")}
          </p>

          {/* CTA principal + click trigger */}
          <div className={cn("flex flex-col items-center gap-3 max-w-md mx-auto", responsiveCtas && "w-full sm:w-auto sm:max-w-none")}>
            <Button size="xl" variant="brand" asChild className={ctaClassName}>
              <Link to="/signup" onClick={() => trackMarketingEvent("primary_cta_clicked", { landing: ns, placement: "hero", destination: "/signup" })}>
                {t("hero.cta_primary")}
                <ArrowRight className="h-4 w-4 shrink-0" />
              </Link>
            </Button>
            {/* Click trigger — reduz objeção (RCD: CTA microcopy) */}
            <p className="text-sm text-muted-foreground">{t("hero.click_trigger")}</p>
          </div>

          {/* Imagem real do produto */}
          <div className="mt-8 mx-auto max-w-3xl">
            <div className="overflow-hidden rounded-2xl border border-border/60 shadow-elevation-md bg-muted/20">
              <img
                src="/landing/hero-mobile-light.png"
                alt={t("hero.image_alt")}
                className="w-full h-auto block"
                loading="eager"
                fetchPriority="high"
                decoding="async"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
