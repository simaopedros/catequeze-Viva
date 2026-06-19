import type { CookieConsentConfig } from "vanilla-cookieconsent";
import i18n from "../../../i18n/config";

declare global {
  interface Window {
    dataLayer: any;
  }
}

/** Normalize i18n language to one of the cookie-consent supported locales. */
function normalizeLocale(lang: string | undefined): string {
  if (!lang || lang === 'pt') return 'pt-BR';
  if (['pt-BR', 'en', 'es'].includes(lang)) return lang;
  return 'pt-BR';
}

function buildCookieTranslations(lang: string) {
  const t = (key: string) => i18n.t(key, { ns: 'cookie', lng: lang });
  return {
    consentModal: {
      title: t('consent_modal.title'),
      description: t('consent_modal.description'),
      acceptAllBtn: t('consent_modal.accept_all'),
      acceptNecessaryBtn: t('consent_modal.reject_all'),
      footer: `
            <a href="/privacy" target="_blank">${t('consent_modal.privacy_link')}</a>
            <a href="/terms" target="_blank">${t('consent_modal.terms_link')}</a>
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
        layout: "box",
        position: "bottom right",
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
          cookies: [
            { name: /^_ga/ },
            { name: "_gid" },
          ],
        },
        services: {
          ga: {
            label: i18n.t('analytics_label', { ns: 'cookie' }),
            onAccept: () => {
              try {
                const GA_ANALYTICS_ID = import.meta.env.REACT_APP_GOOGLE_ANALYTICS_ID;
                if (!GA_ANALYTICS_ID.length) {
                  throw new Error("Google Analytics ID is missing");
                }
                window.dataLayer = window.dataLayer || [];
                function gtag(..._args: unknown[]) {
                  (window.dataLayer as Array<any>).push(arguments);
                }
                gtag("js", new Date());
                gtag("config", GA_ANALYTICS_ID);

                const script = document.createElement("script");
                script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ANALYTICS_ID}`;
                script.async = true;
                document.body.appendChild(script);
              } catch (error) {
                console.error(error);
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
        'pt-BR': buildCookieTranslations('pt-BR'),
        en: buildCookieTranslations('en'),
        es: buildCookieTranslations('es'),
      },
    },
  };

  return config;
};

export default getConfig;
