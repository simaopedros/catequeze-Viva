import { useEffect, useRef } from "react";
import * as CookieConsent from "vanilla-cookieconsent";
import "vanilla-cookieconsent/dist/cookieconsent.css";
import getConfig from "./Config";
import i18n from "../../../i18n/config";

const SUPPORTED = ["pt-BR", "en", "es"];

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

  // Language changes update the banner copy through the library API instead of
  // re-running `.run()` (which tears down DOM React still references).
  useEffect(() => {
    const onLanguageChanged = (lng: string) => {
      const target = SUPPORTED.includes(lng) ? lng : "pt-BR";
      try {
        void CookieConsent.setLanguage(target, true);
      } catch {
        /* banner may not be mounted yet */
      }
    };
    i18n.on("languageChanged", onLanguageChanged);
    return () => {
      i18n.off("languageChanged", onLanguageChanged);
    };
  }, []);

  // Host node for a11y; vanilla-cookieconsent attaches modals to body via config.root.
  return <div id="cookieconsent" />;
};

export default CookieConsentBanner;
