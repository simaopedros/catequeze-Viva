import "./instrument";
import "./setupApiUrlProxy";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Outlet, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import { routes } from "wasp/client/router";
import { configureQueryClient } from "wasp/client/operations";
import { Toaster } from "../client/components/ui/toaster";
import "./Main.css";
import NavBar from "./components/NavBar/NavBar";
import {
  getDemoNavigationItems,
  getMarketingNavigationItems,
} from "./components/NavBar/constants";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { useOnlineStatus } from "./hooks/useOnlineStatus";
import GoogleTagScripts from "./analytics/GoogleTagScripts";
import { isFamilyPortalHost } from "../shared/portal";
import FamilyLandingPage from "../catequese/pages/family/FamilyLandingPage";
import { AppShell } from "../catequese/AppShell";
import { InstallPrompt } from "./components/InstallPrompt";
import {
  marketingLandingFromPath,
  trackMarketingEvent,
} from "./analytics/marketingAnalytics";

import "../i18n/config";

const CookieConsentBanner = lazy(() => import("./components/cookie-consent/Banner"));

function isLocalDevHost() {
  if (typeof window === "undefined") return false;
  return ["localhost", "127.0.0.1"].includes(window.location.hostname);
}

async function disableServiceWorkerInDev() {
  if (!("serviceWorker" in navigator)) return;

  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    registrations.map((registration) => registration.unregister()),
  );

  if (typeof caches !== "undefined") {
    const cacheKeys = await caches.keys();
    await Promise.all(cacheKeys.map((key) => caches.delete(key)));
  }
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  if (isLocalDevHost()) {
    void disableServiceWorkerInDev();
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).then(
      (registration) => {
        if (!registration) {
          console.warn("[SW] Registration resolved with no value");
          return;
        }
        console.log("[SW] Registered:", registration.scope);
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              console.log("[SW] New version available");
            }
          });
        });
      },
      (err) => console.warn("[SW] Registration failed:", err),
    );
  });
}

configureQueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      cacheTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  const location = useLocation();
  const isOnline = useOnlineStatus();
  const { t } = useTranslation("common");
  const { t: tNavigation } = useTranslation("navigation");
  const { t: tPublicNav } = useTranslation("publicNav");
  const [offlineDismissed, setOfflineDismissed] = useState(false);

  const isFamilyPortal = useMemo(() => isFamilyPortalHost(), []);

  const isMarketingPage = useMemo(() => {
    if (isFamilyPortal) return false;
    return (
      marketingLandingFromPath(location.pathname) !== null ||
      location.pathname.startsWith("/pricing")
    );
  }, [location.pathname, isFamilyPortal]);

  const marketingNavigationItems = useMemo(
    () => getMarketingNavigationItems(tPublicNav),
    [tPublicNav],
  );
  const demoNavigationItems = useMemo(
    () => getDemoNavigationItems(tNavigation, t),
    [tNavigation, t],
  );

  const navigationItems = isMarketingPage
    ? marketingNavigationItems
    : demoNavigationItems;

  const shouldDisplayAppNavBar = useMemo(() => {
    if (isFamilyPortal) return false;
    const publicPaths = [
      "/",
      "/ia",
      "/presenca",
      "/sistema",
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
    if (location.pathname.startsWith("/upload-docs/")) return false;
    return true;
  }, [location.pathname, isFamilyPortal]);

  const isAdminDashboard = useMemo(() => {
    return location.pathname.startsWith("/admin");
  }, [location.pathname]);

  const isAppRoute = useMemo(() => {
    return (
      location.pathname.startsWith("/app") || location.pathname === "/account"
    );
  }, [location.pathname]);

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

  useEffect(() => {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: "page_view",
      page: {
        path: location.pathname,
        title: document.title,
        location: window.location.href,
      },
    });
    const landing = marketingLandingFromPath(location.pathname);
    if (landing) {
      trackMarketingEvent("landing_viewed", {
        landing,
        locale: document.documentElement.lang || "unknown",
        referrer: document.referrer
          ? new URL(document.referrer).hostname
          : "direct",
      });
    }
  }, [location.pathname]);

  useEffect(() => {
    registerServiceWorker();
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const script = document.createElement("script");
      script.src = "https://plausible.io/js/script.js";
      script.defer = true;
      script.setAttribute("data-domain", "catechis.app");
      document.head.appendChild(script);
      return () => {
        document.head.removeChild(script);
      };
    }
  }, []);

  return (
    <>
      {!isOnline && !offlineDismissed && (
        <div
          className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-white text-center py-1.5 text-sm font-medium flex items-center justify-center gap-3"
          role="alert"
          aria-live="assertive"
        >
          {t("offline_banner")}
          <button
            onClick={() => setOfflineDismissed(true)}
            className="underline hover:text-white/80 text-xs"
            aria-label={t("close")}
          >
            {t("close")}
          </button>
        </div>
      )}
      {isFamilyPortal && location.pathname === "/" ? (
        <div className="bg-background text-foreground min-h-screen">
          <ErrorBoundary>
            <FamilyLandingPage />
          </ErrorBoundary>
        </div>
      ) : (
        <div className="bg-background text-foreground min-h-screen">
          <ErrorBoundary>
            {isAppRoute ? (
              <AppShell>
                <Outlet />
              </AppShell>
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
      <Suspense fallback={null}>
        <CookieConsentBanner />
      </Suspense>
      <InstallPrompt />
      <GoogleTagScripts />
    </>
  );
}
