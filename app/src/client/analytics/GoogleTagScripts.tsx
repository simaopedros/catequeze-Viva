import { useEffect, useState } from "react";

declare global {
  interface Window {
    dataLayer: unknown[];
  }
}

// Production container id; REACT_APP_GTM_ID overrides it (empty string disables GTM).
const DEFAULT_GTM_ID = "GTM-MTGNTJG6";
const envGtmId = import.meta.env.REACT_APP_GTM_ID as string | undefined;
const GTM_ID = envGtmId === undefined ? DEFAULT_GTM_ID : envGtmId.trim();

function hasAnalyticsConsent(): boolean {
  try {
    // vanilla-cookieconsent stores preferences
    const raw = localStorage.getItem("cc_cookie");
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    const cats = parsed?.categories || parsed?.level || [];
    if (Array.isArray(cats)) {
      return cats.includes("analytics") || cats.includes("marketing");
    }
    return false;
  } catch {
    return false;
  }
}

function loadGtm() {
  if (!GTM_ID) return;
  window.dataLayer = window.dataLayer || [];
  const alreadyLoaded = document.querySelector(
    `script[src*="googletagmanager.com/gtm.js?id=${GTM_ID}"]`,
  );
  if (alreadyLoaded) return;

  window.dataLayer.push({ "gtm.start": new Date().getTime(), event: "gtm.js" });
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`;
  document.head.appendChild(script);
}

/**
 * GTM is the sole marketing tag loader (Meta Pixel via GTM only).
 * Loads after analytics consent; if consent already exists, after first paint / idle.
 */
export default function GoogleTagScripts() {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (!GTM_ID) return;

    const enable = () => setAllowed(true);

    if (hasAnalyticsConsent()) {
      // After first paint / idle when consent already present
      const ric = (window as any).requestIdleCallback as
        | ((fn: () => void, opts?: { timeout: number }) => number)
        | undefined;
      if (ric) {
        ric(enable, { timeout: 2500 });
      } else {
        window.setTimeout(enable, 1500);
      }
    }

    const onConsent = () => {
      if (hasAnalyticsConsent()) enable();
    };
    window.addEventListener("cc:onConsent", onConsent);
    window.addEventListener("cc:onChange", onConsent);
    // vanilla-cookieconsent also fires custom events on some versions
    document.addEventListener("cc:onConsent", onConsent as EventListener);

    return () => {
      window.removeEventListener("cc:onConsent", onConsent);
      window.removeEventListener("cc:onChange", onConsent);
      document.removeEventListener("cc:onConsent", onConsent as EventListener);
    };
  }, []);

  useEffect(() => {
    if (allowed) loadGtm();
  }, [allowed]);

  return null;
}
