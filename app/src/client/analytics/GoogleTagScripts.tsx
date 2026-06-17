import { useEffect } from 'react';

declare global {
  interface Window {
    dataLayer: any[];
  }
}

const GTM_ID = 'GTM-MTGNTJG6';
const GTM_IFRAME_ID = 'gtm-noscript';

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
      document.head.prepend(script);
    }
  }, []);

  useEffect(() => {
    if (document.getElementById(GTM_IFRAME_ID)) return;

    const noscript = document.createElement('noscript');
    noscript.id = GTM_IFRAME_ID;
    noscript.innerHTML = `<iframe src="https://www.googletagmanager.com/ns.html?id=${GTM_ID}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`;
    document.body.insertAdjacentElement('afterbegin', noscript);
  }, []);

  return null;
}
