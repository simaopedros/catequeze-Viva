import { useTranslation } from "react-i18next";
import { PublicNavbar } from "../PublicNavbar";
import { PublicFooter } from "../PublicFooter";
import {
  AppDisplayTitle,
  AppGoldRule,
} from "../../client/components/brand/AppChrome";

const OFFER_KEYS = [
  "classes",
  "attendance",
  "sacraments",
  "content",
  "communication",
  "reports",
] as const;

export default function AboutPage() {
  const { t } = useTranslation("public");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicNavbar />
      <main className="mx-auto max-w-3xl flex-1 space-y-8 px-4 py-20">
        <div className="space-y-2.5">
          <AppDisplayTitle className="text-4xl text-[#071A2D] sm:text-4xl">
            {t("about.title")}
          </AppDisplayTitle>
          <AppGoldRule />
          <p className="text-lg text-muted-foreground">{t("about.intro")}</p>
        </div>

        <section className="space-y-2">
          <AppDisplayTitle
            as="h2"
            className="text-2xl text-[#071A2D] sm:text-2xl"
          >
            {t("about.mission_title")}
          </AppDisplayTitle>
          <p className="text-muted-foreground">{t("about.mission_text")}</p>
        </section>

        <section className="space-y-2">
          <AppDisplayTitle
            as="h2"
            className="text-2xl text-[#071A2D] sm:text-2xl"
          >
            {t("about.offer_title")}
          </AppDisplayTitle>
          <ul className="space-y-3 text-muted-foreground">
            {OFFER_KEYS.map((key) => (
              <li key={key}>{t(`about.offers.${key}`)}</li>
            ))}
          </ul>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
