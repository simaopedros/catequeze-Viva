import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "../../client/components/ui/button";
import { trackMarketingEvent } from "../../client/analytics/marketingAnalytics";
import { cn } from "../../client/utils";
import { useLandingText } from "../hooks/useLandingText";

export function MobileStickyCta({ ns = "landing" }: { ns?: string }) {
  const tr = useLandingText(ns);
  const [isHeroVisible, setIsHeroVisible] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined" || window.innerWidth >= 768) return;

    const hero = document.querySelector("[data-landing-hero]");
    if (!hero) return;

    const heroObserver = new IntersectionObserver(
      ([entry]) => setIsHeroVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );
    heroObserver.observe(hero);
    return () => heroObserver.disconnect();
  }, []);

  const shouldShow = !isHeroVisible;

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-[#F7F4EE]/95 p-3 backdrop-blur-md transition-transform duration-300 md:hidden",
        shouldShow ? "translate-y-0" : "translate-y-full pointer-events-none"
      )}
      aria-hidden={!shouldShow}
    >
      <Button size="lg" variant="default" asChild className="h-12 w-full rounded-sm shadow-none">
        <Link
          to="/signup"
          onClick={() =>
            trackMarketingEvent("primary_cta_clicked", {
              landing: ns,
              placement: "mobile_sticky_cta",
              destination: "/signup",
            })
          }
        >
          {tr("mobile_cta.button")}
          <ArrowRight className="h-4 w-4 shrink-0" />
        </Link>
      </Button>
    </div>
  );
}
