import "./instrument";
import "./setupApiUrlProxy";
import { useEffect, useMemo } from "react";
import { Outlet, useLocation } from "react-router";
import { routes } from "wasp/client/router";
import { configureQueryClient } from "wasp/client/operations";
import { Toaster } from "../client/components/ui/toaster";
import "./Main.css";
import NavBar from "./components/NavBar/NavBar";
import {
  demoNavigationitems,
  marketingNavigationItems,
} from "./components/NavBar/constants";
import CookieConsentBanner from "./components/cookie-consent/Banner";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { useOnlineStatus } from "./hooks/useOnlineStatus";
import HimetricaScripts from "./analytics/HimetricaScripts";
import { useHimetricaIdentify } from "./analytics/useHimetricaIdentify";
import { isFamilyPortalHost } from "../shared/portal";
import FamilyLandingPage from "../catequese/pages/family/FamilyLandingPage";

import "../i18n/config";
import { applyStoredLocale } from "../i18n/useLocale";

// Configure React Query cache times for optimal performance:
// - Reference data (Bible/Catechism/Directory) never changes → Infinity
// - Operational data (classes, catechumens) changes infrequently → 5 min
// - Volatile data (dashboard stats, notifications) → 30 sec
configureQueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 min default
      cacheTime: 30 * 60 * 1000, // 30 min garbage collection
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  const location = useLocation();
  const isOnline = useOnlineStatus();
  useHimetricaIdentify();

  const isFamilyPortal = useMemo(() => isFamilyPortalHost(), []);

  const isMarketingPage = useMemo(() => {
    if (isFamilyPortal) return false;
    return (
      location.pathname === "/" || location.pathname.startsWith("/pricing")
    );
  }, [location, isFamilyPortal]);

  const navigationItems = isMarketingPage
    ? marketingNavigationItems
    : demoNavigationitems;

  const shouldDisplayAppNavBar = useMemo(() => {
    if (isFamilyPortal) return false;
    const publicPaths = [
      "/",
      "/pricing",
      "/about",
      "/privacy",
      "/terms",
      "/contact",
      "/oauth/callback",
      routes.LoginRoute.build(),
      routes.SignupRoute.build(),
      routes.RequestPasswordResetRoute.build(),
      routes.PasswordResetRoute.build(),
      routes.EmailVerificationRoute.build(),
    ];
    if (publicPaths.includes(location.pathname)) return false;
    if (location.pathname.startsWith('/upload-docs/')) return false;
    return true;
  }, [location, isFamilyPortal]);

  const isAdminDashboard = useMemo(() => {
    return location.pathname.startsWith("/admin");
  }, [location]);

  const isAppRoute = useMemo(() => {
    return location.pathname.startsWith("/app");
  }, [location]);

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace("#", "");
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView();
      }
    }
  }, [location]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Apply stored locale after hydration to avoid mismatch with SSR
  useEffect(() => {
    applyStoredLocale();
  }, []);

  return (
    <>
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-white text-center py-1.5 text-sm font-medium">
          Sem conexão à internet. Algumas funcionalidades podem estar indisponíveis.
        </div>
      )}
      {/* Family portal: root path renders FamilyLandingPage */}
      {isFamilyPortal && location.pathname === '/' ? (
        <div className="bg-background text-foreground min-h-screen">
          <ErrorBoundary>
            <FamilyLandingPage />
          </ErrorBoundary>
        </div>
      ) : (
        <div className="bg-background text-foreground min-h-screen">
          <ErrorBoundary>
            {isAppRoute ? (
              <Outlet />
            ) : isAdminDashboard ? (
              <Outlet />
            ) : (
              <>
                {shouldDisplayAppNavBar && (
                  <NavBar navigationItems={navigationItems} />
                )}
                <div className="mx-auto max-w-(--breakpoint-2xl)">
                  <Outlet />
                </div>
              </>
            )}
          </ErrorBoundary>
        </div>
      )}
      <Toaster position="top-right" />
      <CookieConsentBanner />
      <HimetricaScripts />
    </>
  );
}
