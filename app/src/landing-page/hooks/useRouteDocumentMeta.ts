import { useEffect } from "react";
import { useLocation } from "react-router";
import { applyLandingRouteMeta } from "../routeMeta";

/**
 * Applies SPA document meta for marketing landings on mount / path change.
 * Does not claim crawler-first SEO — see routeMeta.ts.
 */
export function useRouteDocumentMeta() {
  const { pathname } = useLocation();

  useEffect(() => {
    applyLandingRouteMeta(pathname);
  }, [pathname]);
}
