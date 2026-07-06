import { useEffect } from 'react';

declare global {
  interface Window {
    dataLayer: unknown[];
  }
}

const GTM_ID = 'GTM-MTGNTJG6';

export default function GoogleTagScripts() {
  useEffect(() => {
    window.dataLayer = window.dataLayer || [];

    const alreadyLoaded = document.querySelector(
      `script[src*="googletagmanager.com/gtm.js?id=${GTM_ID}"]`
    );
    if (!alreadyLoaded) {
      window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`;
      // Append (do not prepend): prepending makes this script head.firstChild,
      // which collides with React's DOM traversal during hydration and throws
      // "Cannot read properties of null (reading 'firstChild')".
      document.head.appendChild(script);
    }
  }, []);

  return null;
}
