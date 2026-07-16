import { useEffect, useRef } from "react";
import * as CookieConsent from "vanilla-cookieconsent";
import "vanilla-cookieconsent/dist/cookieconsent.css";
import getConfig from "./Config";

/**
 * Cookie consent UI. Mount CookieConsent once only.
 * Re-running .run() on i18n/language changes can tear down DOM nodes while
 * React still holds fiber references (Uncaught TypeError: firstChild of null).
 */
const CookieConsentBanner = () => {
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    try {
      CookieConsent.run(getConfig());
    } catch (err) {
      console.error("[cookie-consent] failed to start", err);
    }
  }, []);

  // Host node for a11y; vanilla-cookieconsent attaches modals to body via config.root.
  return <div id="cookieconsent" />;
};

export default CookieConsentBanner;
