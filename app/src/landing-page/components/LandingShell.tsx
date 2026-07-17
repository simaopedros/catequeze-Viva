import { useEffect, type ReactNode } from "react";
import { useLocation } from "react-router";
import { PublicFooter } from "../../catequese/PublicFooter";
import { PublicNavbar } from "../../catequese/PublicNavbar";
import {
  rememberLandingOrigin,
  trackMarketingEvent,
} from "../../client/analytics/marketingAnalytics";
import { MobileStickyCta } from "./MobileStickyCta";
import { useRouteDocumentMeta } from "../hooks/useRouteDocumentMeta";

/**
 * Shared public landing chrome.
 * Keeps navbar, footer, mobile CTA, and document meta consistent across
 * `/`, `/sistema`, `/ia`, and `/presenca` while each page owns section order.
 */
export function LandingShell({
  ns = "landing",
  children,
  /** Extra bottom padding so sticky CTA never covers the last section */
  contentClassName,
}: {
  ns?: string;
  children: ReactNode;
  contentClassName?: string;
}) {
  useRouteDocumentMeta();
  const location = useLocation();

  useEffect(() => {
    rememberLandingOrigin(location.pathname);
    trackMarketingEvent("landing_viewed", {
      landing: ns,
      path: location.pathname,
    });
  }, [location.pathname, ns]);

  return (
    <div className="flex min-h-screen flex-col bg-background text-brand-ink">
      <PublicNavbar />
      <main
        className={
          contentClassName ??
          "flex-1 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-0"
        }
      >
        {children}
      </main>
      <PublicFooter />
      <MobileStickyCta ns={ns} />
    </div>
  );
}
