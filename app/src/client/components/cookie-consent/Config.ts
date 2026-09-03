import type { CookieConsentConfig } from "vanilla-cookieconsent";
import i18n from "../../../i18n/config";

declare global {
  interface Window {
    dataLayer: unknown[];
  }
}

/** Normalize i18n language to one of the cookie-consent supported locales. */
function normalizeLocale(lang: string | undefined): string {
  if (!lang || lang === "pt") return "pt-BR";
  if (["pt-BR", "en", "es"].includes(lang)) return lang;
  return "pt-BR";
}

function buildCookieTranslations(lang: string) {
  const t = (key: string) => i18n.t(key, { ns: "cookie", lng: lang });
  return {
    consentModal: {
      title: t("consent_modal.title"),
      description: t("consent_modal.description"),
      acceptAllBtn: t("consent_modal.accept_all"),
      acceptNecessaryBtn: t("consent_modal.reject_all"),
      footer: `
            <a href="/privacy" target="_blank">${t(
              "consent_modal.privacy_link",
            )}</a>
            <a href="/terms" target="_blank">${t(
              "consent_modal.terms_link",
            )}</a>
                    `,
    },
    preferencesModal: {
      sections: [],
    },
  };
}

const getConfig = () => {
  const config: CookieConsentConfig = {
    root: "body",
    autoShow: true,
    disablePageInteraction: false,
    hideFromBots: import.meta.env.PROD ? true : false,
    mode: "opt-in",
    revision: 0,

    cookie: {
      name: "cc_cookie",
      domain: location.hostname,
      path: "/",
      sameSite: "Lax",
      expiresAfterDays: 365,
    },

    guiOptions: {
      consentModal: {
        // Compact box at the bottom-left so the banner never covers the hero CTA.
        layout: "box",
        position: "bottom left",
        equalWeightButtons: true,
        flipButtons: false,
      },
    },

    categories: {
      necessary: {
        enabled: true,
        readOnly: true,
      },
      analytics: {
        autoClear: {
          cookies: [{ name: /^_ga/ }, { name: "_gid" }],
        },
        services: {
          ga: {
            label: i18n.t("analytics_label", { ns: "cookie" }),
            onAccept: () => {
              try {
                // GTM is loaded separately (index.html / GoogleTagScripts). GA gtag
                // is optional — never throw if REACT_APP_GOOGLE_ANALYTICS_ID is unset.
                const GA_ANALYTICS_ID = String(
                  import.meta.env.REACT_APP_GOOGLE_ANALYTICS_ID || "",
                ).trim();
                if (
                  !GA_ANALYTICS_ID ||
                  GA_ANALYTICS_ID === "G-..." ||
                  !GA_ANALYTICS_ID.startsWith("G-")
                ) {
                  return;
                }
                window.dataLayer = window.dataLayer || [];
                function gtag(..._args: unknown[]) {
                  window.dataLayer.push(arguments);
                }
                gtag("js", new Date());
                gtag("config", GA_ANALYTICS_ID);

                const already = document.querySelector(
                  `script[src*="googletagmanager.com/gtag/js?id=${GA_ANALYTICS_ID}"]`,
                );
                if (already) return;

                const script = document.createElement("script");
                script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ANALYTICS_ID}`;
                script.async = true;
                document.body.appendChild(script);
              } catch (error) {
                console.error("[cookie-consent] analytics accept failed", error);
              }
            },
            onReject: () => {},
          },
        },
      },
    },

    language: {
      default: normalizeLocale(i18n.language),
      translations: {
        "pt-BR": buildCookieTranslations("pt-BR"),
        en: buildCookieTranslations("en"),
        es: buildCookieTranslations("es"),
      },
    },
  };

  return config;
};

export default getConfig;
