import { useTranslation } from "react-i18next";
import { PublicNavbar } from "../PublicNavbar";
import { PublicFooter } from "../PublicFooter";
import {
  AppDisplayTitle,
  AppGoldRule,
} from "../../client/components/brand/AppChrome";

export default function TermsPage() {
  const { t } = useTranslation("legal");
  const obligations = t("terms.sections.obligations.items", {
    returnObjects: true,
  }) as string[];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicNavbar />
      <main className="mx-auto max-w-3xl flex-1 space-y-8 px-4 py-20">
        <div className="space-y-2.5">
          <AppDisplayTitle className="text-4xl text-brand-ink sm:text-4xl">
            {t("terms.title")}
          </AppDisplayTitle>
          <AppGoldRule />
          <p className="text-muted-foreground">{t("terms.updated")}</p>
        </div>

        <div className="space-y-6 text-sm text-muted-foreground">
          <section>
            <AppDisplayTitle as="h2" className="mb-2 text-xl sm:text-xl">
              {t("terms.sections.acceptance.title")}
            </AppDisplayTitle>
            <p>{t("terms.sections.acceptance.text")}</p>
          </section>

          <section>
            <AppDisplayTitle as="h2" className="mb-2 text-xl sm:text-xl">
              {t("terms.sections.service.title")}
            </AppDisplayTitle>
            <p>{t("terms.sections.service.text")}</p>
          </section>

          <section>
            <AppDisplayTitle as="h2" className="mb-2 text-xl sm:text-xl">
              {t("terms.sections.obligations.title")}
            </AppDisplayTitle>
            <ul className="list-disc pl-5 space-y-1">
              {obligations.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </section>

          <section>
            <AppDisplayTitle as="h2" className="mb-2 text-xl sm:text-xl">
              {t("terms.sections.liability.title")}
            </AppDisplayTitle>
            <p>{t("terms.sections.liability.text")}</p>
          </section>

          <section>
            <AppDisplayTitle as="h2" className="mb-2 text-xl sm:text-xl">
              {t("terms.sections.jurisdiction.title")}
            </AppDisplayTitle>
            <p>{t("terms.sections.jurisdiction.text")}</p>
          </section>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
