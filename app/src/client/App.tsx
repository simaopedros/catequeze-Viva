import "./instrument";
import "./setupApiUrlProxy";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
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
// Family landing is public-host only — code-split so staff landing does not pay for it
const FamilyLandingPage = lazy(
  () => import("../catequese/pages/family/FamilyLandingPage"),
);
// AppShell is authenticated-only — keep out of pure marketing first paint when possible
const AppShell = lazy(() =>
  import("../catequese/AppShell").then((m) => ({ default: m.AppShell })),
);
import { InstallPrompt } from "./components/InstallPrompt";
import {
  marketingLandingFromPath,
  rememberLandingOrigin,
  trackMarketingEvent,
} from "./analytics/marketingAnalytics";
import {
  ensureFbcFromFbclid,
  persistAttributionParams,
  trackPageView,
} from "./analytics/metaTracking";
import { applyLandingRouteMeta } from "../landing-page/routeMeta";
import {
  AI_APP_HOME,
  AI_FEATURES_ENABLED,
  isAiAppPath,
} from "../shared/aiFeatures";
import { SOCIAL_FEATURES_ENABLED } from "../shared/socialFeatures";
import i18n, {
  enableDocumentLanguageSync,
  ensureLocaleLoaded,
  isLocaleBundleLoaded,
  normalizeLocale,
} from "../i18n/config";

const CookieConsentBanner = lazy(
  () => import("./components/cookie-consent/Banner"),
);

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

  // One-time reload when a JS chunk 404s after deploy (stale SW cache)
  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data?.type !== "CHUNK_CACHE_MISS") return;
    const key = "sw-chunk-reload";
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
      window.location.reload();
    } catch {
      window.location.reload();
    }
  });

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
              // Activate new SW; next navigation gets fresh assets
              newWorker.postMessage?.({ type: "SKIP_WAITING" });
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
  // Gate: wait for en/es pack when preferred locale is not pt-BR (pt-BR is eager).
  const [i18nReady, setI18nReady] = useState(() => {
    const lng = normalizeLocale(i18n.language) ?? "pt-BR";
    return isLocaleBundleLoaded(lng);
  });

  useEffect(() => {
    let cancelled = false;
    const lng = normalizeLocale(i18n.language) ?? "pt-BR";
    void ensureLocaleLoaded(lng).then(() => {
      if (!cancelled) setI18nReady(true);
    });
    // After hydrate only — Wasp Layout hardcodes <html lang="en">
    enableDocumentLanguageSync(lng);
    return () => {
      cancelled = true;
    };
  }, []);

  const isFamilyPortal = useMemo(() => isFamilyPortalHost(), []);

  const isMarketingPage = useMemo(() => {
    if (isFamilyPortal) return false;
    return (
      marketingLandingFromPath(location.pathname) !== null ||
      location.pathname.startsWith("/pricing") ||
      // Public Comunidade feed: visitors arrive from shared links and need the
      // marketing nav (sign in, pricing), not the app nav.
      (SOCIAL_FEATURES_ENABLED && location.pathname.startsWith("/comunidade"))
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
      "/obrigado",
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
    ensureFbcFromFbclid();
    persistAttributionParams();
  }, [location.pathname, location.search]);

  useEffect(() => {
    // SPA landing meta first so document.title is route-specific for analytics.
    // Crawler-first HTML still comes from main.wasp head (SEO follow-up).
    applyLandingRouteMeta(location.pathname);
    rememberLandingOrigin(location.pathname);
    trackPageView(location.pathname, document.title);
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

  // Plausible intentionally not loaded — CORS / missing site noise in prod console.
  // Marketing events still go to dataLayer / GTM when configured.

  if (!AI_FEATURES_ENABLED && isAiAppPath(location.pathname)) {
    return <Navigate to={AI_APP_HOME} replace />;
  }

  if (!i18nReady) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-background"
        aria-busy="true"
        aria-live="polite"
      >
        <div className="h-8 w-8 animate-pulse rounded-sm bg-muted" />
      </div>
    );
  }

  return (
    <>
      {!isOnline && !offlineDismissed && (
        <div
          className="fixed left-0 right-0 top-0 z-[100] flex items-center justify-center gap-3 bg-brand-ink py-1.5 text-center text-sm font-medium text-white"
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
        <div className="min-h-screen bg-background text-brand-ink">
          <ErrorBoundary>
            <Suspense
              fallback={
                <div
                  className="flex min-h-screen items-center justify-center"
                  aria-busy="true"
                >
                  <div className="h-8 w-8 animate-pulse rounded-sm bg-muted" />
                </div>
              }
            >
              <FamilyLandingPage />
            </Suspense>
          </ErrorBoundary>
        </div>
      ) : (
        <div className="min-h-screen bg-background text-brand-ink">
          <ErrorBoundary>
            {isAppRoute ? (
              <Suspense
                fallback={
                  <div
                    className="flex min-h-screen items-center justify-center"
                    aria-busy="true"
                  >
                    <div className="h-8 w-8 animate-pulse rounded-sm bg-muted" />
                  </div>
                }
              >
                <AppShell>
                  <Outlet />
                </AppShell>
              </Suspense>
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
      {/* GTM only — Meta Pixel must live inside GTM to avoid double-loading */}
      <GoogleTagScripts />
    </>
  );
}
