import "./instrument";
import "./setupApiUrlProxy";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import { routes } from "wasp/client/router";
import { configureQueryClient } from "wasp/client/operations";
import { Toaster } from "../client/components/ui/toaster";
import "./Main.css";
import {
  getDemoNavigationItems,
  getMarketingNavigationItems,
} from "./components/NavBar/constants";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { useOnlineStatus } from "./hooks/useOnlineStatus";
import GoogleTagScripts from "./analytics/GoogleTagScripts";
import { activatePreloadedFonts } from "./fonts";
import { rememberIntendedPath } from "../auth/intendedPath";
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
  areAppNamespacesLoaded,
  enableDocumentLanguageSync,
  ensureAppNamespacesLoaded,
  ensureLocaleLoaded,
  isLocaleBundleLoaded,
  normalizeLocale,
} from "../i18n/config";

const PUBLIC_PATH_PREFIXES = [
  "/ia",
  "/presenca",
  "/sistema",
  "/pricing",
  "/obrigado",
  "/about",
  "/privacy",
  "/terms",
  "/contact",
  "/login",
  "/signup",
  "/request-password-reset",
  "/password-reset",
  "/email-verification",
  "/oauth",
];

/** Landing/auth/legal routes only need the core i18n namespaces. */
function isPublicOnlyPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Runs `cb` once on the first user interaction (or after a long idle) so
 * prefetching never competes with the landing page's critical path.
 */
function scheduleAfterInteraction(cb: () => void): () => void {
  let done = false;
  const events = ["pointerdown", "keydown", "touchstart"] as const;
  const run = () => {
    if (done) return;
    done = true;
    cleanup();
    cb();
  };
  const cleanup = () => {
    for (const evt of events) window.removeEventListener(evt, run);
    window.clearTimeout(timer);
  };
  for (const evt of events) {
    window.addEventListener(evt, run, { passive: true, once: true });
  }
  const timer = window.setTimeout(run, 15_000);
  return cleanup;
}

const CookieConsentBanner = lazy(
  () => import("./components/cookie-consent/Banner"),
);
// Only non-landing public/legacy routes render this bar; keep its Radix
// Sheet/Dropdown dependencies out of the landing bundle.
const NavBar = lazy(() => import("./components/NavBar/NavBar"));

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
  // Gate: wait for en/es pack when preferred locale is not pt-BR (pt-BR core is
  // eager) and for the pt-BR `app` namespaces when entering an authenticated route.
  const needsAppNamespaces = !isPublicOnlyPath(location.pathname);
  const [localeReady, setLocaleReady] = useState(() => {
    const lng = normalizeLocale(i18n.language) ?? "pt-BR";
    return isLocaleBundleLoaded(lng);
  });
  const [appNsReady, setAppNsReady] = useState(() => areAppNamespacesLoaded());
  const i18nReady = localeReady && (!needsAppNamespaces || appNsReady);

  useEffect(() => {
    let cancelled = false;
    const lng = normalizeLocale(i18n.language) ?? "pt-BR";
    void ensureLocaleLoaded(lng).then(() => {
      if (!cancelled) setLocaleReady(true);
    });
    // After hydrate only — Wasp Layout hardcodes <html lang="en">
    enableDocumentLanguageSync(lng);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (appNsReady) return;
    let cancelled = false;
    const markReady = () => {
      if (!cancelled) setAppNsReady(true);
    };
    let cancelPrefetch: (() => void) | undefined;
    if (needsAppNamespaces) {
      void ensureAppNamespacesLoaded().then(markReady);
    } else {
      // Public page: prefetch the app namespaces after the visitor interacts so
      // the transition into /app does not wait on the network.
      cancelPrefetch = scheduleAfterInteraction(
        () => void ensureAppNamespacesLoaded().then(markReady),
      );
    }
    return () => {
      cancelled = true;
      cancelPrefetch?.();
    };
  }, [needsAppNamespaces, appNsReady]);

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

  // Deep links: if this visit gets bounced to /login, the post-login redirect
  // brings the user back here instead of the generic /app.
  useEffect(() => {
    if (isAppRoute || isAdminDashboard) {
      rememberIntendedPath(`${location.pathname}${location.search}`);
    }
  }, [isAppRoute, isAdminDashboard, location.pathname, location.search]);

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
    activatePreloadedFonts();
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
                  <Suspense fallback={<div className="h-16" aria-hidden />}>
                    <NavBar navigationItems={navigationItems} />
                  </Suspense>
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
      {/* GTM + Meta Pixel (LGPD: only after analytics/marketing consent) */}
      <GoogleTagScripts />
    </>
  );
}
