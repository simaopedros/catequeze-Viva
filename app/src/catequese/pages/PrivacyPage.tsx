import { useTranslation } from "react-i18next";
import { PublicNavbar } from "../PublicNavbar";
import { PublicFooter } from "../PublicFooter";
import {
  AppDisplayTitle,
  AppGoldRule,
} from "../../client/components/brand/AppChrome";

export default function PrivacyPage() {
  const { t } = useTranslation("legal");
  const collectedItems = t("privacy.sections.collected.items", {
    returnObjects: true,
  }) as string[];
  const purposeItems = t("privacy.sections.purpose.items", {
    returnObjects: true,
  }) as string[];

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
          <section>
            <AppDisplayTitle as="h2" className="mb-2 text-xl sm:text-xl">
              {t("privacy.sections.intro.title")}
            </AppDisplayTitle>
            <p>{t("privacy.sections.intro.text")}</p>
          </section>

          <section>
            <AppDisplayTitle as="h2" className="mb-2 text-xl sm:text-xl">
              {t("privacy.sections.collected.title")}
            </AppDisplayTitle>
            <p>{t("privacy.sections.collected.intro")}</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              {collectedItems.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </section>

          <section>
            <AppDisplayTitle as="h2" className="mb-2 text-xl sm:text-xl">
              {t("privacy.sections.purpose.title")}
            </AppDisplayTitle>
            <p>{t("privacy.sections.purpose.intro")}</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              {purposeItems.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </section>

          <section>
            <AppDisplayTitle as="h2" className="mb-2 text-xl sm:text-xl">
              {t("privacy.sections.minors.title")}
            </AppDisplayTitle>
            <p>{t("privacy.sections.minors.text")}</p>
          </section>

          <section>
            <AppDisplayTitle as="h2" className="mb-2 text-xl sm:text-xl">
              {t("privacy.sections.rights.title")}
            </AppDisplayTitle>
            <p>{t("privacy.sections.rights.text")}</p>
          </section>

          <section>
            <AppDisplayTitle as="h2" className="mb-2 text-xl sm:text-xl">
              {t("privacy.sections.dpo.title")}
            </AppDisplayTitle>
            <p>
              <strong>{t("privacy.sections.dpo.email_label")}</strong>{" "}
              {t("privacy.sections.dpo.email")}
            </p>
          </section>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
