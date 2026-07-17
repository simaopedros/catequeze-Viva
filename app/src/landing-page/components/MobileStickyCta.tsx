import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "../../client/components/ui/button";
import { trackMarketingEvent } from "../../client/analytics/marketingAnalytics";
import { cn } from "../../client/utils";
import { useLandingText } from "../hooks/useLandingText";

/**
 * Mobile sticky CTA:
 * - Hidden while hero is in view
 * - Hidden near page end (closing CTA already visible)
 * - Respects safe-area and cookie consent bar height
 * - Tracks campaign query params when present
 */
export function MobileStickyCta({ ns = "landing" }: { ns?: string }) {
  const tr = useLandingText(ns);
  const [searchParams] = useSearchParams();
  const [isHeroVisible, setIsHeroVisible] = useState(true);
  const [isNearFooter, setIsNearFooter] = useState(false);
  const [cookieOffset, setCookieOffset] = useState(0);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  const campaign =
    searchParams.get("utm_campaign") ||
    searchParams.get("campaign") ||
    searchParams.get("gclid") ||
    undefined;

  useEffect(() => {
    if (typeof window === "undefined" || window.innerWidth >= 768) return;

    const hero = document.querySelector("[data-landing-hero]");
    const footer =
      document.querySelector("footer") ||
      document.querySelector("[data-landing-footer]");

    const observers: IntersectionObserver[] = [];

    if (hero) {
      const heroObserver = new IntersectionObserver(
        ([entry]) => setIsHeroVisible(entry.isIntersecting),
        { threshold: 0.08 },
      );
      heroObserver.observe(hero);
      observers.push(heroObserver);
    }

    if (footer) {
      const footerObserver = new IntersectionObserver(
        ([entry]) => setIsNearFooter(entry.isIntersecting),
        { rootMargin: "0px 0px 80px 0px", threshold: 0 },
      );
      footerObserver.observe(footer);
      observers.push(footerObserver);
    }

    return () => observers.forEach((o) => o.disconnect());
  }, []);

  // Cookie consent bar may sit at bottom — lift CTA above it
  useEffect(() => {
    if (typeof window === "undefined" || window.innerWidth >= 768) return;

    const measure = () => {
      const bar =
        document.querySelector("#cc-main .cm") ||
        document.querySelector(".cm--bar") ||
        document.querySelector("[class*='cm-wrapper']") ||
        document.querySelector("#cookieconsent .cm");
      if (bar instanceof HTMLElement && bar.offsetParent !== null) {
        setCookieOffset(bar.getBoundingClientRect().height || 0);
      } else {
        setCookieOffset(0);
      }
    };

    measure();
    const id = window.setInterval(measure, 800);
    window.addEventListener("resize", measure);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("resize", measure);
    };
  }, []);

  // Hide while virtual keyboard is open (avoids covering inputs on long forms)
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const inset = window.innerHeight - vv.height - vv.offsetTop;
      setKeyboardOpen(inset > 120);
    };
    vv.addEventListener("resize", update);
    return () => vv.removeEventListener("resize", update);
  }, []);

  const shouldShow = !isHeroVisible && !isNearFooter && !keyboardOpen;

  return (
    <div
      className={cn(
        "fixed inset-x-0 z-40 border-t border-border/80 bg-background/95 p-3 backdrop-blur-md transition-transform duration-300 motion-reduce:transition-none md:hidden",
        shouldShow ? "translate-y-0" : "translate-y-full pointer-events-none",
      )}
      style={{
        bottom: cookieOffset,
        paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))",
      }}
      aria-hidden={!shouldShow}
      data-landing-sticky-cta
    >
      <Button
        size="lg"
        variant="default"
        asChild
        className="h-12 min-h-12 w-full rounded-sm shadow-none"
      >
        <Link
          to="/signup"
          onClick={() =>
            trackMarketingEvent("primary_cta_clicked", {
              landing: ns,
              placement: "mobile_sticky_cta",
              destination: "/signup",
              campaign: campaign || null,
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
