import { useEffect } from 'react';

declare global {
  interface Window {
    dataLayer: unknown[];
  }
}

const GTM_ID = (import.meta.env.REACT_APP_GTM_ID as string | undefined)?.trim();

export default function GoogleTagScripts() {
  useEffect(() => {
    if (!GTM_ID) {
      return;
    }

    window.dataLayer = window.dataLayer || [];

    const alreadyLoaded = document.querySelector(
      `script[src*="googletagmanager.com/gtm.js?id=${GTM_ID}"]`,
    );
    if (!alreadyLoaded) {
      window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`;
      document.head.appendChild(script);
    }
  }, []);

  return null;
}

