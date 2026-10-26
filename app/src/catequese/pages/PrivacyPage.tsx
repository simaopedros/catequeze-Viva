import { useTranslation } from "react-i18next";
import { PublicNavbar } from "../PublicNavbar";
import { PublicFooter } from "../PublicFooter";
import {
  AppDisplayTitle,
  AppGoldRule,
} from "../../client/components/brand/AppChrome";

const SECTION_KEYS = [
  "intro",
  "controller",
  "collected",
  "purpose",
  "legal_basis",
  "minors",
  "sharing",
  "retention",
  "security",
  "cookies",
  "rights",
] as const;

export default function PrivacyPage() {
  const { t } = useTranslation("legal");

  const list = (key: string) => {
    const value = t(key, { returnObjects: true, defaultValue: [] });
    return Array.isArray(value) ? (value as string[]) : [];
  };
  const text = (key: string) => {
    const value = t(key, { defaultValue: "" });
    return value === key ? "" : value;
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicNavbar />
      <main className="mx-auto max-w-3xl flex-1 space-y-8 px-4 py-20">
        <div className="space-y-2.5">
          <AppDisplayTitle className="text-4xl text-brand-ink sm:text-4xl">
            {t("privacy.title")}
          </AppDisplayTitle>
          <AppGoldRule />
          <p className="text-muted-foreground">{t("privacy.updated")}</p>
        </div>

        <div className="space-y-6 text-sm text-muted-foreground">
          {SECTION_KEYS.map((key) => {
            const base = `privacy.sections.${key}`;
            const intro = text(`${base}.intro`);
            const body = text(`${base}.text`);
            const items = list(`${base}.items`);
            const outro = text(`${base}.outro`);
            return (
              <section key={key}>
                <AppDisplayTitle as="h2" className="mb-2 text-xl sm:text-xl">
                  {t(`${base}.title`)}
                </AppDisplayTitle>
                {body && <p>{body}</p>}
                {intro && <p>{intro}</p>}
                {items.length > 0 && (
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {items.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                )}
                {outro && <p className="mt-2">{outro}</p>}
              </section>
            );
          })}

          <section>
            <AppDisplayTitle as="h2" className="mb-2 text-xl sm:text-xl">
              {t("privacy.sections.dpo.title")}
            </AppDisplayTitle>
            <p>{t("privacy.sections.dpo.text")}</p>
            <p className="mt-2">
              <strong>{t("privacy.sections.dpo.email_label")}</strong>{" "}
              <a
                className="underline underline-offset-2"
                href={`mailto:${t("privacy.sections.dpo.email")}`}
              >
                {t("privacy.sections.dpo.email")}
              </a>
            </p>
            <p className="mt-2">{t("privacy.sections.dpo.response")}</p>
          </section>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
