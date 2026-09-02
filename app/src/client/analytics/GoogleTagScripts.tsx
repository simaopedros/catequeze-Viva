import { useEffect, useState } from "react";

// Import to ensure global Window type augmentation from metaTracking is visible
// (fbq: MetaFbq | undefined declared there, avoids duplicate declaration)
import type {} from "./metaTracking";

declare global {
  interface Window {
    dataLayer: unknown[];
  }
}

// Production container id; REACT_APP_GTM_ID overrides it (empty string disables GTM).
const DEFAULT_GTM_ID = "GTM-MTGNTJG6";
const envGtmId = import.meta.env.REACT_APP_GTM_ID as string | undefined;
const GTM_ID = envGtmId === undefined ? DEFAULT_GTM_ID : envGtmId.trim();

// Meta Pixel ID from env; if empty, skip pixel (but still load GTM).
const META_PIXEL_ID = (
  import.meta.env.REACT_APP_META_PIXEL_ID as string | undefined
)?.trim();

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

function loadMetaPixel() {
  if (!META_PIXEL_ID) return;
  
  // Skip if already initialized
  const alreadyLoaded = document.querySelector(
    'script[src*="connect.facebook.net"][src*="fbevents.js"]',
  );
  if (alreadyLoaded || typeof window.fbq === "function") return;

  // Skip on localhost (noisy + GTM often loads same pixel in parallel)
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    if (import.meta.env.DEV) {
      console.info(
        "[meta-pixel] skip fbq init on localhost (dataLayer still works)",
      );
    }
    return;
  }

  // Initialize fbq stub
  const fbq = function (...args: unknown[]) {
    const self = fbq as any;
    if (self.callMethod) {
      self.callMethod(...args);
    } else {
      self.queue.push(args);
    }
  } as any;
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.queue = [];
  window.fbq = fbq;
  window._fbq = fbq;

  // Inject fbevents.js script
  const script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(script);

  // Initialize pixel with Advanced Matching (autoConfig) for high EMQ
  if (window.fbq) {
    window.fbq("init", META_PIXEL_ID, {}, { autoConfig: true, debug: false });
    // Fire initial PageView
    window.fbq("track", "PageView");
  }
}

/**
 * GTM + Meta Pixel loader (LGPD compliant).
 * Loads ONLY after analytics OR marketing consent.
 * If consent already exists, loads IMMEDIATELY (no idle delay).
 * On cc:onConsent / cc:onChange, loads IMMEDIATELY (no idle delay).
 */
export default function GoogleTagScripts() {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const enable = () => setAllowed(true);

    if (hasAnalyticsConsent()) {
      // Consent already present: load IMMEDIATELY (no idle delay).
      enable();
    }

    const onConsent = () => {
      if (hasAnalyticsConsent()) {
        // User just accepted: load IMMEDIATELY (no idle delay).
        enable();
      }
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
    if (allowed) {
      loadGtm();
      loadMetaPixel();
    }
  }, [allowed]);

  return null;
}
