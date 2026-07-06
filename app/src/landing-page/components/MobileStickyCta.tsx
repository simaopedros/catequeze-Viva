import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";
import { Button } from "../../client/components/ui/button";
import { trackMarketingEvent } from "../../client/analytics/marketingAnalytics";
import { cn } from "../../client/utils";

function useLandingText(ns: string) {
  const { t } = useTranslation(ns);
  const { t: tLanding } = useTranslation("landing");

  return (key: string) => {
    const value = t(key);
    return typeof value === "string" && value !== key ? value : tLanding(key);
  };
}

export function MobileStickyCta({ ns = "landing" }: { ns?: string }) {
  const tr = useLandingText(ns);
  const [isHeroVisible, setIsHeroVisible] = useState(true);
  const [isPricingVisible, setIsPricingVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || window.innerWidth >= 768) return;

    const hero = document.querySelector("[data-landing-hero]");
    const pricing = document.getElementById("planos");

    const heroObserver = hero
      ? new IntersectionObserver(
          ([entry]) => {
            setIsHeroVisible(entry.isIntersecting);
          },
          { threshold: 0.2 }
        )
      : null;

    const pricingObserver = pricing
      ? new IntersectionObserver(
          ([entry]) => {
            setIsPricingVisible(entry.isIntersecting);
          },
          { threshold: 0.15 }
        )
      : null;

    if (hero && heroObserver) heroObserver.observe(hero);
    if (pricing && pricingObserver) pricingObserver.observe(pricing);

    return () => {
      heroObserver?.disconnect();
      pricingObserver?.disconnect();
    };
  }, []);

  const shouldShow = !isHeroVisible && !isPricingVisible;

  return (
    <div
      className={cn(
        "fixed inset-x-3 bottom-3 z-40 md:hidden transition-all duration-300",
        shouldShow ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
      )}
      aria-hidden={!shouldShow}
    >
      <div className="rounded-2xl border border-primary/20 bg-background/95 p-2 shadow-2xl backdrop-blur-md">
        <div className="mb-2 px-2 text-center">
          <p className="text-sm font-semibold text-foreground">{tr("mobile_cta.title")}</p>
          <p className="text-xs text-text-secondary">{tr("mobile_cta.subtitle")}</p>
        </div>
        <Button size="lg" variant="brand" asChild className="h-auto min-h-12 w-full px-5 py-3 text-center leading-snug whitespace-normal">
          <Link to="/pricing" onClick={() => trackMarketingEvent("primary_cta_clicked", { landing: ns, placement: "mobile_sticky_cta", destination: "/pricing" })}>
            {tr("mobile_cta.button")}
            <ArrowRight className="h-4 w-4 shrink-0" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
